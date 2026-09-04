#!/usr/bin/env node
// Arroway plugin — O CANO (ARROW-201).
//
// Não existe julgamento neste arquivo, e essa ausência é o produto. O que se
// instala congela no dia da instalação: não há atualização automática de
// plugin, são dois comandos manuais e um reinício, e atualizar o catálogo nem
// troca a versão instalada. Toda regra que morasse aqui só alcançaria quem
// atualizasse à mão — e a medição de 18/ago/2026 mostrou que nem o autor do
// produto atualizava.
//
// Então este arquivo faz seis coisas e nenhuma a mais:
//   1. lê o evento do cliente;
//   2. observa o que só desta máquina se pode observar — a ferramenta chamada e
//      o estado dos clones de git;
//   3. fala com a porta canônica e apresenta a credencial que já chegou até ele;
//   4. pergunta ao servidor;
//   5. imprime o que voltar, palavra por palavra;
//   6. guarda o que o servidor mandar guardar.
//
// Não há nenhuma frase dirigida ao usuário aqui, nenhum nome de ferramenta e
// nenhuma regra de bloqueio. Se você está prestes a acrescentar uma, ela
// pertence ao servidor.
//
// FALHA ABERTA, SEMPRE. Rede fora, resposta inválida,
// versão que não é a nossa, tempo esgotado: a ferramenta segue, o turno fecha e
// nada é impresso. Não há cópia local das regras "para funcionar offline" —
// duplicar julgamento no cliente recria exatamente o problema que este arquivo
// existe para resolver.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectFacts } from "./clone-facts.mjs";
import { loadNorms, saveNorms } from "./norms-cache.mjs";

/** O contrato que este cano fala. Viaja em todo pedido, e resposta de outra versão é descartada. */
const PROTOCOL = 1;

/**
 * O cano está no caminho da ferramenta, então a espera é curta por definição.
 * Um segundo e meio é o teto: acima disso a pessoa sente o portão em cada
 * chamada, e um portão que se sente é um portão que se desliga.
 */
const TIMEOUT_MS = 1500;

/**
 * Depois de tantas falhas de rede seguidas, o cano se cala pelo resto da sessão.
 *
 * Sem isto, servidor inalcançável custava o tempo de espera INTEIRO em cada
 * chamada de ferramenta, a sessão toda — rede que engole em vez de recusar não
 * dá erro rápido. Continua sendo o mesmo falhar aberto; o que muda é parar de
 * cobrar pedágio por ele. Três é o bastante para separar tropeço de servidor
 * fora do ar.
 */
const NETWORK_FAILURES_BEFORE_QUIET = 3;

/**
 * Teto de ferramentas guardadas por turno. Turno mais longo não perde o portão:
 * o servidor recebe o que coube, e o que ele decide com isso é dele.
 */
const MAX_TURN_OBSERVATIONS = 400;

/**
 * O quanto da última resposta do modelo viaja. A declaração de "sem resíduo
 * durável" só conta FECHANDO a resposta, então a cauda é tudo de que o servidor
 * precisa — e mandar a resposta inteira seria pagar privacidade por texto que
 * ninguém vai olhar.
 */
const MAX_MESSAGE_TAIL = 1000;

const PLUGIN_VERSION = "0.1.25";

/**
 * A porta do portão é pública e única. Ela não é a URL de conexão: conexão
 * identifica a pessoa, enquanto esta origem só recebe uma capacidade curta
 * depois da primeira leitura autenticada. Separar as duas é o que faz o cano
 * começar a falar sem pedir que alguém copie uma credencial para o ambiente.
 *
 * O override só existe para o processo de teste. Produção sempre usa o host
 * canônico, mesmo que a instalação não tenha `connection_url`.
 */
const CANONICAL_GATE_ORIGIN =
  process.env.NODE_ENV === "test" && process.env.ARROWAY_TEST_GATE_ORIGIN
    ? process.env.ARROWAY_TEST_GATE_ORIGIN
    : "https://www.arroway.app";

function dataRoot() {
  // PLUGIN_DATA é o nome do Codex; CLAUDE_PLUGIN_DATA é o do Claude e também um
  // apelido que o Codex exporta. Preferir o neutro sem quebrar instalação antiga.
  return process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "arroway-plugin");
}

function sessionFile(pasta, sessionId) {
  const id = typeof sessionId === "string" ? sessionId : sessionId == null ? "" : String(sessionId);
  if (!id) return null;
  return join(dataRoot(), pasta, `${createHash("sha256").update(id).digest("hex").slice(0, 32)}.json`);
}

function loadJson(file, vazio) {
  try {
    if (!file || !existsSync(file)) return vazio;
    const lido = JSON.parse(readFileSync(file, "utf8"));
    return lido && typeof lido === "object" ? lido : vazio;
  } catch {
    return vazio;
  }
}

function saveJson(file, pasta, valor) {
  try {
    if (!file) return;
    mkdirSync(join(dataRoot(), pasta), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(valor), "utf8");
    renameSync(tmp, file);
  } catch {
    /* estado não gravado custa uma ida à rede a mais, nunca correção */
  }
}

/**
 * O que o cano guarda, e é a lista completa: a diretiva de sessão que o servidor
 * mandou, a etiqueta de sessão que o servidor emitiu, e a contagem de falhas de
 * rede seguidas. Nada aqui é julgamento — é recado guardado e um contador.
 */
const loadState = (sessionId) => loadJson(sessionFile("directives", sessionId), {});
const saveState = (sessionId, valor) => saveJson(sessionFile("directives", sessionId), "directives", valor);

/**
 * O TURNO, guardado localmente e despejado de uma vez no fim.
 *
 * O portão de fechamento precisa saber o que o turno fez, e isso é uma pergunta
 * por TURNO, não por ferramenta. Guardar aqui e mandar tudo junto é o que evita
 * uma ida à rede por chamada. O cano não sabe o que cada observação significa —
 * quem classifica é o servidor.
 */
const loadTurn = (sessionId) => loadJson(sessionFile("turns", sessionId), { seen: [] });
const saveTurn = (sessionId, valor) => saveJson(sessionFile("turns", sessionId), "turns", valor);

function forget(sessionId) {
  for (const pasta of ["directives", "turns"]) {
    try {
      const file = sessionFile(pasta, sessionId);
      if (file) rmSync(file, { force: true });
    } catch {
      /* nada a recuperar */
    }
  }
}

/**
 * O endereço do PORTÃO, sem nenhum gesto novo de quem instalou.
 *
 * A URL de conexão, quando o cliente a entrega, ainda serve para o caminho
 * pessoal apresentar o token que ela carrega. Mas o host do portão não depende
 * dela: no caminho OAuth a URL já é pública, e a primeira `arroway_read`
 * autenticada devolve a capacidade de sessão que identifica os pedidos
 * seguintes. Sem URL configurada, usar a porta canônica permite exatamente esse
 * primeiro contato em vez de desligar o cano em silêncio.
 */
function connectionUrl() {
  const raw = process.env.ARROWAY_CONNECTION_URL || process.env.CLAUDE_PLUGIN_OPTION_CONNECTION_URL || "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    try {
      const url = new URL(CANONICAL_GATE_ORIGIN);
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      return url;
    } catch {
      // Só alcançável num override de teste malformado. Em produção a constante
      // acima é HTTPS e esta saída não desliga nenhuma instalação real.
      return null;
    }
  }
}

/**
 * A credencial que JÁ CHEGOU AQUI, e que a primeira versão deste arquivo jogava
 * fora.
 *
 * No caminho de conta pessoal o token viaja no caminho da URL que a pessoa
 * colou — é por isso que o manifesto declara `connection_url` como sensível. O
 * portão montava o endpoint só com o origin e descartava justamente o pedaço que
 * autentica. Apresentá-lo não é mecanismo novo: é o portão ficar autenticado
 * como o conector já é. No caminho corporativo não há token nenhum aqui, e é a
 * etiqueta de sessão que faz esse papel.
 */
function connectionToken(url) {
  const encontrado = url.pathname.match(/^\/api\/([^/]+)\/mcp\/?$/);
  if (!encontrado) return null;
  try {
    return decodeURIComponent(encontrado[1]) || null;
  } catch {
    return encontrado[1] || null;
  }
}

/**
 * A etiqueta de sessão emitida pelo servidor dentro da resposta da leitura.
 *
 * É o único canal que o servidor tem para falar com o cano no caminho
 * corporativo. Ancorar em marcador, e nunca em prosa, é o que impede este
 * acoplamento de quebrar em silêncio quando o texto da leitura mudar.
 *
 * O conteúdo da resposta é lido AQUI e não sai daqui.
 */
function capabilityFromResponse(response) {
  const texto = plainText(response);
  if (!texto) return null;
  const encontrado = texto.match(/<!-- ARROWAY_GATE_CAPABILITY (\{[^\n]*?\}) -->/g);
  if (!encontrado?.length) return null;
  try {
    const cru = encontrado[encontrado.length - 1]
      .replace(/^<!-- ARROWAY_GATE_CAPABILITY /, "")
      .replace(/ -->$/, "");
    const ultimo = JSON.parse(cru);
    return typeof ultimo?.capability === "string" && ultimo.capability ? ultimo.capability : null;
  } catch {
    return null;
  }
}

function plainText(response) {
  if (response == null) return "";
  if (typeof response === "string") return response;
  if (Array.isArray(response)) return response.map(plainText).join("\n");
  if (typeof response !== "object") return "";
  if (typeof response.text === "string") return response.text;
  return [response.content, response.result, response.output, response.response, response.toolResult]
    .map(plainText)
    .join("\n");
}

/**
 * A carga, e ela é a lista COMPLETA do que sai desta máquina.
 *
 * Vai: o nome da ferramenta, o texto do comando de shell (e só dele), as versões
 * do cano e do cliente, os dois interruptores do portão, e — depois da
 * ferramenta — se a resposta voltou sem erro e com texto. No fim do turno vai a
 * lista do que foi chamado e a CAUDA da última resposta do modelo. Na abertura
 * vão os números dos clones de git desta pasta. A chave opaca de sessão vai SÓ
 * quando há credencial para apresentar.
 *
 * NÃO vai: caminho de arquivo, diretório de trabalho, conteúdo de arquivo,
 * conteúdo de resposta, corpo das normas. Nem em impressão digital.
 */
function payload(wireEvent, event, credentialed, extra = {}) {
  const input = event.tool_input && typeof event.tool_input === "object" ? event.tool_input : {};
  const posTool = wireEvent === "post_tool_use";
  return {
    protocol: PROTOCOL,
    event: wireEvent,
    session_key: credentialed ? String(event.session_id || "") : undefined,
    tool_name: String(event.tool_name || "") || undefined,
    command: typeof input.command === "string" ? input.command : null,
    response_ok: posTool ? !hasError(event.tool_response) : false,
    response_has_text: posTool ? hasText(event.tool_response) : false,
    enforce_reading: readingEnforcement(),
    enforce_closing: closingEnforcement(),
    plugin_version: PLUGIN_VERSION,
    client: { name: process.env.CLAUDE_CODE_ENTRYPOINT || null, version: null },
    ...extra,
  };
}

/**
 * Os interruptores continuam sendo de quem instalou (ARROW-160: portão sem
 * interruptor só se desliga desinstalando o plugin). Eles mudaram de lugar, não
 * de dono: o cano transporta a escolha, o servidor a obedece.
 */
function readingEnforcement() {
  const configured =
    process.env.ARROWAY_ENFORCE_READING ?? process.env.CLAUDE_PLUGIN_OPTION_ENFORCE_READING ?? "true";
  return String(configured).toLowerCase() !== "false";
}

function closingEnforcement() {
  const configured =
    process.env.ARROWAY_ENFORCE_CLOSING ?? process.env.CLAUDE_PLUGIN_OPTION_ENFORCE_CLOSING ?? "true";
  return String(configured).toLowerCase() !== "false";
}

/** Observação, não julgamento: só se a resposta trouxe algum texto. O conteúdo fica aqui. */
function hasText(response) {
  if (response == null) return false;
  if (typeof response === "string") return response.trim().length > 0;
  if (Array.isArray(response)) return response.some(hasText);
  if (typeof response !== "object") return false;
  if (typeof response.text === "string" && response.text.trim()) return true;
  return [response.content, response.result, response.output, response.response, response.toolResult].some(hasText);
}

/** Observação, não julgamento: só se o cliente marcou erro. */
function hasError(response) {
  if (response == null || typeof response !== "object") return false;
  if (Array.isArray(response)) return response.some(hasError);
  if (response.isError === true || response.is_error === true) return true;
  return [response.result, response.output, response.response, response.toolResult].some(hasError);
}

/**
 * Os fatos do clone, colhidos sem rede e sem lançar.
 *
 * Todo acesso a git e a disco está encapsulado aqui. Qualquer erro vira silêncio:
 * um hook de abertura que quebra por causa de git é pior que um hook que não
 * avisa.
 */
function cloneFacts(cwd) {
  try {
    if (typeof cwd !== "string" || !cwd.trim()) return null;
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
    return collectFacts(cwd, {
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
  } catch {
    return null;
  }
}

async function ask(endpoint, body, credential) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { "content-type": "application/json" };
    if (credential) headers.authorization = `Bearer ${credential}`;
    const resposta = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Resposta com status é servidor VIVO: recusa não é queda, e não conta para
    // o circuito que silencia o cano.
    if (!resposta.ok) return { alive: true, answer: null };
    const json = await resposta.json();
    return { alive: true, answer: json && typeof json === "object" ? json : null };
  } catch {
    return { alive: false, answer: null };
  } finally {
    clearTimeout(timer);
  }
}

const WIRE = { start: "session_start", pre: "pre_tool_use", post: "post_tool_use", stop: "stop" };

/**
 * A diretiva nomeia QUAIS eventos ela silencia, e o cano compara nomes.
 *
 * Servidor antigo, que manda a diretiva sem a lista, silencia tudo: era o que ela
 * significava quando o portão de leitura era o único. Mudar o que se silencia
 * volta a ser mudança de servidor.
 */
function silenced(state, wireEvent) {
  const diretiva = state.directive;
  if (!diretiva?.stop_asking) return false;
  if (!Array.isArray(diretiva.events)) return true;
  return diretiva.events.includes(wireEvent);
}

function print(value) {
  process.stdout.write(JSON.stringify(value));
}

async function main() {
  const mode = process.argv[2];
  if (!Object.hasOwn(WIRE, mode) && mode !== "cleanup") return;

  let event = {};
  try {
    event = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return;
  }

  if (mode === "cleanup") {
    forget(event.session_id);
    return;
  }

  const wireEvent = WIRE[mode];
  const state = loadState(event.session_id);

  // O TURNO É LOCAL E ACONTECE SEMPRE, calado ou não: a observação não depende de
  // o servidor estar respondendo, e o turno tem que estar inteiro quando ele for
  // perguntado no fim.
  let turn = loadTurn(event.session_id);
  if (mode === "start") {
    turn = { seen: [] };
    saveTurn(event.session_id, turn);
  }
  if (mode === "post") {
    const nome = String(event.tool_name || "");
    if (nome && turn.seen.length < MAX_TURN_OBSERVATIONS) {
      const entrada = event.tool_input && typeof event.tool_input === "object" ? event.tool_input : {};
      turn.seen.push({ tool: nome, command: typeof entrada.command === "string" ? entrada.command : null });
      saveTurn(event.session_id, turn);
    }
  }

  // O bloco de normas é local e sai mesmo sem rede: é o que a sessão precisa ver
  // antes de qualquer coisa, e ele já está em disco.
  const normas =
    mode === "start"
      ? loadNorms(dataRoot(), event.cwd) ||
        "Arroway has no delivered norms cached for this directory yet. Before the first mutation, call arroway_read for the project; a successful delivered response unlocks mutations for this session."
      : "";
  const abertura = (extra) => {
    const texto = extra ? `${extra}\n\n${normas}` : normas;
    print({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: texto } });
  };

  // Duas razões para não tocar a rede, e as duas são recado guardado: o servidor
  // disse que não há mais nada a perguntar sobre este evento, ou ele não está
  // respondendo.
  if (state.quiet || silenced(state, wireEvent)) {
    if (mode === "start") abertura(null);
    return;
  }

  const url = connectionUrl();
  if (!url) {
    if (mode === "start") abertura(null);
    return;
  }
  const endpoint = new URL("/api/plugin/gate", url.origin).toString();

  // A etiqueta chega dentro da resposta da leitura, então ela é colhida ANTES de
  // perguntar: é o que faz a mesma requisição já sair autenticada.
  let capability = typeof state.capability === "string" ? state.capability : null;
  if (mode === "post") {
    const colhida = capabilityFromResponse(event.tool_response);
    if (colhida && colhida !== capability) {
      capability = colhida;
      saveState(event.session_id, { ...state, capability });
    }
  }

  // A etiqueta vem primeiro: assim o segredo longo do caminho pessoal para de
  // viajar assim que o servidor emite a de sessão.
  const credential = capability ?? connectionToken(url);

  const extra =
    mode === "stop"
      ? {
          observations: turn.seen,
          last_message_tail:
            typeof event.last_assistant_message === "string"
              ? event.last_assistant_message.slice(-MAX_MESSAGE_TAIL)
              : null,
        }
      : mode === "start"
        ? { clone_facts: cloneFacts(event.cwd) }
        : {};

  const { alive, answer } = await ask(
    endpoint,
    payload(wireEvent, event, Boolean(credential), extra),
    credential
  );

  if (!alive) {
    const falhas = (Number(state.networkFailures) || 0) + 1;
    saveState(event.session_id, {
      ...state,
      capability,
      networkFailures: falhas,
      ...(falhas >= NETWORK_FAILURES_BEFORE_QUIET ? { quiet: true } : {}),
    });
    if (mode === "start") abertura(null);
    return;
  }

  // Versão que não é a nossa não é interpretada: os dois lados falham abertos.
  if (!answer || answer.protocol !== PROTOCOL) {
    if (state.networkFailures) saveState(event.session_id, { ...state, capability, networkFailures: 0 });
    if (mode === "start") abertura(null);
    return;
  }

  const guardar = { ...state, capability, networkFailures: 0 };
  if (typeof answer.session_capability === "string" && answer.session_capability) {
    guardar.capability = answer.session_capability;
  }
  if (answer.session_directive?.stop_asking) guardar.directive = answer.session_directive;
  // Grava só quando algo MUDOU: o cano está no caminho de cada ferramenta, e uma
  // escrita em disco por chamada é pedágio sem nada em troca.
  const mudou =
    guardar.capability !== (typeof state.capability === "string" ? state.capability : null) ||
    JSON.stringify(guardar.directive ?? null) !== JSON.stringify(state.directive ?? null) ||
    (Number(state.networkFailures) || 0) !== 0;
  if (mudou) saveState(event.session_id, guardar);

  // Gravar as normas é ordem do servidor, executada sem interpretação: o cano não
  // sabe o que é uma norma nem quando vale guardar uma.
  if (mode === "post" && answer.cache_norms === true) {
    saveNorms(dataRoot(), event.cwd, plainText(event.tool_response));
  }

  const message = typeof answer.message === "string" && answer.message.trim() ? answer.message : null;

  if (mode === "start") {
    abertura(message);
    return;
  }

  if (mode === "pre" && answer.decision === "deny") {
    // O cano devolve permitir/bloquear no formato que o cliente espera, e o
    // motivo é o texto do servidor — nunca um texto daqui.
    print({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: message ?? "",
      },
    });
    return;
  }

  if (mode === "stop") {
    if (answer.decision === "deny") {
      // Turno barrado NÃO limpa o que foi observado: a segunda parada precisa
      // enxergar o mesmo turno, senão ela veria um turno vazio e passaria por
      // engano em vez de por decisão.
      print({ decision: "block", reason: message ?? "" });
      return;
    }
    saveTurn(event.session_id, { seen: [] });
    if (message) print({ systemMessage: message });
    return;
  }

  if (message) print({ systemMessage: message });
}

try {
  await main();
} catch {
  // Deliberadamente silencioso: stdout vazio, código de saída 0, a sessão segue.
}
process.exit(0);
