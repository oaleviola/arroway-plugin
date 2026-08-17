import { createHash } from "node:crypto";

// Arroway plugin — the closing protocol, as decidable logic (ARROW-106).
//
// Everything that DECIDES lives here as pure functions, and the CLI wrapper
// (arroway-turn.mjs) only moves bytes. The reason is the reason this product
// exists: a rule that only lives in a message nobody can test is a rule that
// drifts. The hook is the coercive half of the protocol, so it is the half that
// has to be provable — test/plugin-package.test.ts exercises these functions
// directly, without spawning a hook.
//
// WHAT THIS DOES NOT DO, on purpose:
//   - it never reads or copies the transcript. The Stop event already hands the
//     hook the final assistant message; that single string is the whole input.
//     Copying a conversation into a memory system is the design the team refused
//     (hook as protocol enforcement, never as capture).
//   - it never writes to Arroway. It asks the model to write, once, and gets out
//     of the way. A hook that logged on the model's behalf would manufacture the
//     empty residue the protocol exists to prevent.

// Tools whose use means the turn produced something a later session would need.
// This is the NARROWEST honest signal: a file changed on disk. It deliberately
// does not count reading, searching or running commands — a turn that only looked
// around has nothing to hand over, and asking it to record would be the "pedágio"
// the review rule warns about (review is a five-minute veto, never a gate).
//
// ARROW-105 — this is now ONE OF THREE, not the whole criterion. Substantive
// work is (1) an external mutation, (2) a created or edited artifact, (3) a
// completed investigation. A file on disk is (2); the other two live below.
const WORK_TOOLS = /^(Write|Edit|MultiEdit|NotebookEdit|apply_patch)$/;

// ARROW-105 — (1) EXTERNAL MUTATION, read off the tool's own verb.
//
// The turn that produced this card changed no file: it audited code, opened nine
// cards in a tracker, and ended with nothing recorded. Under a criterion made of
// file writes that turn is invisible, so the gate that exists because of it would
// not have fired on it.
//
// The verb is the only honest signal available here, because the hook never sees
// the transcript and a tool's name is all the event carries. So the list is an
// ALLOWLIST of verbs that unambiguously write, and it errs towards missing a
// write rather than inventing one: `run`, `execute`, `apply` and `deploy` are
// absent on purpose — they name tools that read as often as they change.
const EXTERNAL_WRITE_VERB =
  /(?:^|_)(create|update|delete|remove|save|send|post|add|set|move|merge|publish|upload|archive|assign|invite|revoke|cancel|rename|submit|insert|reply|comment|trash|share|duplicate|import|remember)(?:_|$)/;

// ARROW-105 — (3) COMPLETED INVESTIGATION, read off how much the turn looked.
//
// An audit has no artifact and no mutation to point at. What it does have is
// depth: it reads, greps and queries many times before it concludes. That count
// is observable without the transcript, so it is the criterion — a proxy, named
// as one, and never a claim about what the turn concluded.
//
// The threshold is deliberately high. Answering a question costs a handful of
// looks; auditing costs dozens. Set it low and every explanation ends in a
// prompt, which is the frequency failure that gets a hook switched off; set it
// here and the turns that trip it are the ones that really did go digging. The
// cost of a false positive stays one sentence — the third outcome releases it.
const LOOK_TOOLS = /^(Read|Grep|Glob|NotebookRead|WebFetch|WebSearch|Task)$/;
const LOOK_VERB =
  /(?:^|_)(get|list|search|find|describe|fetch|query|read|explain|inspect|view|show|status|logs|metrics|catch_up)(?:_|$)/;
export const AUDIT_LOOKS = 8;

// Closure can arrive through either sanctioned outcome. Matched on the SUFFIX so
// it holds whichever way the server is connected: bundled by this plugin the tool
// arrives as `mcp__plugin_arroway_arroway__arroway_log`, and installed on its own
// it carries whatever prefix that client assigns. Matching the bare verb is what
// keeps the hook working for someone who already had the connector.
const CLOSURE_TOOLS = /(^|_)arroway_(log|pass)$/;
const READ_TOOLS = /(^|_)arroway_(read|norms|complete_read)$/;
const ARROWAY_TOOLS = /(^|_)arroway_/;

/**
 * The tool's own name, with the host's prefix taken off.
 *
 * `mcp__plugin_arroway_arroway__arroway_log` and a bare `arroway_log` are the
 * same tool wearing different clothes, and one connector spells its verbs with
 * dashes. Judging the bare, normalised name is what keeps a rule about verbs
 * from becoming a rule about whichever client happens to be connected.
 */
function bareToolName(toolName) {
  const raw = String(toolName || "").replace(/-/g, "_").toLowerCase();
  const cut = raw.lastIndexOf("__");
  return cut === -1 ? raw : raw.slice(cut + 2);
}

/** ARROW-105 — a write to something that outlives this machine. */
export function isExternalMutation(toolName) {
  return EXTERNAL_WRITE_VERB.test(bareToolName(toolName));
}

/** ARROW-105 — a turn spent looking: reading, searching, querying. */
export function isLookTool(toolName, toolInput) {
  const name = String(toolName || "");
  if (!name) return false;
  if (LOOK_TOOLS.test(name)) return true;
  if (name === "Bash") return !isMutatingShell(toolInput?.command);
  return LOOK_VERB.test(bareToolName(name)) && !isExternalMutation(name);
}

/**
 * ARROW-160 — the two gates now share ONE definition of a mutation.
 *
 * They used to disagree, and the disagreement had a direction: the read gate
 * counted a shell command that writes, the closing gate did not count Bash at
 * all. A turn whose only change was `mv`, `pnpm migrate` or a redirect into a
 * file was therefore stopped on the way IN and never asked for a record on the
 * way OUT — the exact turn whose residue a later session would miss.
 *
 * @returns {"work"|"closure"|"read"|"look"|null}
 */
export function classifyTool(toolName, toolInput) {
  if (typeof toolName !== "string" || toolName.length === 0) return null;
  if (CLOSURE_TOOLS.test(toolName)) return "closure";
  if (READ_TOOLS.test(toolName)) return "read";
  if (isMutatingTool(toolName, toolInput)) return "work";
  if (isLookTool(toolName, toolInput)) return "look";
  return null;
}

const READ_ONLY_COMMANDS = new Set([
  "awk", "basename", "cat", "cd", "column", "comm", "cut", "date", "df", "dirname", "du", "echo",
  "env", "false", "file", "head", "hostname", "id", "jq", "ls", "nl", "pgrep", "printf", "ps",
  "pwd", "rg", "sort", "stat", "tail", "test", "true", "uname", "uniq", "wc", "which", "whoami",
]);

// Subcommand allowlists, for executables that read or write depending on the verb.
// Every entry here has to be read-only WHATEVER FLAGS FOLLOW — `git branch` is
// absent on purpose, because `git branch -D` deletes.
const READ_ONLY_SUBCOMMANDS = {
  git: new Set(["blame", "cat-file", "check-ignore", "describe", "diff", "log", "ls-files", "rev-list", "rev-parse", "shortlog", "show", "status", "symbolic-ref"]),
  defaults: new Set(["domains", "help", "read", "read-type"]),
};

// `>/dev/null`, `2>/dev/null` and `2>&1` are not writes: the first two throw the
// bytes away and the third only rewires a descriptor. Discarding output is what
// a careful READER does, so counting it as a mutation punished exactly the
// commands the gate should have waved through.
const DISCARDED_REDIRECT = /(?:\d*|&)>>?\s*(?:\/dev\/null|&\s*\d+)/g;
const FD_DUP = /\d+\s*>&\s*\d+/g;
const WRITE_REDIRECT = /(?:^|[^<>])>>?/;

/** Splits on shell separators, leaving anything inside quotes alone. */
function segments(command) {
  const out = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ";" || char === "\n" || char === "|" || char === "&") {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out.filter((segment) => segment.trim());
}

/** Command substitution is a command: it gets judged, not feared. */
function substitutions(segment) {
  const found = [];
  const dollar = /\$\(([^()]*)\)/g;
  const backtick = /`([^`]*)`/g;
  for (const match of segment.matchAll(dollar)) found.push(match[1]);
  for (const match of segment.matchAll(backtick)) found.push(match[1]);
  return found;
}

function stripSubstitutions(segment) {
  return segment.replace(/\$\([^()]*\)/g, " ").replace(/`[^`]*`/g, " ");
}

function segmentMutates(segment) {
  if (substitutions(segment).some((inner) => isMutatingShell(inner))) return true;

  const bare = stripSubstitutions(segment);
  const redirects = bare.replace(DISCARDED_REDIRECT, " ").replace(FD_DUP, " ");
  if (WRITE_REDIRECT.test(redirects)) return true;

  const words = redirects.trim().split(/\s+/).filter(Boolean);
  const executable = words[0]?.replace(/^.*\//, "");
  if (!executable) return false;
  if (READ_ONLY_COMMANDS.has(executable)) return false;
  if (executable === "grep") return false;
  if (executable === "sed") return words.includes("-i") || words.some((word) => word.startsWith("-i"));
  if (executable === "find") return words.some((word) => ["-delete", "-exec", "-execdir", "-ok", "-okdir"].includes(word));
  const verbs = READ_ONLY_SUBCOMMANDS[executable];
  if (verbs) return !verbs.has(words[1] || "");
  return true;
}

/**
 * Returns true unless a shell command is provably read-only.
 *
 * ARROW-160 — JUDGED PER SEGMENT, because a compound command is not a mutation.
 *
 * This used to reject the whole string on sight of `;`, `&&`, `|` or a
 * substitution, and the allowlist below was then only reachable by a bare
 * one-word pipeline. Almost nothing real looks like that: measured live on
 * 12/ago/2026, the gate fired on `cd repo && grep -n foo lib`, on `ls … ;
 * defaults read …`, and on `pgrep -f X >/dev/null && echo up`. A gate that
 * denies every first command of every turn is not stricter than one that reads
 * the command — it is a gate people learn to retry past, which is precisely the
 * reflex that makes it cosmetic when the mutation is real.
 *
 * The allowlist stays an allowlist. What changed is that each segment gets to
 * meet it, and that discarding output stopped counting as writing.
 */
export function isMutatingShell(command) {
  if (typeof command !== "string" || !command.trim()) return false;
  return segments(command).some(segmentMutates);
}

export function isMutatingTool(toolName, toolInput) {
  const name = String(toolName || "");
  if (WORK_TOOLS.test(name)) return true;
  if (name === "Bash") return isMutatingShell(toolInput?.command);
  return isExternalMutation(name);
}

/**
 * ARROW-105 — the ONE place the two gates are allowed to disagree, and why.
 *
 * The reading gate stands in front of a change to make the session read first.
 * Writing to Arroway is not that kind of change: it is the protocol itself. A
 * gate that denied `arroway_log` to a session that had not read would stand
 * between the model and the very act the closing gate is about to demand — two
 * gates pointing at each other, with the person in the middle.
 *
 * So the reading gate waves Arroway's own verbs through. Everything else it
 * judges exactly as the closing gate does.
 */
export function blocksBeforeRead(toolName, toolInput) {
  if (ARROWAY_TOOLS.test(String(toolName || ""))) return false;
  return isMutatingTool(toolName, toolInput);
}

// ARROW-148 — the shape of a tool response is the CLIENT's business, not ours.
//
// This used to accept exactly two shapes: a bare string, or `{content: [...]}`.
// Everything else was read as "nothing came back", and the gate below then
// blocked every mutation for the rest of the session while insisting that no
// read had been delivered. Measured live on 12/ago/2026: a delivered
// `arroway_norms` (full body, no error) left `readDelivered` false, and the
// state file's mtime proved the hook had run and classified the tool correctly
// — so what rejected the read was this function, on shape alone.
//
// A gate that depends on guessing one host's serialisation is a gate that breaks
// on the next host. What actually matters is whether TEXT came back, so that is
// the only question asked: unwrap whatever carries it, and let the explicit
// error markers — never the shape — be what says no.
export function responseText(response) {
  if (response == null) return "";
  if (typeof response === "string") return response.trim();
  if (Array.isArray(response)) return response.map(responseText).filter(Boolean).join("\n").trim();
  if (typeof response !== "object") return "";
  if (typeof response.text === "string" && response.text.trim()) return response.text.trim();
  return [response.content, response.result, response.output, response.response, response.toolResult]
    .map(responseText)
    .filter(Boolean)
    .join("\n")
    .trim();
}

function hasExplicitError(response) {
  if (response == null || typeof response !== "object") return false;
  if (Array.isArray(response)) return response.some(hasExplicitError);
  if (response.isError === true || response.is_error === true) return true;
  return [response.result, response.output, response.response, response.toolResult].some(hasExplicitError);
}

/** A called read only counts when a non-error body actually came back. */
export function readWasDelivered(toolName, toolResponse) {
  if (!READ_TOOLS.test(String(toolName || ""))) return false;
  if (toolResponse == null) return false;
  if (hasExplicitError(toolResponse)) return false;
  const text = responseText(toolResponse);
  // A host that strips the error field but leaves only prose has erased the
  // interface that distinguishes refusal from delivery. The gate fails open in
  // that irrecoverable shape instead of teaching the product another phrase.
  return Boolean(text);
}

// The third outcome: the model says out loud that nothing durable came out of the
// turn. It has to be as cheap as logging — that is the requirement that separates
// a gate from a toll, and the block reason below prints the exact sentence so the
// model never has to guess it.
//
// Portuguese is accepted too. English-first governs the text this product SERVES;
// it does not govern what it is willing to HEAR from a model answering a person
// who works in Portuguese.
export const NO_RESIDUE_PHRASE = /(no durable residue|nothing durable to record|sem res[ií]duo dur[áa]vel)/i;

// ARROW-126 — MENTIONING THE PHRASE IS NOT DECLARING IT.
//
// This used to be a substring test over the whole reply, and that made the gate
// releasable by accident: a turn that quoted the sentence, explained the hook, or
// pasted the block reason back walked straight through. Worse, it is exactly the
// turn most likely to do so — the one working on the plugin.
//
// What a deliberate declaration looks like, and it is the only thing accepted
// now: the reply CLOSES with it. The phrase has to open a sentence in the last
// non-empty line. Two consequences fall out of that shape, and both are the
// point:
//
//   - `Say "no durable residue" in your reply` does not release: the sentence
//     opens with `Say`, and the quote marks stay in the way.
//   - `Fixed the parser. No durable residue.` does release, on one line: the
//     phrase opens the second sentence.
//
// Markdown adornment is stripped before the test because `**No durable
// residue.**` is the same declaration wearing a costume. Quote marks are NOT
// stripped — quoting is precisely the difference between using the sentence and
// talking about it.
const ADORNMENT = /^[\s>#*_`~\-–—•]+/;
const SENTENCE_SPLIT = /(?<=[.!?\u2026:;])\s+|\s+[\u2013\u2014]\s+/;
const OPENS_WITH_PHRASE = new RegExp(`^(?:${NO_RESIDUE_PHRASE.source})`, "i");

export function declaresNoResidue(lastMessage) {
  if (typeof lastMessage !== "string") return false;

  const lines = lastMessage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last) return false;

  // Anchored at the HEAD of the sentence, with quote marks left where they are:
  // a sentence that OPENS with the phrase is using it; one that opens with a
  // quote mark, or with any other word, is talking about it.
  return last.split(SENTENCE_SPLIT).some((sentence) => OPENS_WITH_PHRASE.test(sentence.replace(ADORNMENT, "")));
}

export function emptyTurn() {
  return { work: false, closure: false, asked: false, looked: 0, readDelivered: false, readAsked: false };
}

// ARROW-160 — TWO CLOCKS IN ONE FILE, and they must not be wound together.
//
// `work`, `closure` and `asked` describe THIS TURN and have to die when it ends.
// `readDelivered` and `readAsked` describe the SESSION: the read that was
// delivered is still delivered next turn, and a gate that promises to ask "at
// most once per session" only keeps that promise if the record of having asked
// outlives the turn.
//
// It did not. Ending a turn deleted the state file whole, and SessionStart
// overwrote it on resume, so both session facts reset every few minutes —
// measured live on 12/ago/2026 as SIX blocks in one session, each announcing it
// was the only one. Clearing the turn now keeps the session half, and only
// SessionEnd removes the file.
const SESSION_KEYS = ["readDelivered", "readAsked"];

export function clearTurnFlags(state) {
  const turn = { ...emptyTurn(), ...(state || {}) };
  const kept = {};
  for (const key of SESSION_KEYS) kept[key] = turn[key];
  return { ...emptyTurn(), ...kept };
}

/** SessionStart must not forget what this session already did. */
export function openSession(state, { normsCached = false } = {}) {
  const previous = { ...emptyTurn(), ...(state || {}) };
  return {
    ...clearTurnFlags(previous),
    readDelivered: previous.readDelivered || Boolean(normsCached),
  };
}

export const READ_BLOCK_REASON = [
  "Arroway blocked the first mutation in this session because no commons read was delivered.",
  "Call `arroway_read` for the project you are about to change and complete every part it returns, then retry this tool.",
  "A call that errors or is refused does not satisfy this gate.",
  "",
  // ARROW-148 — the line that was missing, and the one the person actually needed.
  //
  // The old message had a single instruction, and it was the instruction that
  // does not work in the failing case: someone who HAD read was told to read
  // again, and read again, with nothing in the text admitting that the gate
  // could be the one that is wrong. That is what turned a nudge into a loop.
  "If you already read and this still blocks, the gate lost the signal — you did not.",
  "Retry this same tool once and it will proceed: this gate asks at most once per session.",
  "Nothing needs to be read again, and nothing was written on your behalf.",
].join("\n");

export const READ_RELEASE_NOTE =
  "Arroway asked once for a commons read and is not asking again this session. Work proceeds; nothing was read on your behalf.";

/**
 * ARROW-148 — THE READ GATE FAILS OPEN, and that is a requirement, not a mercy.
 *
 * It used to block every mutation forever while `readDelivered` was false. When
 * the marker was right, that was a nudge; when the marker was wrong — a shape
 * this hook did not recognise, a read the connection envelope refuses and always
 * will — it was a session with no way out, and the documented escape was to
 * switch the plugin off. A gate whose failure mode is "uninstall me" protects
 * nothing.
 *
 * So it asks AT MOST ONCE per session, which is the same loop guard the closing
 * gate has carried since ARROW-126 (`asked`). One interruption still costs the
 * model a read it might have skipped; a second one only ever punishes someone
 * the gate cannot see.
 */
export function decidePreToolUse({ state, toolName, toolInput, enforce = true }) {
  const turn = { ...emptyTurn(), ...(state || {}) };
  if (!enforce || !blocksBeforeRead(toolName, toolInput) || turn.readDelivered) return { block: false };
  if (turn.readAsked) return { block: false, systemMessage: READ_RELEASE_NOTE };
  return { block: true, reason: READ_BLOCK_REASON };
}

const CLOSING_INSTRUCTIONS = [
  "Close it in one of the three ways the protocol allows:",
  "  1. arroway_log \u2014 the task finished: write the durable residue.",
  "  2. arroway_pass \u2014 you are stopping with the work open: hand it forward.",
  "  3. End your reply with the sentence: No durable residue.",
  "Option 3 costs one sentence and is a legitimate answer. It has to CLOSE the reply \u2014",
  "the phrase quoted in the middle of a paragraph does not count, so that a turn which",
  "merely discusses this rule cannot release itself by mentioning it.",
  "Do not invent a log to get past this.",
  "",
  // ARROW-139 — identity accrues here, or it does not accrue at all.
  //
  // It RIDES ON a block that was already going to happen: no new interruption,
  // no new gate, and nothing fires on a turn that was already quiet. That is
  // the whole reason it lives inside this string instead of in a check of its
  // own — the failure that makes people switch a hook off is frequency, and
  // this adds none.
  //
  // Asking the MODEL and not the hook is not a shortcut, it is the only
  // correct place: this file never reads the transcript (see the header), so
  // it cannot know who was mentioned. The model has the conversation and the
  // read in context, and it is the one that can tell a person from a passing
  // noun.
  "And while you are here: did a PERSON show up in this conversation that Arroway does not carry yet \u2014",
  "someone in this user's circle, or a named person of a project? If so, remember them as `identity`",
  "(never expires, never pinned, comes back when they are part of a task). Their own circle goes in",
  "their personal project; people of a business go in that business's project. Nobody new: say nothing.",
];

// ARROW-105 — the log is what is being asked for, and ONLY the log.
//
// Widening the criterion widens how many turns owe a RECORD. It does not widen
// how many owe a norm: a rule or a decision is a different act, with a different
// destination and a human review in front of it. Said here because the model
// reads this string at the moment it decides what to write, and a gate that
// stayed quiet about the difference would be answered with rules written inside
// logs — the one shape that ages badly on both counts.
const NOT_A_MEMORY =
  "Write the log, not a norm. A rule or decision that outlives this task is a separate act (`arroway_remember`); do not fold it into the entry to get past this.";

export const BLOCK_REASON = [
  "This turn changed something and nothing was recorded in Arroway.",
  ...CLOSING_INSTRUCTIONS,
  "",
  NOT_A_MEMORY,
].join("\n");

// ARROW-105 — the audit case, and it needs its OWN opening line.
//
// Told "this turn changed something", a turn that changed nothing looks at its
// own history, finds no change, and reasonably concludes the hook is broken.
// Naming what actually happened — it went digging — is what makes the ask
// answerable instead of confusing.
export const AUDIT_BLOCK_REASON = [
  "This turn spent itself investigating and nothing was recorded in Arroway.",
  "If it reached a conclusion someone else would otherwise have to re-derive, that conclusion is the residue.",
  ...CLOSING_INSTRUCTIONS,
  "",
  NOT_A_MEMORY,
].join("\n");

/**
 * The whole decision, in one place.
 *
 * @param {{state: {work: boolean, closure: boolean, asked: boolean}, lastMessage?: string, enforce?: boolean}} input
 * @returns {{block: boolean, reason?: string, systemMessage?: string, resetTurn: boolean}}
 */
export function decideStop({ state, lastMessage, enforce = true }) {
  const turn = { ...emptyTurn(), ...(state || {}) };
  const audited = !turn.work && Number(turn.looked || 0) >= AUDIT_LOOKS;

  // Nothing substantive happened — there is nothing to hand over, so there is
  // nothing to ask for.
  if (!turn.work && !audited) return { block: false, resetTurn: true };

  // The protocol was honoured, by tool or by word.
  if (turn.closure) return { block: false, resetTurn: true };
  if (declaresNoResidue(lastMessage)) return { block: false, resetTurn: true };

  // The user turned enforcement off. The skill still teaches the protocol; the
  // plugin just stops interrupting. Degradation is a requirement, not a fallback.
  if (!enforce) return { block: false, resetTurn: true };

  // THE LOOP GUARD, and it is the reason `asked` exists. We block AT MOST ONCE per
  // turn. If the model comes back a second time still without closing, we let it
  // go with a visible note: a hook that can block forever is a hook that can strand
  // someone with no way out, and manual recovery has to stay possible.
  if (turn.asked) {
    return {
      block: false,
      systemMessage: "Arroway: this turn ended without a record. Nothing was written on your behalf.",
      resetTurn: true,
    };
  }

  return { block: true, reason: audited ? AUDIT_BLOCK_REASON : BLOCK_REASON, resetTurn: false };
}

/**
 * Applies a PostToolUse observation to the turn state.
 * Returns the new state, or null when the tool is not one we track.
 */
export function applyToolUse(state, toolName, toolInput) {
  const kind = classifyTool(toolName, toolInput);
  if (!kind) return null;
  const turn = { ...emptyTurn(), ...(state || {}) };
  if (kind === "work") turn.work = true;
  if (kind === "closure") turn.closure = true;
  if (kind === "look") turn.looked = Number(turn.looked || 0) + 1;
  return turn;
}

export function applyDeliveredRead(state, toolName, toolResponse) {
  if (!readWasDelivered(toolName, toolResponse)) return null;
  return { ...emptyTurn(), ...(state || {}), readDelivered: true };
}

// ARROW-126 — the state file is keyed by a HASH of the whole identifier, not by
// a scrubbed version of it.
//
// The old name replaced everything outside an allowlist with `-` and cut at 100
// characters, which is safe against path escape and useless against collision:
// `a/b` and `a?b` produced the same file, and so did any two long ids sharing a
// prefix. Two sessions then shared one turn — one of them getting the other's
// `asked`, or its `work`.
//
// A digest fixes both properties at once: it cannot contain a separator, and
// distinct inputs give distinct names.
//
// NO ID, NO FILE. Every id-less session used to land on a single shared
// `unknown.json`, which is the collision above with certainty instead of chance.
// Returning null makes the caller skip persistence, and the hook already treats
// unpersisted state as "do not block" — the honest degradation.
export function stateFileName(sessionId) {
  const id = typeof sessionId === "string" ? sessionId : sessionId == null ? "" : String(sessionId);
  if (id.length === 0) return null;
  return `${createHash("sha256").update(id).digest("hex").slice(0, 32)}.json`;
}
