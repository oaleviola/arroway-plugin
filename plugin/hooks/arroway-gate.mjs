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
//   3. fala com a porta canônica e apresenta a etiqueta que o próprio servidor
//      emitiu — nunca uma credencial lida da máquina;
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

const PLUGIN_VERSION = "0.1.49";

/**
 * O cockpit (ARROW-427): esperas próprias, separadas das do portão.
 *
 * O portão está no caminho de cada ferramenta e espera no máximo 1,5 s. O
 * cockpit só fala na parada e na abertura do prompt, e a parada segurada é uma
 * espera por desenho: cada `listen` pode durar até 25 s no servidor.
 */
const COCKPIT_TIMEOUT_MS = 5000;
const LISTEN_SLICE_MS = 25_000;
const LISTEN_MARGIN_MS = 7000;
// ARROW-430 — o servidor espera até 20 s pela decisão do cockpit; a folga cobre
// a ida e a volta. O `timeout` do gancho no hooks.json é maior que os dois.
const APPROVAL_TIMEOUT_MS = 20_000 + LISTEN_MARGIN_MS;
/** A campainha vive no máximo isto; o cliente a mata antes, pelo timeout do gancho. */
const BELL_LIFETIME_MS = 2 * 60 * 60 * 1000;
/**
 * Tempo para o relato da parada (que roda em paralelo) gravar se o cockpit está
 * ligado. Encurtável só no processo de teste, como a porta canônica.
 */
const BELL_SETTLE_MS =
  process.env.NODE_ENV === "test" && process.env.ARROWAY_TEST_BELL_SETTLE_MS
    ? Number(process.env.ARROWAY_TEST_BELL_SETTLE_MS)
    : 4000;

/**
 * A porta do portão é pública e única. Ela não é a URL de conexão: conexão
 * identifica a pessoa, enquanto esta origem só recebe uma capacidade curta
 * depois da primeira leitura autenticada. Separar as duas é o que faz o cano
 * começar a falar sem pedir que alguém copie uma credencial para o ambiente.
 *
 * O override só existe para o processo de teste. Produção sempre usa o host
 * canônico: nenhuma variável de ambiente de quem instalou muda o destino.
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
 * mandou, o filtro de encaminhamento que ele mandou (ARROW-418), a etiqueta de
 * sessão que o servidor emitiu, e a contagem de falhas de rede seguidas. Nada
 * aqui é julgamento — é recado guardado e um contador.
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

/**
 * ARROW-360 — o fim da sessão apaga o TURNO, nunca a credencial.
 *
 * No Cowork cada mensagem da pessoa encerra a sessão e a reabre com o mesmo
 * identificador. Apagar tudo no encerramento jogava fora, a cada mensagem, a
 * etiqueta que a leitura tinha acabado de dar: no turno seguinte o portão barrava
 * como anônimo quem já tinha lido, e o fechamento ficava mudo. O turno acabou,
 * então ele sai; a etiqueta e a diretiva ficam para a sessão que reabrir.
 *
 * O que sobra sai por idade, não por evento: a etiqueta vive doze horas no
 * servidor, então arquivo parado há dois dias só guarda o que o servidor já não
 * aceita.
 */
const STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

function endSession(sessionId) {
  try {
    const file = sessionFile("turns", sessionId);
    if (file) rmSync(file, { force: true });
  } catch {
    /* nada a recuperar */
  }
  const agora = Date.now();
  for (const pasta of ["directives", "turns"]) {
    let nomes = [];
    try {
      nomes = readdirSync(join(dataRoot(), pasta));
    } catch {
      continue;
    }
    for (const nome of nomes) {
      try {
        const file = join(dataRoot(), pasta, nome);
        if (agora - statSync(file).mtimeMs > STALE_AFTER_MS) rmSync(file, { force: true });
      } catch {
        /* nada a recuperar */
      }
    }
  }
}

/**
 * O endereço do PORTÃO, e ele é um só.
 *
 * O cano não lê endereço nem credencial do ambiente de quem instalou. Até a
 * 0.1.36 ele aceitava uma URL de conexão por variável de ambiente e apresentava
 * o token do caminho dela: era ler da máquina um segredo que já estava ali e
 * mandá-lo a um servidor, que é exatamente o que o scan do diretório da
 * Anthropic aponta (ARROW-216). O link colado já tinha saído do manifesto — a
 * identidade vem do login no conector —, e o cano era o último lugar que ainda
 * o procurava. A primeira `arroway_read` autenticada devolve a etiqueta de
 * sessão, e é ela que identifica os pedidos seguintes.
 */
function gateEndpoint() {
  try {
    const url = new URL(CANONICAL_GATE_ORIGIN);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL("/api/plugin/gate", url.origin).toString();
  } catch {
    // Só alcançável num override de teste malformado. Em produção a constante
    // acima é HTTPS e esta saída não desliga nenhuma instalação real.
    return null;
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
 * do cano e do cliente, os três interruptores do portão, e — depois da
 * ferramenta — se a resposta voltou sem erro e com texto, e se ela trouxe o
 * trecho que o servidor pediu para procurar (ARROW-418: um sim ou não). No fim do turno vai a
 * lista do que foi chamado e a CAUDA da última resposta do modelo. Na abertura
 * vão os números dos clones de git desta pasta. A chave opaca de sessão vai SÓ
 * quando há etiqueta para apresentar.
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
    enforce_checking: checkingEnforcement(),
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

function checkingEnforcement() {
  const configured =
    process.env.ARROWAY_ENFORCE_CHECKING ?? process.env.CLAUDE_PLUGIN_OPTION_ENFORCE_CHECKING ?? "true";
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
 * Os modos do cockpit (ARROW-427), que não passam pelo portão:
 *   · `prompt` — a pessoa mandou um prompt: a sessão volta a trabalhar, e todo
 *     ouvinte de parada anterior morre (é o que o servidor faz ao receber isto);
 *   · `response` — o Cursor entrega a resposta do agente num gancho próprio, e
 *     o `stop` dele não a traz; ela fica guardada para o fim do turno;
 *   · `bell` — a campainha, só no Claude Code;
 *   · `permission` — o agente pediu permissão para uma ferramenta, e a pessoa
 *     pode decidir pelo cockpit (ARROW-430). Claude Code e Codex.
 */
const COCKPIT_MODES = ["prompt", "response", "bell", "permission"];

/**
 * Qual cliente está rodando, lido do FORMATO do evento e nunca do ambiente: o
 * Codex herda o ambiente de quem o abriu, e aberto de dentro do Claude Code ele
 * carrega até `CLAUDE_CODE_ENTRYPOINT` (medido em 08/10). O Cursor manda
 * `cursor_version`; o Codex manda `turn_id`.
 */
function harnessOf(event) {
  if (typeof event?.cursor_version === "string") return "cursor";
  if (typeof event?.turn_id === "string") return "codex";
  if (process.env.CLAUDE_CODE_ENTRYPOINT) return "claude-code";
  return "other";
}

/** Sessão de automação (`claude -p`, SDK): o servidor nunca a segura. */
function isAutomation(harness) {
  return harness === "claude-code" && String(process.env.CLAUDE_CODE_ENTRYPOINT || "").startsWith("sdk");
}

/** O nome da pasta, e só ele: o caminho não sai daqui. */
function folderOf(event) {
  const raiz =
    typeof event?.cwd === "string" && event.cwd
      ? event.cwd
      : Array.isArray(event?.workspace_roots) && typeof event.workspace_roots[0] === "string"
        ? event.workspace_roots[0]
        : "";
  const partes = raiz.split(/[\\/]+/).filter(Boolean);
  return partes.length ? partes[partes.length - 1] : null;
}

function cockpitEndpoint() {
  try {
    return new URL("/api/plugin/cockpit", new URL(CANONICAL_GATE_ORIGIN).origin).toString();
  } catch {
    return null;
  }
}

/**
 * O aviso do cockpit, guardado NA MÁQUINA e não na sessão: é na abertura da
 * PRÓXIMA sessão que ele precisa estar, antes de qualquer credencial. O texto é
 * do servidor; o cano guarda e imprime. Cockpit desligado apaga o arquivo.
 */
const cockpitNoteFile = () => join(dataRoot(), "cockpit", "note.json");
const loadCockpitNote = () => loadJson(cockpitNoteFile(), null);
function saveCockpitNote(note) {
  saveJson(cockpitNoteFile(), "cockpit", { note, enabled: true, at: Date.now() });
}
function clearCockpitNote() {
  try {
    rmSync(cockpitNoteFile(), { force: true });
  } catch {
    /* nada a recuperar */
  }
}

async function askCockpit(body, credential, timeoutMs) {
  const endpoint = cockpitEndpoint();
  if (!endpoint || !credential) return { alive: false, answer: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resposta = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
      body: JSON.stringify({ protocol: PROTOCOL, ...body }),
      signal: controller.signal,
    });
    if (!resposta.ok) return { alive: true, answer: null };
    const json = await resposta.json();
    const valido = json && typeof json === "object" && json.protocol === PROTOCOL;
    return { alive: true, answer: valido ? json : null };
  } catch {
    return { alive: false, answer: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Continuar o turno com um texto, no formato que cada cliente espera: o Cursor
 * lê `followup_message` (ARROW-422); Claude Code e Codex leem `block` + `reason`.
 */
function printContinuation(harness, text) {
  if (harness === "cursor") print({ followup_message: text });
  else print({ decision: "block", reason: text });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A diretiva nomeia QUAIS eventos ela silencia, e o cano compara nomes.
 *
 * Servidor antigo, que manda a diretiva sem a lista, silencia tudo: era o que ela
 * significava quando o portão de leitura era o único. Mudar o que se silencia
 * volta a ser mudança de servidor.
 *
 * ARROW-418 — o silêncio tem exceção, e quem a escreve é o servidor: o evento que
 * casa com o filtro de encaminhamento fala mesmo calado. O cano não sabe o que o
 * filtro significa; ele compara.
 */
function silenced(state, wireEvent, event) {
  const diretiva = state.directive;
  if (!diretiva?.stop_asking) return false;
  const calado = !Array.isArray(diretiva.events) || diretiva.events.includes(wireEvent);
  if (!calado) return false;
  return !forwarded(state, wireEvent, event);
}

/** Regex vinda do servidor, compilada sem confiar nela: inválida casa com nada. */
function casa(fonte, texto) {
  if (typeof fonte !== "string" || typeof texto !== "string") return false;
  try {
    return new RegExp(fonte).test(texto);
  } catch {
    return false;
  }
}

/**
 * ARROW-418 — o evento casa com o filtro que o servidor mandou?
 *
 * Antes da ferramenta: nome (e, quando a regra pede, o comando de shell). Depois:
 * nome, e a resposta CONTÉM o trecho que o servidor nomeou — a resposta é lida
 * aqui e não sai daqui; o que viaja é só o sim ou o não (`response_match`).
 */
function forwarded(state, wireEvent, event) {
  const filtro = state.forward && typeof state.forward === "object" ? state.forward : null;
  const nome = String(event?.tool_name || "");
  if (!filtro || !nome) return false;
  if (wireEvent === "pre_tool_use") {
    const input = event.tool_input && typeof event.tool_input === "object" ? event.tool_input : {};
    const comando = typeof input.command === "string" ? input.command : null;
    return (Array.isArray(filtro.pre) ? filtro.pre : []).some(
      (regra) => casa(regra?.tool, nome) && (regra?.command == null || casa(regra.command, comando))
    );
  }
  if (wireEvent === "post_tool_use") return responseMatches(state, event);
  return false;
}

function responseMatches(state, event) {
  const filtro = state.forward && typeof state.forward === "object" ? state.forward : null;
  const nome = String(event?.tool_name || "");
  if (!filtro || !nome) return false;
  const regras = (Array.isArray(filtro.post) ? filtro.post : []).filter(
    (regra) => casa(regra?.tool, nome) && typeof regra?.response === "string" && regra.response
  );
  if (!regras.length) return false;
  const texto = plainText(event.tool_response);
  return regras.some((regra) => texto.includes(regra.response));
}

function print(value) {
  process.stdout.write(JSON.stringify(value));
}

/**
 * ARROW-427 — a parada, do lado do cockpit: relatar e, SE O SERVIDOR MANDAR,
 * segurar.
 *
 * Quem decide se segura, por quanto tempo e o que entregar é o servidor; o cano
 * só obedece o `hold_ms` e repete o `listen` até o prazo. O conteúdo (a última
 * mensagem do agente) só sai quando o cockpit da pessoa está ligado — e o cano
 * só sabe disso porque o servidor já disse, numa parada anterior; na primeira,
 * o servidor pede (`wants_content`) e o cano manda em seguida.
 *
 * Devolve o texto a entregar, ou nulo. Qualquer falha é nulo: a parada solta.
 */
async function cockpitAtStop(event, state, harness, lastMessage, forcedMessage) {
  const credential = typeof state.capability === "string" ? state.capability : null;
  if (!credential || state.quiet) return null;
  const sessionKey = String(event.session_id || "");
  const base = {
    mode: "report",
    session_key: sessionKey,
    harness,
    state: "idle",
    model: typeof event.model === "string" ? event.model : null,
    label: folderOf(event),
    automation: isAutomation(harness),
  };
  const conteudo = {
    last_message: typeof lastMessage === "string" ? lastMessage : "",
    ...(typeof forcedMessage === "string" ? { forced_message: forcedMessage } : {}),
  };

  const sabeLigado = Boolean(loadCockpitNote()?.enabled);
  let { answer } = await askCockpit(sabeLigado ? { ...base, ...conteudo } : base, credential, COCKPIT_TIMEOUT_MS);
  if (!answer) return null;
  if (!answer.enabled) {
    clearCockpitNote();
    const agora = loadState(event.session_id);
    if (agora.cockpit) saveState(event.session_id, { ...agora, cockpit: undefined });
    return null;
  }
  if (typeof answer.session_note === "string" && answer.session_note.trim()) saveCockpitNote(answer.session_note);
  if (answer.wants_content) {
    const segundo = await askCockpit({ ...base, ...conteudo }, credential, COCKPIT_TIMEOUT_MS);
    if (segundo.answer?.enabled) answer = segundo.answer;
  }
  saveState(event.session_id, { ...loadState(event.session_id), cockpit: { enabled: true, bell: answer.bell === true } });

  const segurar = Number(answer.hold_ms) || 0;
  const geracao = answer.generation;
  if (segurar <= 0 || !Number.isInteger(geracao)) return null;
  const prazo = Date.now() + segurar;
  for (;;) {
    const falta = prazo - Date.now();
    if (falta < 1000) return null;
    const espera = Math.min(LISTEN_SLICE_MS, falta);
    const ouvido = await askCockpit(
      { mode: "listen", session_key: sessionKey, harness, generation: geracao, wait_ms: espera },
      credential,
      espera + LISTEN_MARGIN_MS
    );
    if (!ouvido.answer || !ouvido.answer.enabled) return null;
    if (typeof ouvido.answer.message === "string" && ouvido.answer.message.trim()) return ouvido.answer.message;
    if (ouvido.answer.superseded) return null;
  }
}

/**
 * A pessoa mandou um prompt: a sessão volta a trabalhar. Para o servidor, isto
 * mata qualquer ouvinte de parada anterior — no Cursor a parada velha continua
 * viva durante o turno novo (ARROW-422). Sem conteúdo nenhum.
 */
async function cockpitPrompt(event, state) {
  const credential = typeof state.capability === "string" ? state.capability : null;
  if (!credential || state.quiet || !state.cockpit?.enabled) return;
  const harness = harnessOf(event);
  await askCockpit(
    {
      mode: "report",
      session_key: String(event.session_id || ""),
      harness,
      state: "working",
      model: typeof event.model === "string" ? event.model : null,
      label: folderOf(event),
      automation: isAutomation(harness),
    },
    credential,
    COCKPIT_TIMEOUT_MS
  );
}

/**
 * O que a pessoa vê no cockpit sobre o pedido: o comando de shell, ou a
 * descrição que o cliente mostraria, ou só o NOME do arquivo — o caminho não sai
 * daqui, pela mesma régua do nome da pasta.
 */
function permissionSummary(event) {
  const entrada = event?.tool_input && typeof event.tool_input === "object" ? event.tool_input : {};
  if (typeof entrada.command === "string" && entrada.command.trim()) return entrada.command;
  if (typeof entrada.description === "string" && entrada.description.trim()) return entrada.description;
  if (typeof entrada.file_path === "string") {
    const partes = entrada.file_path.split(/[\\/]+/).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return null;
}

/**
 * ARROW-430 — o agente pediu permissão para uma ferramenta, e a janela vai
 * perguntar à pessoa. Antes, o cano pergunta ao cockpit se ela decidiu por lá.
 *
 * Quem decide se vale esperar, e por quanto, é o servidor: só com o cockpit
 * aberto há pouco, e no máximo 20 s. O cano só traduz a decisão para o formato
 * do cliente. Sem decisão — ou qualquer falha — não imprime nada, e a janela
 * pergunta como sempre.
 *
 * Só Claude Code e Codex. No Cursor o `allow` não dispensa a pergunta local
 * (ARROW-422), e nenhum gancho dele chama este modo.
 */
async function cockpitPermission(event) {
  const harness = harnessOf(event);
  if (harness !== "claude-code" && harness !== "codex") return;
  const state = loadState(event.session_id);
  const credential = typeof state.capability === "string" ? state.capability : null;
  if (!credential || state.quiet) return;
  // Cockpit desligado não ganha nem a pergunta: a sessão sabe depois da primeira
  // parada; antes dela, vale o aviso que o servidor deixou nesta máquina.
  if (!state.cockpit?.enabled && !loadCockpitNote()?.enabled) return;
  const nome = typeof event.tool_name === "string" ? event.tool_name : "";
  if (!nome) return;
  const { answer } = await askCockpit(
    {
      mode: "approval",
      session_key: String(event.session_id || ""),
      harness,
      tool_name: nome,
      summary: permissionSummary(event),
      model: typeof event.model === "string" ? event.model : null,
      label: folderOf(event),
      automation: isAutomation(harness),
    },
    credential,
    APPROVAL_TIMEOUT_MS
  );
  if (!answer?.enabled) return;
  if (answer.decision === "allow") {
    print({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } });
  } else if (answer.decision === "deny") {
    // O motivo é o texto do servidor, como em toda recusa do cano.
    const motivo = typeof answer.message === "string" ? answer.message : "";
    print({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "deny", message: motivo } } });
  }
}

/** A trava da campainha: uma por sessão, e a de um processo morto não vale. */
function bellLock(sessionId) {
  const arquivo = sessionFile("bell", sessionId);
  if (!arquivo) return null;
  const atual = loadJson(arquivo, null);
  if (atual && Number.isInteger(atual.pid) && atual.pid !== process.pid) {
    try {
      process.kill(atual.pid, 0);
      return null;
    } catch {
      /* processo morto: a trava é dele, e ele não volta */
    }
  }
  saveJson(arquivo, "bell", { pid: process.pid, at: Date.now() });
  return () => {
    try {
      if (loadJson(arquivo, null)?.pid === process.pid) rmSync(arquivo, { force: true });
    } catch {
      /* nada a recuperar */
    }
  };
}

/**
 * ARROW-427 — a campainha: SÓ NO CLAUDE CODE, que roda este modo em segundo
 * plano (`asyncRewake`). O Codex lê o mesmo `hooks.json`, ignora essa chave e
 * roda o modo de forma SÍNCRONA (medido em 08/10) — por isso qualquer outro
 * cliente sai daqui na hora, antes de esperar qualquer coisa.
 *
 * Ela não entrega a mensagem: quando o servidor manda tocar, ela acorda a sessão
 * com o texto do servidor (um "pare e espere"), e a parada seguinte, segurada,
 * é quem entrega. Devolve 2 para tocar, como o cliente pede.
 */
async function bell(event) {
  if (harnessOf(event) !== "claude-code") return 0;
  const sessionId = event.session_id;
  const soltar = bellLock(sessionId);
  if (!soltar) return 0;
  try {
    await sleep(BELL_SETTLE_MS);
    const fim = Date.now() + BELL_LIFETIME_MS;
    let falhas = 0;
    while (Date.now() < fim) {
      const state = loadState(sessionId);
      const credential = typeof state.capability === "string" ? state.capability : null;
      if (!credential || state.quiet || !state.cockpit?.enabled || !state.cockpit?.bell) return 0;
      const { alive, answer } = await askCockpit(
        { mode: "bell", session_key: String(sessionId || ""), harness: "claude-code", wait_ms: LISTEN_SLICE_MS },
        credential,
        LISTEN_SLICE_MS + LISTEN_MARGIN_MS
      );
      if (!alive) {
        if (++falhas >= NETWORK_FAILURES_BEFORE_QUIET) return 0;
        await sleep(5000);
        continue;
      }
      falhas = 0;
      if (!answer || !answer.enabled || answer.closed) return 0;
      if (answer.ring && typeof answer.message === "string" && answer.message.trim()) {
        process.stderr.write(answer.message);
        return 2;
      }
    }
    return 0;
  } finally {
    soltar();
  }
}

/**
 * A consulta ao portão, com tudo o que ela guarda. Devolve a resposta e o estado
 * novo, ou nulo quando não houve resposta que valesse — e nulo é falhar aberto.
 */
async function consultGate(mode, wireEvent, event, state, capability, extra) {
  const endpoint = gateEndpoint();
  if (!endpoint) return null;

  // A etiqueta é a ÚNICA credencial que sai daqui: emitida pelo servidor,
  // guardada na pasta de dados do próprio plugin e devolvida só a ele. Sem ela
  // o pedido vai anônimo — e anônimo é o caminho sem estado, não uma recusa.
  const credential = capability;
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
    return null;
  }

  // Versão que não é a nossa não é interpretada: os dois lados falham abertos.
  if (!answer || answer.protocol !== PROTOCOL) {
    if (state.networkFailures) saveState(event.session_id, { ...state, capability, networkFailures: 0 });
    return null;
  }

  const guardar = { ...state, capability, networkFailures: 0 };
  if (typeof answer.session_capability === "string" && answer.session_capability) {
    guardar.capability = answer.session_capability;
  }
  if (answer.session_directive?.stop_asking) guardar.directive = answer.session_directive;
  if (answer.forward && typeof answer.forward === "object") guardar.forward = answer.forward;
  // Grava só quando algo MUDOU: o cano está no caminho de cada ferramenta, e uma
  // escrita em disco por chamada é pedágio sem nada em troca.
  const mudou =
    guardar.capability !== (typeof state.capability === "string" ? state.capability : null) ||
    JSON.stringify(guardar.directive ?? null) !== JSON.stringify(state.directive ?? null) ||
    JSON.stringify(guardar.forward ?? null) !== JSON.stringify(state.forward ?? null) ||
    (Number(state.networkFailures) || 0) !== 0;
  if (mudou) saveState(event.session_id, guardar);

  // Gravar as normas é ordem do servidor, executada sem interpretação: o cano não
  // sabe o que é uma norma nem quando vale guardar uma. Desde a 0.1.36 o servidor
  // manda o próprio bloco pronto (ARROW-359), e o cano grava o que veio — antes ele
  // gravava o corpo da ferramenta, e só depois de um `arroway_norms` que quase
  // nunca chegava até aqui.
  if (mode === "post" && typeof answer.norms_block === "string" && answer.norms_block.trim()) {
    saveNorms(dataRoot(), event.cwd, answer.norms_block);
  }

  const message = typeof answer.message === "string" && answer.message.trim() ? answer.message : null;
  return { answer, message };
}

/**
 * O fim do turno: primeiro o portão de fechamento, depois o cockpit — UM
 * PROCESSO SÓ, nesta ordem, de propósito. O cliente espera todos os ganchos de
 * parada terminarem antes de aplicar qualquer um; com a parada segurada num
 * gancho à parte, a cobrança do portão chegava só depois da espera inteira
 * (medido no Desktop em 08/10, ARROW-420).
 *
 * Cobrou: devolve na hora, sem segurar, e guarda a resposta de ANTES da
 * cobrança — é ela a "última mensagem"; a que vier depois é a mensagem forçada
 * (decisão do Ale para a v1: mostrar as duas).
 */
async function finishStop(event, turn, resultado, harness, ultimaMensagem) {
  const answer = resultado?.answer ?? null;
  if (answer?.decision === "deny") {
    // Turno barrado NÃO limpa o que foi observado: a segunda parada precisa
    // enxergar o mesmo turno, senão ela veria um turno vazio e passaria por
    // engano em vez de por decisão.
    saveTurn(event.session_id, {
      ...turn,
      pendingLast: typeof turn.pendingLast === "string" ? turn.pendingLast : ultimaMensagem,
    });
    printContinuation(harness, resultado.message ?? "");
    return;
  }

  const forcada = typeof turn.pendingLast === "string" ? ultimaMensagem : null;
  const ultima = typeof turn.pendingLast === "string" ? turn.pendingLast : ultimaMensagem;
  // O turno só se encerra quando o portão respondeu liberando, como sempre foi;
  // a resposta guardada para o cockpit sai em qualquer caso.
  const { pendingLast: _p, lastResponse: _r, ...resto } = turn;
  saveTurn(event.session_id, answer ? { seen: [] } : resto);

  const entrega = await cockpitAtStop(event, loadState(event.session_id), harness, ultima, forcada);
  if (entrega) {
    printContinuation(harness, entrega);
    return;
  }
  if (resultado?.message) print({ systemMessage: resultado.message });
}

async function main() {
  const mode = process.argv[2];
  if (!Object.hasOwn(WIRE, mode) && mode !== "cleanup" && !COCKPIT_MODES.includes(mode)) return 0;

  let event = {};
  try {
    event = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return 0;
  }

  if (mode === "bell") return bell(event);

  if (mode === "cleanup") {
    // ARROW-427 — o cockpit fica sabendo que a sessão acabou, e a campainha dela
    // vai embora na próxima consulta. Só com o cockpit ligado e credencial.
    const anterior = loadState(event.session_id);
    if (anterior.cockpit?.enabled && typeof anterior.capability === "string" && !anterior.quiet) {
      await askCockpit(
        { mode: "end", session_key: String(event.session_id || ""), harness: harnessOf(event) },
        anterior.capability,
        TIMEOUT_MS
      );
    }
    endSession(event.session_id);
    return 0;
  }

  if (mode === "prompt") {
    await cockpitPrompt(event, loadState(event.session_id));
    return 0;
  }

  if (mode === "permission") {
    await cockpitPermission(event);
    return 0;
  }

  if (mode === "response") {
    // O Cursor entrega a resposta do agente aqui, e o `stop` dele não a traz.
    if (typeof event.text === "string") {
      saveTurn(event.session_id, { ...loadTurn(event.session_id), lastResponse: event.text });
    }
    return 0;
  }

  const wireEvent = WIRE[mode];
  const state = loadState(event.session_id);
  const harness = harnessOf(event);

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

  // A última resposta do modelo: o Claude Code e o Codex a trazem no próprio
  // `stop`; o Cursor, no gancho `afterAgentResponse`, guardada no turno.
  const ultimaMensagem =
    typeof event.last_assistant_message === "string"
      ? event.last_assistant_message
      : typeof turn.lastResponse === "string"
        ? turn.lastResponse
        : null;

  // O bloco de normas é local e sai mesmo sem rede: é o que a sessão precisa ver
  // antes de qualquer coisa, e ele já está em disco.
  const normas =
    mode === "start"
      ? loadNorms(dataRoot(), event.cwd) ||
        "Arroway has no delivered norms cached for this directory yet. Before the first mutation, call arroway_read for the project; a successful delivered response unlocks mutations for this session. If no Arroway tools are available in this session, the connection has not been signed in yet: tell the person, and ask them to sign in to Arroway in this client (in Claude Code: run /mcp and sign in to plugin:arroway:arroway). Until then nothing is read or recorded, so do not present anything as coming from Arroway."
      : "";
  // ARROW-427 — o aviso do cockpit, também local: o servidor o mandou numa
  // parada anterior, e é aqui, antes de qualquer credencial, que ele vale.
  const nota = mode === "start" ? loadCockpitNote() : null;
  const avisoCockpit = nota?.enabled && typeof nota.note === "string" ? nota.note : "";
  const abertura = (extra) => {
    const texto = [extra, avisoCockpit, normas].filter(Boolean).join("\n\n");
    if (harness === "cursor") print({ additional_context: texto });
    else print({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: texto } });
  };

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

  const extra =
    mode === "stop"
      ? {
          observations: turn.seen,
          last_message_tail: typeof ultimaMensagem === "string" ? ultimaMensagem.slice(-MAX_MESSAGE_TAIL) : null,
        }
      : mode === "start"
        ? { clone_facts: cloneFacts(event.cwd) }
        : mode === "post"
          ? { response_match: responseMatches(state, event) }
          : {};

  // Duas razões para não tocar a rede do portão, e as duas são recado guardado:
  // o servidor disse que não há mais nada a perguntar sobre este evento, ou ele
  // não está respondendo. A parada segue para o cockpit mesmo assim.
  const resultado =
    state.quiet || silenced(state, wireEvent, event)
      ? null
      : await consultGate(mode, wireEvent, event, { ...state, capability }, capability, extra);

  if (mode === "start") {
    abertura(resultado?.message ?? null);
    return 0;
  }

  if (mode === "stop") {
    await finishStop(event, turn, resultado, harness, ultimaMensagem);
    return 0;
  }

  if (!resultado) return 0;
  const { answer, message } = resultado;

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
    return 0;
  }

  if (message) print({ systemMessage: message });
  return 0;
}

let codigo = 0;
try {
  codigo = await main();
} catch {
  // Deliberadamente silencioso: stdout vazio, código de saída 0, a sessão segue.
}
// O único código diferente de zero é o toque da campainha (2), que o cliente lê
// como "acorde a sessão com o que saiu em stderr".
process.exit(codigo === 2 ? 2 : 0);
