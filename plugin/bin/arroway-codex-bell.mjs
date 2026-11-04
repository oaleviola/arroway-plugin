#!/usr/bin/env node
// ARROW-493 — the Codex bell: wakes a stopped Codex session when a cockpit
// message is waiting for it.
//
// Codex does not let a background hook start a new turn, so the plugin cannot
// ring by itself the way it does in Claude Code. This helper runs on your own
// machine, with your own Codex login. Every few seconds it asks Arroway, for each
// recent Codex thread that the plugin already reported, whether a message is
// waiting and nobody is listening. When Arroway says to ring, it runs
//
//   codex queue --thread <id> --message <Arroway's "stop and wait" text>
//
// The session wakes, ends that short turn, and the plugin's Stop hook delivers
// the real message, as it already does (tested on 28/10/2026).
//
// What it reads: the thread ids in ~/.codex/session_index.jsonl, and the session
// credential the plugin stored for each thread. What it sends: the same `bell`
// request the plugin makes in Claude Code. Nothing else leaves the machine.
//
// Usage:
//   node arroway-codex-bell.mjs            keep running (stop with Ctrl-C)
//   node arroway-codex-bell.mjs --once     one pass, then exit
//   options: --data <plugin data dir>  --codex <codex binary>  --interval <seconds>
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const ORIGIN = process.env.ARROWAY_ORIGIN || "https://www.arroway.app";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/** Threads beyond this many, most recent first, are not asked about. */
export const MAX_THREADS = 40;
/** After ringing a thread, wait this long before ringing it again. */
export const RING_COOLDOWN_MS = 90_000;

/** Thread ids, most recent last, from the lines of Codex's session index. */
export function threadIdsFrom(indexText) {
  const vistos = new Set();
  for (const linha of String(indexText ?? "").split("\n")) {
    for (const m of linha.matchAll(UUID)) vistos.add(m[0].toLowerCase());
  }
  return [...vistos].slice(-MAX_THREADS).reverse();
}

/** Where the plugin keeps a session's state: the same name `arroway-gate.mjs` uses. */
export function stateFileFor(root, threadId) {
  return join(root, "directives", `${createHash("sha256").update(threadId).digest("hex").slice(0, 32)}.json`);
}

/**
 * The plugin data folders to look in. Codex hands the plugin `PLUGIN_DATA`, but
 * this helper does not run inside Codex, so it looks where that folder lives:
 * any `directives` folder under ~/.codex, plus the plugin's fallback in tmp.
 */
/**
 * @param {{ explicit?: string, home?: string, tmp?: string,
 *   fs?: { existsSync: (p: string) => boolean, readdirSync: (p: string) => string[], statSync: (p: string) => { isDirectory: () => boolean } } }} [options]
 */
export function dataRoots({ explicit, home = homedir(), tmp = tmpdir(), fs = { existsSync, readdirSync, statSync } } = {}) {
  if (explicit) return [explicit];
  const achados = [];
  const procurar = (dir, fundo) => {
    if (fundo < 0) return;
    let nomes = [];
    try {
      nomes = fs.readdirSync(dir);
    } catch {
      return;
    }
    if (nomes.includes("directives")) achados.push(dir);
    for (const nome of nomes) {
      if (nome === "directives" || nome === "sessions" || nome.startsWith(".")) continue;
      const caminho = join(dir, nome);
      try {
        if (fs.statSync(caminho).isDirectory()) procurar(caminho, fundo - 1);
      } catch {
        /* unreadable folder: skip */
      }
    }
  };
  procurar(join(home, ".codex"), 5);
  const reserva = join(tmp, "arroway-plugin");
  if (fs.existsSync(join(reserva, "directives"))) achados.push(reserva);
  return achados;
}

/** The credential the plugin stored for this thread, when the cockpit is on for it. */
export function credentialFor(roots, threadId, read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null)) {
  for (const root of roots) {
    let estado;
    try {
      const texto = read(stateFileFor(root, threadId));
      if (!texto) continue;
      estado = JSON.parse(texto);
    } catch {
      continue;
    }
    if (estado && typeof estado.capability === "string" && estado.capability && !estado.quiet && estado.cockpit?.enabled) {
      return estado.capability;
    }
  }
  return null;
}

/** One `bell` question to Arroway. Null on any failure: the helper never insists. */
export async function askBell(threadId, credential, doFetch = fetch, origin = ORIGIN) {
  try {
    const res = await doFetch(`${origin}/api/plugin/cockpit`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
      body: JSON.stringify({ mode: "bell", session_key: threadId, harness: "codex", wait_ms: 1000 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * One pass over the recent threads. Everything outside is injected, so the suite
 * runs it without Codex, without the network and without a home folder.
 */
export async function runOnce(deps) {
  const ids = threadIdsFrom(deps.readIndex());
  const roots = deps.roots();
  const tocados = [];
  for (const id of ids) {
    const ultimo = deps.rung.get(id);
    if (ultimo && deps.now() - ultimo < RING_COOLDOWN_MS) continue;
    const credential = deps.credentialFor(roots, id);
    if (!credential) continue;
    const answer = await deps.ask(id, credential);
    if (!answer?.enabled || !answer.ring || typeof answer.message !== "string" || !answer.message.trim()) continue;
    deps.rung.set(id, deps.now());
    const ok = await deps.queue(id, answer.message);
    tocados.push({ id, ok });
  }
  return tocados;
}

function queueWith(codexBin) {
  return (threadId, message) =>
    new Promise((resolve) => {
      execFile(codexBin, ["queue", "--thread", threadId, "--message", message], { timeout: 20_000 }, (erro) => resolve(!erro));
    });
}

function option(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(args) {
  const once = args.includes("--once");
  const codexBin = option(args, "--codex") || "codex";
  const interval = Math.max(5, Number(option(args, "--interval")) || 10) * 1000;
  const explicit = option(args, "--data");
  const indexFile = join(homedir(), ".codex", "session_index.jsonl");
  const deps = {
    readIndex: () => (existsSync(indexFile) ? readFileSync(indexFile, "utf8") : ""),
    roots: () => dataRoots({ explicit }),
    credentialFor: (roots, id) => credentialFor(roots, id),
    ask: (id, credential) => askBell(id, credential),
    queue: queueWith(codexBin),
    rung: new Map(),
    now: () => Date.now(),
  };
  for (;;) {
    const tocados = await runOnce(deps);
    for (const t of tocados) {
      process.stdout.write(`${new Date().toISOString()} ${t.ok ? "woke" : "could not wake"} Codex thread ${t.id}\n`);
    }
    if (once) return;
    await new Promise((r) => setTimeout(r, interval));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((erro) => {
    process.stderr.write(`arroway-codex-bell: ${erro?.message ?? erro}\n`);
    process.exit(1);
  });
}
