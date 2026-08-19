// Arroway plugin — OS FATOS DO CLONE, colhidos e nada além disso (ARROW-201, fatia 3).
//
// Este arquivo observa: roda git, olha o disco, devolve números. Ele não decide
// o que é grave, não escreve frase nenhuma e não sabe o que vai ser dito — o
// texto do aviso mora no servidor (`lib/clone-health-text.mjs`), onde uma
// promoção alcança todo mundo, porque o que se instala congela no dia da
// instalação.
//
// A divisão é a mesma do resto do cano: o cliente é o único que consegue ver o
// estado dos clones desta máquina, então a OBSERVAÇÃO tem que morar aqui; o
// JULGAMENTO sobre ela não tem esse motivo, então não mora.
//
// NADA AQUI VAI À REDE, e é escolha: isto roda na abertura de TODA sessão,
// inclusive nas que nem vão tocar em git. O bloco reporta o que as refs já sabem
// e diz de QUANDO é esse conhecimento.

/**
 * Teto de repositórios examinados quando a sessão abre na pasta-mãe. É orçamento
 * de observação, não regra: uma pasta com dezenas de clones não pode custar a
 * abertura. Estourou o teto, o fato `capped` diz que parou — e quem escreve a
 * frase é o servidor.
 */
export const MAX_CHILD_REPOS = 12;

/**
 * @typedef {{path: string, sha: string, here: string}} Fantasma
 * @typedef {{isRepo: true, root: string, name: string, upstream: string|null,
 *   branch: string|null, behind: number|null, defaultRef: string|null,
 *   behindDefault: number|null, lastFetch: number|null, now: number,
 *   unpushedBranches: number, ghosts: Fantasma[], staleWorktrees: number,
 *   origin: string|null, head: string|null}} RepoFacts
 * @typedef {{isRepo: false, cwd?: string, children?: RepoFacts[],
 *   scanned?: number, capped?: boolean, cap?: number}} PastaFacts
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
  // O teto viaja como FATO (`cap`): quem escreve a frase é o servidor, e ele não
  // pode ter uma segunda cópia deste número — duas cópias divergem no dia em que
  // uma muda.
  return {
    isRepo: false,
    cwd,
    children,
    scanned: roots.length,
    capped: roots.length >= MAX_CHILD_REPOS,
    cap: MAX_CHILD_REPOS,
  };
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
