// ARROW-146 — o estado do clone dito na ABERTURA, não descoberto no meio.
//
// Arroway existe para que ninguém afirme a partir de memória em vez da fonte. Mas
// a fonte que uma sessão de código lê não é só o commons: é o clone de git em que
// ela está. Clone atrasado responde bonito — o arquivo abre, o grep roda, o teste
// compila — e responde sobre um mundo que não é mais o de produção.
//
// A cicatriz, num único dia (11/ago/2026, clone 71 commits atrás): um `grep` que
// não achou uma feature que existe e roda em produção, e um typecheck vermelho em
// dois arquivos promovidos naquele mesmo dia. Nos dois casos o vermelho era do
// ambiente, e nos dois a conclusão tentadora era "produção quebrada".
//
// SILÊNCIO É O ESTADO NORMAL. Clone em dia não imprime nada: um bloco que aparece
// sempre é um bloco que se aprende a pular, e aí ele não avisa mais nada.
//
// NÃO DÁ FETCH, e isto é escolha, não esquecimento. O card admitia teto curto ou
// sair do caminho crítico; rede na abertura custa em TODA sessão, inclusive nas
// que nem vão tocar em git. Então o bloco reporta o que as refs já sabem e diz de
// QUANDO é esse conhecimento — um clone cujo último fetch foi há dias tem a
// contagem subestimada, e é justamente isso que a linha de idade denuncia.
//
// O que decide está em `assessClone`, que é pura: recebe fatos, devolve linhas.
// Quem fala com git e com disco é `collectFacts`, e ele injeta as duas
// dependências para que o teste não precise de repositório nem de rede.

/** Onde dependência e client gerado costumam ter mudado junto. */
export const BEHIND_LOUD = 20;
/** A partir daqui, a contagem de atraso é velha o bastante para não valer sozinha. */
export const FETCH_STALE_HOURS = 24;
/**
 * Teto de repositórios examinados quando a sessão abre na pasta-mãe. Existe pelo
 * mesmo motivo que o resto não vai à rede: isto roda na abertura de TODA sessão,
 * e uma pasta com dezenas de clones não pode custar a abertura. Estourou o teto,
 * o bloco diz que parou — teto silencioso mentiria por omissão.
 */
export const MAX_CHILD_REPOS = 12;

const horas = (ms) => Math.floor(ms / 3_600_000);

/**
 * Os fatos viram avisos. Lista vazia significa clone em dia — e ninguém imprime
 * cabeçalho para uma lista vazia.
 */
export function assessClone(facts) {
  if (!facts || !facts.isRepo) return [];
  const avisos = [];

  // ARROW-179 — estar em dia com o PRÓPRIO ramo não diz nada sobre o produto.
  // Ramo de feature sincronizado com o remoto dele mede zero de atraso e ainda
  // assim serve arquivo velho: foi assim que uma sessão afirmou que o produto
  // não tinha uma instrução que ele tem, lendo um SKILL.md 31 commits atrás da
  // integração. Este aviso é sobre a distância até o ramo que vira produção.
  if (typeof facts.behindDefault === "number" && facts.behindDefault > 0) {
    avisos.push(
      `você está em '${facts.branch}', ${facts.behindDefault} commit(s) atrás de ${facts.defaultRef} — arquivo lido AQUI não é o que está publicado; para afirmar o que o produto faz, leia 'git show ${facts.defaultRef}:<caminho>'`
    );
  }

  if (typeof facts.behind === "number" && facts.behind > 0) {
    const alvo = facts.upstream || "o remoto";
    avisos.push(
      facts.behind >= BEHIND_LOUD
        ? `${facts.behind} commits atrás de ${alvo} — typecheck e teste AQUI não medem produção enquanto as dependências e o client gerado não forem refeitos`
        : `${facts.behind} commit(s) atrás de ${alvo}`
    );
  }

  // A idade do conhecimento é aviso por si só: sem ela, "0 commits atrás" lido num
  // clone que não busca há uma semana passa a impressão exatamente oposta à verdade.
  if (facts.lastFetch === null) {
    avisos.push(`este clone nunca buscou do remoto — a contagem de atraso acima não existe, e não é a mesma coisa que estar em dia`);
  } else if (typeof facts.lastFetch === "number" && typeof facts.now === "number") {
    const idade = horas(facts.now - facts.lastFetch);
    if (idade >= FETCH_STALE_HOURS) {
      avisos.push(`o último fetch foi há ${idade}h, então o atraso acima é o de então e pode estar subestimado — 'git fetch' antes de concluir sobre produção`);
    }
  }

  if (facts.unpushedBranches > 0) {
    avisos.push(`${facts.unpushedBranches} branch(es) com commit que NÃO está no remoto — some junto se este clone for apagado`);
  }

  for (const ghost of facts.ghosts || []) {
    avisos.push(
      `CLONE DUPLICADO: ${ghost.path} aponta para o mesmo repositório num commit DIFERENTE (${ghost.sha} lá contra ${ghost.here} aqui) — sessão que cair lá vê outro código`
    );
  }

  if (facts.staleWorktrees > 0) {
    avisos.push(`${facts.staleWorktrees} worktree(s) apontando para diretório que não existe mais — 'git worktree prune' resolve`);
  }

  return avisos;
}

const RODAPE = `   A fonte de produção é a ref remota: depois de 'git fetch', leia com 'git grep <termo> origin/main'.`;

/** O bloco pronto, ou string vazia. Cabeçalho só existe quando há o que dizer. */
export function cloneHealthBlock(facts) {
  // ARROW-179 — pasta-mãe: um grupo por repositório que tem algo a dizer, e o
  // rodapé uma vez só. Repositório em dia continua não imprimindo nada, então
  // pasta inteira em dia segue devolvendo vazio.
  if (facts && facts.isRepo === false && Array.isArray(facts.children)) {
    const grupos = [];
    for (const filho of facts.children) {
      const avisos = assessClone(filho);
      if (avisos.length === 0) continue;
      grupos.push(`   [${filho.name}]`, ...avisos.map((a) => `     · ${a}`));
    }
    if (grupos.length === 0) return "";
    const cabecalho = `⚠️ Estado dos clones em ${facts.cwd} — dito agora para não virar conclusão errada depois:`;
    const teto = facts.capped
      ? [`   (parei em ${MAX_CHILD_REPOS} repositórios; pode haver mais nesta pasta)`]
      : [];
    return [cabecalho, ...grupos, ...teto, RODAPE].join("\n");
  }

  const avisos = assessClone(facts);
  if (avisos.length === 0) return "";
  return [
    `⚠️ Estado do clone [${facts.name}] — dito agora para não virar conclusão errada depois:`,
    ...avisos.map((a) => `   · ${a}`),
    RODAPE,
  ].join("\n");
}

/**
 * @typedef {{path: string, sha: string, here: string}} Fantasma
 * @typedef {{isRepo: true, root: string, name: string, upstream: string|null,
 *   branch: string|null, behind: number|null, defaultRef: string|null,
 *   behindDefault: number|null, lastFetch: number|null, now: number,
 *   unpushedBranches: number, ghosts: Fantasma[], staleWorktrees: number,
 *   origin: string|null, head: string|null}} RepoFacts
 * @typedef {{isRepo: false, cwd?: string, children?: RepoFacts[],
 *   scanned?: number, capped?: boolean}} PastaFacts
 */

/**
 * Reúne os fatos. `git` roda comandos e devolve texto (string vazia quando falha),
 * `exists` responde por caminho, `mtime` devolve o carimbo de um arquivo ou null.
 * Nenhum deles vai à rede.
 *
 * O retorno é discriminado por `isRepo`: dentro de um repositório vem o clone;
 * na pasta-mãe vêm os filhos. Quem consome escolhe pelo campo, nunca por forma.
 *
 * @returns {RepoFacts|PastaFacts}
 */
export function collectFacts(cwd, deps) {
  const { git, exists, listDir } = deps;
  const root = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (root) return repoFacts(root, deps, ghostsAroundSiblings(root, deps));

  // ARROW-179 — a sessão abriu na pasta-MÃE, e até aqui isso desligava o guarda
  // inteiro. É o caso de quem trabalha em multi-repo: o cwd não é repositório
  // nenhum, então `--show-toplevel` falha e nada era dito. Justamente onde há
  // mais clones para envelhecer é onde o aviso sumia.
  const roots = [];
  for (const dir of listDir(cwd)) {
    if (roots.length >= MAX_CHILD_REPOS) break;
    if (exists(`${dir}/.git`)) roots.push(dir);
  }
  if (roots.length === 0) return { isRepo: false };

  const children = roots.map((r) => repoFacts(r, deps, []));
  markGhostsAmong(children);
  return { isRepo: false, cwd, children, scanned: roots.length, capped: roots.length >= MAX_CHILD_REPOS };
}

/**
 * Fantasma ENTRE os filhos, em uma passada: mesmo `origin` com HEAD diferente.
 * Comparar cada um com cada um custaria o quadrado do número de repositórios na
 * abertura de toda sessão; agrupar por origem custa uma passada.
 */
function markGhostsAmong(children) {
  const porOrigem = new Map();
  for (const f of children) {
    if (!f.origin || !f.head) continue;
    const lista = porOrigem.get(f.origin) || [];
    lista.push(f);
    porOrigem.set(f.origin, lista);
  }
  for (const lista of porOrigem.values()) {
    if (lista.length < 2) continue;
    for (const f of lista) {
      f.ghosts = lista
        .filter((o) => o !== f && o.head !== f.head)
        .map((o) => ({ path: o.root, sha: o.head, here: f.head }));
    }
  }
}

/** Fantasma entre IRMÃOS, quando a sessão abriu DENTRO de um repositório. */
function ghostsAroundSiblings(root, { git, exists, listDir }) {
  // `~/repos` é o setup de quem construiu, e o alvo é funcionar para quem não tem
  // esse setup — por isso varre os irmãos, nunca uma pasta fixa do dono. Um nível
  // só: isto roda na abertura de toda sessão.
  const here = git(root, ["rev-parse", "--short", "HEAD"]);
  const origin = git(root, ["remote", "get-url", "origin"]);
  const ghosts = [];
  if (!origin || !here) return ghosts;
  const parent = root.split("/").slice(0, -1).join("/");
  for (const sibling of listDir(parent)) {
    if (sibling === root) continue;
    if (!exists(`${sibling}/.git`)) continue;
    if (git(sibling, ["remote", "get-url", "origin"]) !== origin) continue;
    const sha = git(sibling, ["rev-parse", "--short", "HEAD"]);
    if (sha && sha !== here) ghosts.push({ path: sibling, sha, here });
  }
  return ghosts;
}

function repoFacts(root, { git, exists, mtime, now }, ghosts) {
  const name = root.split("/").filter(Boolean).pop() || root;
  const upstream = git(root, ["rev-parse", "--abbrev-ref", "@{u}"]) || null;
  const behind = upstream ? Number(git(root, ["rev-list", "--count", "HEAD..@{u}"]) || "0") : null;

  // Distância até o ramo que vira produção, que é outra pergunta: um ramo de
  // feature pode estar em dia com o remoto DELE e velho em relação ao produto.
  // O alvo sai do próprio remoto (`origin/HEAD`) em vez de cravar "main", que
  // nem todo repositório usa.
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]) || null;
  const defaultRef =
    (git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]) || "").trim() || null;
  const behindDefault =
    defaultRef && branch && branch !== defaultRef.replace(/^origin\//, "")
      ? Number(git(root, ["rev-list", "--count", `HEAD..${defaultRef}`]) || "0")
      : null;

  const unpushedBranches = (git(root, ["for-each-ref", "--format=%(refname:short) %(upstream:track)", "refs/heads"]) || "")
    .split("\n")
    .filter((line) => line.trim())
    // `[ahead N]` cobre branch com upstream; branch SEM upstream nunca foi
    // empurrada, e é o caso que mais dói — o trabalho que só existe aqui.
    .filter((line) => /\[.*ahead \d+/.test(line) || line.trim().split(/\s+/).length === 1).length;

  const staleWorktrees = (git(root, ["worktree", "list", "--porcelain"]) || "")
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter((dir) => dir && dir !== root && !exists(dir)).length;

  return {
    isRepo: true,
    root,
    name,
    branch,
    upstream,
    behind,
    defaultRef,
    behindDefault,
    lastFetch: mtime(`${root}/.git/FETCH_HEAD`),
    now: now(),
    unpushedBranches,
    ghosts,
    staleWorktrees,
    // Só para o agrupamento de fantasmas entre filhos — `assessClone` não lê.
    origin: git(root, ["remote", "get-url", "origin"]) || null,
    head: git(root, ["rev-parse", "--short", "HEAD"]) || null,
  };
}
