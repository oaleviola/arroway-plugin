#!/usr/bin/env node
// Arroway plugin — hook entry point (ARROW-106).
//
// Thin on purpose: read the event from stdin, ask turn-state.mjs what it means,
// print the answer. All the judgement lives next door, where it is tested.
//
// FAIL OPEN, ALWAYS. Every path here is wrapped so that a broken hook degrades
// into no hook at all. A protocol reminder that can wedge someone's session is
// worse than no reminder, and "hook failure must not prevent manual recovery" is
// written into the card's acceptance.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { cloneHealthBlock, collectFacts } from "./clone-health.mjs";
import {
  applyDeliveredRead,
  applyToolUse,
  clearTurnFlags,
  decidePreToolUse,
  decideStop,
  emptyTurn,
  openSession,
  readWasDelivered,
  responseText,
  stateFileName,
} from "./turn-state.mjs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function stateDir() {
  // PLUGIN_DATA is the Codex name; CLAUDE_PLUGIN_DATA is both Claude's name and
  // a compatibility alias exported by Codex. Prefer the neutral name without
  // breaking an existing Claude installation.
  const base = process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "arroway-plugin");
  return join(base, "turns");
}

function stateFile(sessionId) {
  const name = stateFileName(sessionId);
  return name ? join(stateDir(), name) : null;
}

function normsFile(cwd) {
  if (typeof cwd !== "string" || !cwd.trim()) return null;
  let scope = resolve(cwd);
  let cursor = scope;
  for (;;) {
    if (existsSync(join(cursor, ".git"))) {
      scope = cursor;
      break;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const name = `${createHash("sha256").update(scope).digest("hex").slice(0, 32)}.txt`;
  return join(stateDir(), "..", "norms", name);
}

// ARROW-148 — the norms cache used to be filled by a second, narrower copy of
// the same shape guess, so it went empty for exactly the same reason the gate
// went blind: measured on 12/ago/2026, the cache directory had never been
// created on this machine despite delivered norms in three separate sessions.
// One unwrapper now serves both, because two of them is how they drift apart.
const extractText = responseText;

/**
 * ARROW-146 — os fatos do clone, colhidos sem rede e sem lançar.
 *
 * Todo acesso a git e a disco está encapsulado aqui porque a decisão mora em
 * `clone-health.mjs`, que é pura e testada sem repositório. Qualquer erro vira
 * silêncio: um hook de abertura que quebra por causa de git é pior que um hook
 * que não avisa.
 */
function cloneHealth(cwd) {
  try {
    if (typeof cwd !== "string" || !cwd.trim()) return "";
    const git = (dir, args) => {
      try {
        return execFileSync("git", ["-C", dir, ...args], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 2000,
        }).trim();
      } catch {
        return "";
      }
    };
    const facts = collectFacts(cwd, {
      git,
      exists: (p) => existsSync(p),
      mtime: (p) => {
        try {
          return statSync(p).mtimeMs;
        } catch {
          return null;
        }
      },
      listDir: (dir) => {
        try {
          return readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => join(dir, e.name));
        } catch {
          return [];
        }
      },
      now: () => Date.now(),
    });
    return cloneHealthBlock(facts);
  } catch {
    return "";
  }
}

function loadNorms(cwd) {
  try {
    const file = normsFile(cwd);
    return file ? readFileSync(file, "utf8").slice(0, 30_000).trim() : "";
  } catch {
    return "";
  }
}

function saveNorms(cwd, text) {
  try {
    const file = normsFile(cwd);
    if (!file || !text) return false;
    mkdirSync(join(stateDir(), "..", "norms"), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, text.slice(0, 30_000), "utf8");
    renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

function loadState(sessionId) {
  try {
    const file = stateFile(sessionId);
    return file ? JSON.parse(readFileSync(file, "utf8")) : emptyTurn();
  } catch {
    return emptyTurn();
  }
}

/**
 * ARROW-126 — saving now REPORTS whether it saved.
 *
 * It used to swallow its own error, and that quietly broke the loop guard: with
 * the state readable but not writable, `asked` never persisted and every Stop
 * blocked again. The caller could not tell, because there was nothing to tell it
 * with. Anything that decides to block on the strength of a write has to know
 * the write happened.
 *
 * Write-then-rename, and not because of the error above: a Stop landing while a
 * PostToolUse is mid-write would otherwise read half a JSON file. Rename inside
 * one directory is atomic, so a reader sees the old state or the new one.
 */
function saveState(sessionId, state) {
  try {
    const file = stateFile(sessionId);
    if (!file) return false;
    mkdirSync(stateDir(), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

function clearState(sessionId) {
  try {
    const file = stateFile(sessionId);
    if (file) rmSync(file, { force: true });
  } catch {
    /* nothing to recover */
  }
}

function enforcementOn() {
  // Claude exposes its boolean user config through the namespaced variable.
  // Codex users can export the neutral variable. Anything other than an
  // explicit "false" preserves the documented default.
  const configured = process.env.ARROWAY_ENFORCE_CLOSING ?? process.env.CLAUDE_PLUGIN_OPTION_ENFORCE_CLOSING ?? "true";
  return String(configured).toLowerCase() !== "false";
}

// ARROW-160 — the reading gate gets the same off switch the closing gate has.
// A gate with no switch has exactly one way to be turned off, and it is
// uninstalling the plugin.
function readingEnforcementOn() {
  const configured =
    process.env.ARROWAY_ENFORCE_READING ?? process.env.CLAUDE_PLUGIN_OPTION_ENFORCE_READING ?? "true";
  return String(configured).toLowerCase() !== "false";
}

function writeHookOutput(value) {
  process.stdout.write(JSON.stringify(value));
}

function main() {
  const mode = process.argv[2];
  let event = {};
  try {
    event = JSON.parse(readStdin() || "{}");
  } catch {
    return; // Malformed event: say nothing, block nothing.
  }
  const sessionId = event.session_id;

  if (mode === "start") {
    const cached = loadNorms(event.cwd);
    // Resume fires SessionStart again on a session that already read. Merging
    // instead of overwriting is what stops the gate from forgetting mid-session.
    saveState(sessionId, openSession(loadState(sessionId), { normsCached: Boolean(cached) }));
    const normas = cached
      ? `Arroway norms cached for this directory (last successfully delivered block):\n\n${cached}`
      : "Arroway has no delivered norms cached for this directory yet. Before the first mutation, call arroway_read for the project; a successful delivered response unlocks mutations for this session.";
    // ARROW-146 — o outro lado da mesma moeda das normas: dizer que a fonte
    // LOCAL pode estar velha. Vem antes das normas de propósito, porque é a
    // ressalva sobre tudo o que a sessão vai ler depois. Fica calado quando o
    // clone está em dia, e sai na primeira linha quando nem é repositório.
    const clone = cloneHealth(event.cwd);
    const additionalContext = clone ? `${clone}\n\n${normas}` : normas;
    writeHookOutput({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } });
    return;
  }

  if (mode === "pre") {
    const state = loadState(sessionId);
    const verdict = decidePreToolUse({
      state,
      toolName: event.tool_name,
      toolInput: event.tool_input,
      enforce: readingEnforcementOn(),
    });
    if (verdict.block) {
      // ARROW-148 — PERSIST FIRST, BLOCK SECOND, exactly as the Stop gate does.
      //
      // Denying is only safe because the retry will go through, and that promise
      // lives in `readAsked`. State that cannot be written is a promise that does
      // not exist: denying then would deny again, forever, which is the deadlock
      // this card exists to remove. So an unpersistable session is never denied.
      if (!saveState(sessionId, { ...state, readAsked: true })) {
        writeHookOutput({
          systemMessage:
            "Arroway wanted a commons read before this change, but could not store the reminder — not asking again. Nothing was read on your behalf.",
        });
        return;
      }
      writeHookOutput({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: verdict.reason,
        },
      });
      return;
    }
    if (verdict.systemMessage) writeHookOutput({ systemMessage: verdict.systemMessage });
    return;
  }

  if (mode === "post") {
    const state = loadState(sessionId);
    const next =
      applyDeliveredRead(state, event.tool_name, event.tool_response) ??
      applyToolUse(state, event.tool_name, event.tool_input);
    if (next) saveState(sessionId, next);
    if (readWasDelivered(event.tool_name, event.tool_response) && /(^|_)arroway_norms$/.test(String(event.tool_name || ""))) {
      saveNorms(event.cwd, extractText(event.tool_response));
    }
    return;
  }

  if (mode === "cleanup") {
    clearState(sessionId);
    return;
  }

  if (mode === "stop") {
    const state = loadState(sessionId);
    const verdict = decideStop({
      state,
      lastMessage: event.last_assistant_message,
      enforce: enforcementOn(),
    });

    if (verdict.block) {
      // ARROW-126 — PERSIST FIRST, BLOCK SECOND, and never the other way round.
      //
      // Blocking is only safe because the next Stop will let the turn end, and
      // that promise is written down in `asked`. If the write did not land, the
      // promise does not exist: blocking now would block again, and again, with
      // no state that could ever say otherwise. So an unpersistable turn is one
      // we do not block at all — it gets the same visible note the second Stop
      // would have given it.
      if (!saveState(sessionId, { ...state, asked: true })) {
        process.stdout.write(
          JSON.stringify({
            systemMessage:
              "Arroway: this turn ended without a record, and the reminder could not be stored — not asking again. Nothing was written on your behalf.",
          })
        );
        return;
      }
      writeHookOutput({ decision: "block", reason: verdict.reason });
      return;
    }

    // Clearing the TURN, never the session: the file survives so that
    // `readDelivered` and `readAsked` mean what the block message promises.
    if (verdict.resetTurn) saveState(sessionId, clearTurnFlags(state));
    if (verdict.systemMessage) {
      writeHookOutput({ systemMessage: verdict.systemMessage });
    }
  }
}

try {
  main();
} catch {
  // Deliberately silent: stdout stays empty, exit code stays 0, the turn proceeds.
}
process.exit(0);
