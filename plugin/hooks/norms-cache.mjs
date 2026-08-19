// Arroway plugin — O CACHE LOCAL DAS NORMAS (ARROW-201).
//
// Ele existe porque a abertura de uma sessão não tem como chamar o commons: o
// cliente ainda não pediu nada, e o que a pessoa precisa ver primeiro é o que já
// foi decidido para esta pasta. Então o último bloco de normas ENTREGUE fica em
// disco, e a próxima sessão abre com ele.
//
// Não há julgamento aqui: este arquivo não sabe o que é uma norma, não decide
// quando gravar e não escolhe o que mostrar. Quem manda gravar é o servidor, na
// resposta ao evento da ferramenta; este arquivo só escreve e lê.
//
// O texto é do commons e NUNCA sai desta máquina — o cano reporta que uma
// resposta veio com texto, jamais o texto.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Teto do que se guarda: é contexto de abertura, não arquivo. */
const MAX_NORMS = 30_000;

/**
 * A pasta é a RAIZ DO REPOSITÓRIO quando existe uma, e não o diretório em que a
 * sessão abriu: duas sessões no mesmo projeto, abertas em subpastas diferentes,
 * são o mesmo lugar e têm as mesmas normas.
 */
function normsFile(root, cwd) {
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
  return join(root, "norms", `${createHash("sha256").update(scope).digest("hex").slice(0, 32)}.txt`);
}

export function loadNorms(root, cwd) {
  try {
    const file = normsFile(root, cwd);
    return file ? readFileSync(file, "utf8").slice(0, MAX_NORMS).trim() : "";
  } catch {
    return "";
  }
}

export function saveNorms(root, cwd, text) {
  try {
    const file = normsFile(root, cwd);
    if (!file || !text) return false;
    mkdirSync(join(root, "norms"), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, String(text).slice(0, MAX_NORMS), "utf8");
    renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}
