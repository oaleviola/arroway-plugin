# Arroway plugin

[Arroway](https://www.arroway.app) orchestrates people and AI agents around the decisions in force.

**English** · [Español](#español) · [Português](#português)

One install instead of two steps. Before this package, joining Arroway meant adding the connector **and** pasting a seed into your Project or `CLAUDE.md` by hand. The seed is now the skill, and the skill travels with the plugin.

The plugin does not replace the MCP server — it wraps it. The server is still the engine; this is the packaging.

## What is in the box

| Component | File | What it does |
| :--- | :--- | :--- |
| MCP connection (Claude) | `.mcp.json` | Connects Claude Code over HTTP to Arroway's own address. Identity comes from signing in, not from a pasted link. |
| Skill | `skills/arroway-workflow/SKILL.md` | Teaches the protocol: read → work → norms → close. Findings are named there as context, never a norm; the judgement of what counts as a finding still lives on the server, not in this file. |
| Hooks | `hooks/hooks.json` | Matches everything and hands every event to the pipe. No tool name is frozen in the package. |
| The pipe | `hooks/arroway-gate.mjs` | The only script that runs. It observes, asks the server, prints the answer and obeys it. It carries no rule and no wording of its own — see **What leaves your machine** below. |
| Local observation | `hooks/clone-facts.mjs`, `hooks/norms-cache.mjs` | The two things only your machine can see or keep: the state of the git clones here, and the last delivered norms for this directory. Numbers and text, no judgement. |
| MCP connection (OpenAI) | `codex-mcp.json` | Declares Arroway's public MCP endpoint so the directory can connect and scan it directly. |
| Manifest, MCP and hooks (Cursor) | `.cursor-plugin/plugin.json`, `cursor-mcp.json`, `hooks/cursor-hooks.json` | Cursor reads its own manifest and its own hook format. Same skill, same pipe, no fork — and no link to paste: the address is Arroway's own and the identity comes from signing in. |

## Install — Claude Code

```bash
/plugin marketplace add oaleviola/arroway-plugin
```

```bash
/plugin install arroway@arroway
```

Nothing to paste, and no separate connector to install: the package carries the connection to Arroway's own address.

If the install summary says `Run /reload-plugins to activate.`, run that.

The connection starts signed out. Sign in once: run `/mcp`, choose `plugin:arroway:arroway` and follow the sign-in in the browser. Claude Code registers itself, you approve the connection as yourself, and memory written from then on carries your name. Until you sign in, Arroway's tools do not appear in the session and nothing is read or recorded.

If Arroway is already connected to your Claude account as a connector and its tools already show up in the session, you can skip this step.

To install from a local checkout instead:

```bash
/plugin marketplace add ./arroway-app
```

## Install — Codex Desktop / CLI

The Codex manifest points to `codex-mcp.json`, which declares Arroway's public MCP endpoint. The directory connects to that endpoint, discovers OAuth from the server, and scans it directly; the same package adds the skill and, where supported, the hooks.

Add the public GitHub marketplace and install the package:

```bash
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Open a new task after installing or updating so the task picks up the new plugin snapshot.

For local package development, point the marketplace command at a local checkout instead of the GitHub repository.

The Codex IDE extension does not support plugins. Connect the Arroway MCP server there; do not expect the local skill or hooks to load.

## Install — Cursor

Add this repository as a plugin marketplace in Cursor, then install **arroway** from the plugin list.

**Nothing to paste.** The Cursor package carries Arroway's own address and signs you in through the browser the first time it needs you: Cursor registers itself, you approve the connection as yourself, and the memory your assistant writes from then on carries your name. A connection link would be worse here, not better — it is an identity living inside a file that a repository can commit.

Cursor reads a different manifest from Claude Code (`.cursor-plugin/plugin.json`) and a different hook format (`hooks/cursor-hooks.json`). Both travel in this same package, over the same skill and the same pipe: one package, three clients, no fork.

## Connect — ChatGPT

ChatGPT does not require a second manual package installation after you register the remote MCP server. Until the public Arroway plugin is approved, enable Developer mode, add the Arroway MCP URL, and complete OAuth; that registration creates the personal plugin in ChatGPT. After approval, use the public directory entry instead.

The 1.0.0 submission already included the `arroway-workflow` skill; it was rejected on reviewer access, not on the package. The current package declares the remote MCP endpoint directly, so the directory can complete connection, OAuth and tool scanning from the submission dashboard.

In a corporate workspace the admin decides: a plugin is either **Available** (each member installs it) or **Installed** (pushed by default). A member cannot add an arbitrary plugin without that. This is the same gate the connector already passes through.

## What leaves your machine

The reading gate is decided by the server, not by the installed package. That is what lets a fix reach everyone the moment it is promoted, instead of only the people who happen to update — and it has a price you should not have to guess at.

**What is sent**, once per tool call, until the gate settles for the session:

* the tool's name;
* the text of a shell command, and only a shell command — classifying shell requires reading it;
* an opaque session key, which is your client's session identifier and nothing else — and only when the pipe has a credential to present, because without one there is no state to separate;
* the plugin version, the client name, and whether you have each of the three switches on;
* after the tool ran: whether the response came back without an error and whether it carried any text — and, for an `arroway_norms` reply, whether it carries the mark of a checked draft: a yes or no, never the reply.

**What is never sent:** file paths, the working directory, file contents, response contents. Not even as a fingerprint. The gate does not need them, so they do not leave. The one exception is yours to turn on: with the cockpit on, the agent's last reply goes to the cockpit (see **The cockpit** below).

**The shell command is used to classify the call and for nothing else.** It is never written to the database, never written to a log, and does not outlive the request that carried it. The only thing the gate stores is six fields — whether a read was delivered, whether it already asked for one, whether it already asked you to close this turn, whether a text check was done and not yet used, a fingerprint of the publishing act it already asked about (a short hash of tool and command, never the command), and a request count — and a test locks that list so a seventh field cannot be added without someone noticing. Apart from that state, the closing reminder leaves a dated record twice: when it asks you to record a turn, and when it lets the next stop through. The publishing check leaves one each time it asks, lets an act through after a check, or lets a repeat through without one. Each record holds your account, the connection and a short tag of the session — nothing from the turn: no tool name, no command, no message. It is how we can tell that the reminder asks once and then lets go. Keep a secret out of a command line anyway: the gate is not the only thing that sees it.

**Who the state belongs to.** The gate answers anyone, but it only *remembers* for an authenticated account. Without a credential it reads nothing and writes nothing, and the answer is always the same. The credential is a short-lived session tag that Arroway's server issues inside the first commons read; it binds to the first session that presents it and expires within hours.

**The gate reads no credential from your machine.** It always contacts Arroway's public gate endpoint, and no environment variable changes that address. With an OAuth connection, the first successful `arroway_read` returns the session tag; the pipe keeps it in the plugin's own data folder and presents it only to that endpoint from then on. That is how the server associates the installed version with the right connection without exposing OAuth credentials, reading a token or key from your environment, or asking you to paste a link. Claude Code and Cursor both use that public address; identity comes from signing in.

**When the server cannot be reached** — no network, a timeout, an answer it does not understand — the tool proceeds and nothing is printed. There is no local copy of the rules: failing open *is* the degradation. After three network failures in a row the pipe stops trying for the rest of the session, so an unreachable server costs you one short wait instead of one per tool call.

Once the gate can no longer block anything in a session, the server says so and the pipe stops talking to the network for the rest of it — except, from version 0.1.46, for the calls the server names: acts that may publish text for other people, and the reply of `arroway_norms`. The server sends that list as plain patterns; the pipe compares names against it and decides nothing.

## The cockpit (from 0.1.47)

The Arroway cockpit shows your agent sessions in one place and lets you send a message to a session that is waiting for you. It stays off until you turn it on in the Arroway panel, and while it is off the pipe sends nothing new.

**What changes when it is on**

* When a turn ends, the pipe tells the server that the session is waiting. It sends the name of the folder (never the path), the model when the client reports one, and the agent's last reply in full — plus, when the closing reminder made the agent continue, the reply that came after it. That text is kept so the cockpit can show it to you, and only to you. It is erased after a short time, when you archive the session, or when you turn the cockpit off.
* When you send a prompt, the pipe says the session is working again. The prompt itself is not sent.
* When the session ends, the pipe says so.

**How a message reaches the agent.** When the server has a reason — a message waiting, or your cockpit open — the stop hook waits a short while for it: up to 90 seconds in Claude Code, up to 10 minutes in Codex and Cursor. The message continues the turn with the prefix "From <your name>, via Arroway:", and a note at the start of each session tells the agent that messages with that prefix come from you. Nothing you type in the window is lost: in Cursor it goes at once, in Codex Esc sends it at once, and in Claude Code it runs when the short wait ends.

**The bell (Claude Code only).** After a turn ends, a background hook waits for messages for up to two hours. When one arrives and nothing is listening, it wakes the session with a request to stop and wait, and the next stop delivers the message. Codex and Cursor have no equivalent, so a message sent after the wait ended reaches the agent at its next stop.

**Approving from the cockpit (from 0.1.48, Claude Code and Codex).** When the agent asks permission to run a tool and your cockpit was open in the last few minutes, the permission hook sends the request to the server: the tool name and the command, or the description the window would show, or only the file name (never the path). It then waits up to 20 seconds for you to allow or deny it in the cockpit. If you answer in time, the window does not ask. If you do not, the window asks as usual. A denial reaches the agent with a short note saying it came from you. The request is kept like the rest of the cockpit's text, and it is never sent while the cockpit is off. Cursor is left out: its hook runs on every shell command, and its "allow" does not skip the question in the window.

**Where it works.** Claude Code (terminal and desktop app), Codex (after you trust the plugin's hooks in `/hooks`), and Cursor's interactive agent. `cursor-agent -p` does not run the stop hook, so those sessions cannot receive messages.

The session note and the bell's words come from the server, like every other word the pipe prints.

## Reading gate and closing reminder

The first mutating file or shell tool in a session is blocked when no `arroway_read` or `arroway_norms` has returned a successful body. If a read is delivered in transport parts, receive every part with `arroway_continue` and confirm the final one with `arroway_complete_read`: a part is not a completed read. Calling a read is not enough: an error, refusal or incomplete part does not release the gate. Read-only shell commands and sessions that only converse or inspect files are not charged.

**The gate asks at most once per session.** Retry the same tool and it proceeds, with a visible note saying the commons was not read. This is deliberate: while the delivered-read marker is right, blocking is a cheap nudge, but when the marker is wrong — a response shape the server does not recognise, or a read the connection envelope refuses and always will — blocking forever leaves a session with no way out, and the only remaining remedy is switching the plugin off. A gate whose failure mode is "uninstall me" protects nothing. Both gates only ever *block* for a session the server can keep state for; without state they observe and stay quiet, because the promise to ask only once is the only thing that makes blocking safe.

Whether a read was delivered is decided by the response carrying text, not by its shape: any serialisation a client uses is unwrapped, and only the explicit error markers say no.

After the first read delivered in a session, the server answers with the standing-norms block of the project that was just read — the block `arroway_norms` returns, dated and without its session checkpoint. The pipe keeps it as it came, in the plugin's private data directory, and reinserts it when a session starts in the same directory: the next session in Claude Code, and the next message of the same conversation in Cowork, which reopens the session at every message. It is a copy, not a read: it can be out of date, and it never unlocks a mutation by itself. The block only travels from the server to your machine; the pipe never sends it back. On a clean install there is no cache yet, so the opening context says that plainly and the first mutation still requires `arroway_read`. Current Codex command hooks cannot invoke an OAuth app tool themselves; when Codex supports MCP-tool hooks, the cache can be replaced by a live SessionStart read without changing the protocol.

## Checking text before publishing

Before an act that publishes text for other people — opening or editing a pull request, commenting on an issue or a pull request, creating a release, a connector call that sends a message or posts a comment — the gate asks once for a check: `arroway_norms` with that text as `draft`, which returns in full what the team decided that the text touches. After the check, the act goes through; the next act of publishing asks for its own. `git push`, merge and deploy are delivery of code, not text for people, and are never asked.

**What it is, and what it is not.** It is a check asked for *per act*, not a guarantee about the text. The server sees the shell command and the tool's name, but not the body of a `--body-file` or a connector's arguments — and the pipe does not send them. So what it can say is "a check happened before this act", never "this exact text was checked".

**It never traps a session.** Retry the same act without checking and it goes through, with a visible note. That release holds only for the same act: being stopped on a pull request and then trying a comment asks again. Like the other gates, it only ever asks where the server can keep state for the session.

In Claude Code, set **"Ask for a text check before publishing"** to off in the plugin's configuration. In Codex CLI, start it with `ARROWAY_ENFORCE_CHECKING=false`. Installs before 0.1.46 are never asked: the skill and the reminder at the end of every read carry the same instruction, without the stop.

## The state of the local clone, said at the opening

Arroway exists so that nobody asserts from memory instead of from the source. The source a coding session reads is not only the commons — it is the git clone it sits in, and a stale clone answers beautifully: the file opens, the grep runs, the tests compile, all about a world that has moved on.

So `SessionStart` also emits a short block, before the norms, when — and only when — there is something to say. Your machine is the only place that can *see* this, so the pipe collects the numbers here; the sentences come from the server, which is what lets them improve without anyone updating anything. What it reports: commits behind the remote (louder past 20, where dependencies and generated clients tend to have moved together), how old that knowledge is, branches holding work that exists in no remote, another directory with the same origin at a different commit, and worktrees pointing at directories that no longer exist. **A clone that is up to date prints nothing.** When the session opens outside a git repository — the multi-repo case, where the working directory is the parent folder — the block examines the repositories one level below instead of falling silent, capped at twelve and saying so when it stops. It also reports the distance to the branch that becomes production, not only to the current branch's own upstream: a feature branch in sync with its own remote measures zero behind and still serves stale files.

It does not fetch. Network on the opening path is paid by every session, including the ones that never touch git — so the block reports what the refs already know and states the age of that knowledge, because "0 commits behind" in a clone that has not fetched for a week gives exactly the wrong impression. Every git call is capped and any failure degrades to silence.

"Work that exists in no remote" is decided by **containment**, measured in content: a branch counts when its tip is reachable from no `origin` ref at all. Upstream configuration decides nothing, because it answers a different question — a branch created in a worktree never gets an upstream, so counting by upstream made the number grow on its own in any workflow that opens a worktree per task, while describing no risk whatsoever. A session reading that number as "work to rescue" would treat a clean clone as a finding, and a warning that fires on clean clones is one people learn to skip.

The measurement is a single `git rev-list --no-walk --branches --not --remotes=origin`. `--no-walk` is what keeps it cheap: without it the command prints every local commit missing from the remote, an unbounded output on every session opening — with it, git returns only the branch tips the exclusion did not reach, one line each. The branch whose remote was deleted (`[gone]`) is still caught, because its tip is still outside every remote ref; what stops firing is the `[gone]` branch whose work was already merged. Two branches sharing one tip count once: that is one piece of work at risk carrying two names.

## The version of this package, said at the opening

Nothing here updates itself. This package freezes on the day you install it, and the way to update it depends on where it runs — which is why an install three versions behind the published one is the normal outcome, not the unlucky one. It happened twice in one week to the person who builds Arroway.

So the server compares what this package declares with what is published, and says so **once, at the opening of the session**: the installed version, the published one, and the path that fits where the plugin is running. In Cowork, and in the Code tab of the Claude app, there is no terminal command — the person updates Arroway on the Plugins screen and continues in a new conversation. In Claude Code on the terminal, the path is two commands (`claude plugin marketplace update arroway`, then `claude plugin update arroway@arroway`) and a restart of the session. Where the client does not name itself, as in Cursor and Codex, the notice gives both paths. It is addressed to the assistant in the session, which runs what that client allows or tells you. Updating writes the new package to disk; the session you are in keeps the snapshot it started with, so the next conversation is the one that picks the new one up.

**An install that is up to date prints nothing**, and neither does one *ahead* of what is published. There is also a floor: below the oldest version the server still considers compatible, the same opening says so in firmer words, because that package carries frozen decisions of its own that no promotion can reach. **Neither one ever blocks anything.** A stale install is worth a sentence, never a locked tool — and the sentence rides the opening precisely so it cannot become a line under every command, which is the failure that makes people switch hooks off.

Set `ARROWAY_ENFORCE_READING=false` to turn off only the first-mutation gate in Codex CLI. Disabling the gate does not remove the skill or the closing reminder.

## Turning the closing reminder off

The closing hook is a nudge, not a policy. In Claude Code, set **"Ask before ending a turn without a record"** to off in the plugin's configuration. In Codex CLI, start it with `ARROWAY_ENFORCE_CLOSING=false`; to disable all Codex hooks globally, set `[features] hooks = false` in the Codex configuration. The skill still teaches the protocol — only the interruption is disabled.

It is deliberately hard to get stuck on: it asks **at most once per turn**, closing your reply with the sentence *No durable residue.* satisfies it in one sentence, and any internal failure lets the turn through rather than blocking it — including a failure to remember that it already asked.

The turn is judged by the server, like everything else, and it travels **once per turn, not once per tool**: the pipe keeps a local list of which tools ran (and the text of shell commands, for the same classification reason as above) and sends it when the turn ends. The last thing that goes with it is the **tail of your assistant's final reply** — the last thousand characters — because the release sentence only counts when it closes the reply, so that is all the server needs to see. The rest of the reply never leaves.

The sentence has to *close* the reply. Quoted in the middle of a paragraph it does not count, so that a turn which merely discusses this rule cannot release itself by mentioning it.

## Uninstall and revoke

Removing the plugin stops the skill and the hooks. It does **not** revoke your access:

```bash
/plugin uninstall arroway@arroway
```

Then revoke the connection itself in the Arroway panel, under Connections. That is what actually kills the credential — revoking there ends both the access and the refresh path.

## Where hooks run

Codex CLI/Desktop and Claude Code discover `hooks/hooks.json` by convention. The manifest must not declare that default file again. ChatGPT Work on the web does not run local command hooks; there the skill and the server's own instructions carry the protocol, non-coercively. The package never assumes a hook is present.

Cowork runs the same hooks as Claude Code, with two differences the pipe accounts for. Its shell tool is called `mcp__workspace__bash`, and it is judged exactly like `Bash`. And Cowork ends the session and resumes it with every message you send, under the same session id. So when a session ends the pipe clears only the turn, which is over, and keeps the session tag from your last read, so the next message does not look like a session that never read. Any file the pipe keeps that goes untouched for two days is removed; the tag it holds is short-lived on the server anyway.

## Maintaining and releasing the package

Every package fix needs a new version. Update the same version in all four release declarations:

- `.claude-plugin/plugin.json` inside this package;
- `.codex-plugin/plugin.json` inside this package;
- `.cursor-plugin/plugin.json` inside this package;
- the `arroway` entry in the repository's `.claude-plugin/marketplace.json`.

The server announces that number as the published version, so it keeps a copy of it in `lib/plugin-version-rules.mjs` and a test fails when the four disagree — a server that announced a version nobody published would send every session chasing an update that does not exist.

The same number also lives in `gemini-extension.json` (the Gemini CLI manifest, published at the root of the public repository) and in the pipe's `PLUGIN_VERSION` (`hooks/arroway-gate.mjs`), and tests fail when either one diverges. The repository's `server.json` carries it as well: the server card reads it, and the MCP registry workflow stamps the plugin's version when it publishes.

Two checks run on every pull request, before anything can merge, and both compare against **what main publishes** rather than against the newest tag:

* the three manifests must name the same plugin and the same version;
* if the installable differs from the published one, the version must be greater. Shipping different content under a published number makes every installed client consider the fix already installed.

```bash
pnpm test                    # includes the three-manifest check
pnpm check:plugin-version    # the bump and tag-continuity gate
```

**Cutting the release tag is not a step any more.** Promoting to `main` publishes — the mirror updates the install repository — and the same push cuts `arroway--v<version>` on its own. `claude plugin tag` is no longer part of the process: it was a manual gesture nobody remembered, and six published versions ended up with no named rollback point because of it. Versions promoted before that workflow existed are listed by the gate as declared debt, and one run of the release workflow with `backfill` cuts every one of them at its own promotion commit.

The command checks the package, refuses a dirty plugin tree, verifies that the plugin manifest and marketplace entry agree, and creates the `{plugin-name}--v{version}` tag. A fix is not released until that tag is pushed; changing files on the marketplace's default branch without changing the version does not update an existing install.

---

## Español

[English](#arroway-plugin) · **Español** · [Português](#português)

[Arroway](https://www.arroway.app/es) coordina a personas y agentes de IA en torno a las decisiones vigentes.

Una instalación en vez de dos pasos. Antes de este paquete, entrar en Arroway significaba añadir el conector **y** pegar a mano una semilla en tu Proyecto o en `CLAUDE.md`. La semilla ahora es la skill, y la skill viaja con el plugin.

El plugin no sustituye al servidor MCP — lo envuelve. El servidor sigue siendo el motor; esto es el empaquetado.

### Qué trae la caja

| Componente | Archivo | Qué hace |
| :--- | :--- | :--- |
| Conexión MCP (Claude) | `.mcp.json` | Conecta Claude Code por HTTP con la dirección de Arroway. La identidad viene de entrar, no de un enlace pegado. |
| Skill | `skills/arroway-workflow/SKILL.md` | Enseña el protocolo: leer → trabajar → normas → cerrar. Los hallazgos se nombran ahí como contexto, nunca como norma; el juicio de qué cuenta como hallazgo sigue viviendo en el servidor, no en este archivo. |
| Hooks | `hooks/hooks.json` | Coincide con todo y entrega cada evento al conducto. Ningún nombre de herramienta queda congelado en el paquete. |
| El conducto | `hooks/arroway-gate.mjs` | El único script que se ejecuta. Observa, le pregunta al servidor, imprime la respuesta y la obedece. No lleva ninguna regla ni redacción propia — mira **Qué sale de tu máquina**, más abajo. |
| Observación local | `hooks/clone-facts.mjs`, `hooks/norms-cache.mjs` | Las dos cosas que solo tu máquina puede ver o guardar: el estado de los clones de git que hay aquí, y las últimas normas entregadas para este directorio. Números y texto, sin juicio. |
| Conexión MCP (OpenAI) | `codex-mcp.json` | Declara el endpoint MCP público de Arroway para que el directorio lo conecte y lo analice directamente. |
| Manifiesto, MCP y hooks (Cursor) | `.cursor-plugin/plugin.json`, `cursor-mcp.json`, `hooks/cursor-hooks.json` | Cursor lee su propio manifiesto y su propio formato de hooks. La misma skill, el mismo conducto, sin fork — y ningún enlace que pegar: la dirección es la de Arroway y la identidad viene de entrar. |

### Instalación — Claude Code

```bash
/plugin marketplace add oaleviola/arroway-plugin
```

```bash
/plugin install arroway@arroway
```

No hay nada que pegar, ni un conector aparte que instalar: el paquete lleva la conexión con la dirección de Arroway.

Si el resumen de la instalación dice `Run /reload-plugins to activate.`, ejecuta eso.

La conexión empieza sin sesión iniciada. Entra una sola vez: ejecuta `/mcp`, elige `plugin:arroway:arroway` y sigue el inicio de sesión en el navegador. Claude Code se registra solo, tú apruebas la conexión en tu propio nombre, y la memoria que se escriba desde entonces lleva tu nombre. Hasta que entres, las herramientas de Arroway no aparecen en la sesión y no se lee ni se registra nada.

Si Arroway ya está conectada a tu cuenta de Claude como conector y sus herramientas ya aparecen en la sesión, puedes saltarte este paso.

Para instalar desde una copia local en vez del repositorio:

```bash
/plugin marketplace add ./arroway-app
```

### Instalación — Codex Desktop / CLI

El manifiesto de Codex apunta a `codex-mcp.json`, que declara el endpoint MCP público de Arroway. El directorio se conecta a ese endpoint, descubre OAuth desde el servidor y lo analiza directamente; el mismo paquete añade la skill y, donde haya soporte, los hooks.

Añade el marketplace público de GitHub e instala el paquete:

```bash
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Abre una tarea nueva después de instalar o actualizar, para que la tarea tome la nueva instantánea del plugin.

Para desarrollo local del paquete, apunta el comando del marketplace a una copia local en vez de al repositorio de GitHub.

La extensión de Codex para el IDE no soporta plugins. Conecta ahí el servidor MCP de Arroway; no esperes que carguen la skill ni los hooks locales.

### Instalación — Cursor

Añade este repositorio como marketplace de plugins en Cursor y luego instala **arroway** desde la lista de plugins.

**No hay nada que pegar.** El paquete de Cursor lleva la dirección de Arroway y te hace entrar por el navegador la primera vez que te necesita: Cursor se registra solo, tú apruebas la conexión en tu propio nombre, y la memoria que tu asistente escriba desde entonces lleva tu nombre. Aquí un enlace de conexión sería peor, no mejor — es una identidad viviendo dentro de un archivo que un repositorio puede llegar a commitear.

Cursor lee un manifiesto distinto del de Claude Code (`.cursor-plugin/plugin.json`) y un formato de hooks distinto (`hooks/cursor-hooks.json`). Los dos viajan en este mismo paquete, sobre la misma skill y el mismo conducto: un paquete, tres clientes, sin fork.

### Conexión — ChatGPT

ChatGPT no exige una segunda instalación manual del paquete después de que registres el servidor MCP remoto. Hasta que el plugin público de Arroway esté aprobado, activa el modo desarrollador, añade la URL del MCP de Arroway y completa el OAuth; ese registro crea el plugin personal dentro de ChatGPT. Después de la aprobación, usa la entrada del directorio público.

El envío de la 1.0.0 ya incluía la skill `arroway-workflow`; fue rechazado por el acceso de quien revisaba, no por el paquete. El paquete actual declara el endpoint MCP remoto directamente, para que el directorio complete la conexión, OAuth y el análisis de herramientas desde el panel de envío.

En un espacio de trabajo corporativo decide quien administra: un plugin está **Disponible** (cada miembro lo instala) o **Instalado** (empujado por defecto). Un miembro no puede añadir un plugin cualquiera sin eso. Es la misma puerta por la que ya pasa el conector.

### Qué sale de tu máquina

La compuerta de lectura la decide el servidor, no el paquete instalado. Eso es lo que permite que un arreglo llegue a todo el mundo en el momento en que se promueve, en vez de solo a quien resulte actualizar — y tiene un precio que no deberías tener que adivinar.

**Qué se envía**, una vez por llamada de herramienta, hasta que la compuerta se resuelve para la sesión:

* el nombre de la herramienta;
* el texto de un comando de shell, y solo de un comando de shell — clasificar shell exige leerlo;
* una clave opaca de sesión, que es el identificador de sesión de tu cliente y nada más — y solo cuando el conducto tiene una credencial que presentar, porque sin ella no hay estado que separar;
* la versión del plugin, el nombre del cliente, y si tienes activado cada uno de los tres interruptores;
* después de que la herramienta corrió: si la respuesta volvió sin error y si traía algún texto — y, en la respuesta de `arroway_norms`, si trae la marca de un borrador revisado: un sí o un no, nunca la respuesta.

**Qué no se envía nunca:** rutas de archivos, el directorio de trabajo, el contenido de los archivos, el contenido de las respuestas. Ni siquiera como huella. La compuerta no los necesita, así que no salen. La única excepción la activas tú: con el cockpit activado, la última respuesta del agente va al cockpit (mira **El cockpit** más abajo).

**El comando de shell se usa para clasificar la llamada y para nada más.** Nunca se escribe en la base de datos, nunca se escribe en un registro, y no sobrevive a la petición que lo llevó. Lo único que la compuerta guarda son seis campos — si se entregó una lectura, si ya pidió una, si ya te pidió cerrar este turno, si se hizo una revisión de texto que aún no se usó, una huella del acto de publicar por el que ya preguntó (un hash corto de herramienta y comando, nunca el comando), y una cuenta de peticiones —, y hay un test que fija esa lista para que no se pueda añadir un séptimo campo sin que alguien lo note. Aparte de ese estado, el recordatorio de cierre deja un registro con fecha dos veces: cuando te pide registrar un turno y cuando deja pasar la parada siguiente. Cada registro lleva tu cuenta, la conexión y una etiqueta corta de la sesión — nada del turno: ni nombre de herramienta, ni comando, ni mensaje. Así sabemos que el recordatorio pide una vez y después suelta. La revisión antes de publicar deja uno cada vez que pide, deja pasar un acto después de una revisión, o deja pasar una repetición sin ella. Aun así, mantén los secretos fuera de la línea de comandos: la compuerta no es lo único que la ve.

**De quién es el estado.** La compuerta le responde a cualquiera, pero solo *recuerda* para una cuenta autenticada. Sin credencial no lee nada y no escribe nada, y la respuesta es siempre la misma. La credencial es una etiqueta de sesión de vida corta que el servidor de Arroway emite dentro de la primera lectura de la memoria común; queda atada a la primera sesión que la presenta y caduca en unas horas.

**La compuerta no lee ninguna credencial de tu máquina.** Siempre contacta con el endpoint público de la compuerta de Arroway, y ninguna variable de entorno cambia esa dirección. Con una conexión OAuth, el primer `arroway_read` exitoso devuelve la etiqueta de sesión; el conducto la guarda en la carpeta de datos del propio plugin y desde entonces solo se la presenta a ese endpoint. Así el servidor asocia la versión instalada con la conexión correcta sin exponer credenciales OAuth, sin leer un token o una clave de tu entorno y sin pedirte que pegues un enlace. Claude Code y Cursor usan esa dirección pública; la identidad viene de entrar.

**Cuando no se puede alcanzar el servidor** — sin red, un tiempo agotado, una respuesta que no entiende — la herramienta sigue adelante y no se imprime nada. No hay copia local de las reglas: fallar abierto *es* la degradación. Tras tres fallos de red seguidos el conducto deja de intentarlo durante el resto de la sesión, así que un servidor inalcanzable te cuesta una espera corta en vez de una por cada llamada.

Cuando la compuerta ya no puede bloquear nada en una sesión, el servidor lo dice y el conducto deja de hablar con la red durante el resto de ella — salvo, desde la versión 0.1.46, por las llamadas que el servidor nombra: actos que pueden publicar texto para otras personas, y la respuesta de `arroway_norms`. El servidor manda esa lista como patrones simples; el conducto compara nombres con ella y no decide nada.

### El cockpit (desde la 0.1.47)

El cockpit de Arroway muestra tus sesiones de agente en un solo lugar y te deja enviar un mensaje a una sesión que te está esperando. Está apagado hasta que lo actives en el panel de Arroway, y apagado el conducto no envía nada nuevo.

**Qué cambia cuando está activado**

* Cuando termina un turno, el conducto le avisa al servidor que la sesión está esperando. Envía el nombre de la carpeta (nunca la ruta), el modelo cuando el cliente lo informa, y la última respuesta del agente completa — y, cuando el recordatorio de cierre hizo que el agente siguiera, también la respuesta que vino después. Ese texto se guarda para que el cockpit te lo muestre, solo a ti. Se borra al poco tiempo, cuando archivas la sesión o cuando desactivas el cockpit.
* Cuando envías un prompt, el conducto avisa que la sesión volvió a trabajar. El prompt en sí no se envía.
* Cuando la sesión termina, el conducto lo avisa.

**Cómo le llega un mensaje al agente.** Cuando el servidor tiene un motivo — un mensaje esperando, o tu cockpit abierto —, el hook de parada espera un rato por él: hasta 90 segundos en Claude Code, hasta 10 minutos en Codex y Cursor. El mensaje continúa el turno con el prefijo "From <tu nombre>, via Arroway:", y un aviso al inicio de cada sesión le dice al agente que los mensajes con ese prefijo vienen de ti. Nada de lo que escribas en la ventana se pierde: en Cursor sale enseguida, en Codex Esc lo envía enseguida, y en Claude Code corre cuando termina la espera corta.

**El timbre (solo Claude Code).** Cuando termina un turno, un hook en segundo plano espera mensajes hasta dos horas. Cuando llega uno y nada está escuchando, despierta la sesión con un pedido de parar y esperar, y la parada siguiente entrega el mensaje. Codex y Cursor no tienen equivalente, así que un mensaje enviado después de que terminó la espera le llega al agente en su próxima parada.

**Aprobar desde el cockpit (desde la 0.1.48, Claude Code y Codex).** Cuando el agente pide permiso para usar una herramienta y tu cockpit estuvo abierto en los últimos minutos, el hook de permiso envía el pedido al servidor: el nombre de la herramienta y el comando, o la descripción que mostraría la ventana, o solo el nombre del archivo (nunca la ruta). Luego espera hasta 20 segundos a que lo permitas o lo deniegues en el cockpit. Si respondes a tiempo, la ventana no pregunta. Si no, la ventana pregunta como siempre. Una denegación le llega al agente con una nota corta que dice que vino de ti. El pedido se guarda como el resto del texto del cockpit, y nunca se envía con el cockpit desactivado. Cursor queda fuera: su hook corre en cada comando de shell, y su "allow" no evita la pregunta en la ventana.

**Dónde funciona.** Claude Code (terminal y app de escritorio), Codex (después de que confías en los hooks del plugin en `/hooks`) y el agente interactivo de Cursor. `cursor-agent -p` no corre el hook de parada, así que esas sesiones no reciben mensajes.

El aviso de la sesión y las palabras del timbre vienen del servidor, como cada palabra que imprime el conducto.

### Compuerta de lectura y recordatorio de cierre

La primera herramienta de archivo o de shell que muta algo en una sesión se bloquea cuando ningún `arroway_read` ni `arroway_norms` ha devuelto un cuerpo exitoso. Si una lectura se entrega en partes de transporte, recibe todas las partes con `arroway_continue` y confirma la última con `arroway_complete_read`: una parte no es una lectura completa. Llamar a una lectura no basta: un error, una negativa o una parte incompleta no libera la compuerta. Los comandos de shell de solo lectura y las sesiones que únicamente conversan o inspeccionan archivos no se cobran.

**La compuerta pregunta como mucho una vez por sesión.** Reintenta la misma herramienta y sigue adelante, con una nota visible que dice que no se leyó la memoria común. Es deliberado: mientras la marca de lectura entregada sea correcta, bloquear es un empujón barato, pero cuando la marca está equivocada — una forma de respuesta que el servidor no reconoce, o una lectura que el sobre de la conexión rechaza y siempre va a rechazar — bloquear para siempre deja la sesión sin salida, y el único remedio que queda es apagar el plugin. Una compuerta cuyo modo de fallo es "desinstálame" no protege nada. Las dos compuertas solo *bloquean* en una sesión para la que el servidor puede guardar estado; sin estado observan y se quedan calladas, porque la promesa de preguntar una sola vez es lo único que hace que bloquear sea seguro.

Que una lectura se haya entregado lo decide la respuesta al traer texto, no su forma: cualquier serialización que use un cliente se desenvuelve, y solo los marcadores explícitos de error dicen que no.

Después de la primera lectura entregada en una sesión, el servidor responde con el bloque de normas vigentes del proyecto que se acaba de leer — el bloque que devuelve `arroway_norms`, con fecha y sin su sello de sesión. El conducto lo guarda tal como llegó, en el directorio de datos privado del plugin, y lo reinserta cuando una sesión empieza en el mismo directorio: la siguiente sesión en Claude Code, y el siguiente mensaje de la misma conversación en Cowork, que reabre la sesión a cada mensaje. Es una copia, no una lectura: puede estar desactualizada y nunca desbloquea una mutación por sí sola. El bloque solo viaja del servidor a tu máquina; el conducto nunca lo devuelve. En una instalación limpia todavía no hay caché, así que el contexto de apertura lo dice con claridad y la primera mutación sigue exigiendo `arroway_read`. Los hooks de comando actuales de Codex no pueden invocar por sí mismos una herramienta de app OAuth; cuando Codex soporte hooks de herramienta MCP, el caché se puede sustituir por una lectura en vivo en `SessionStart` sin cambiar el protocolo.

### Revisar el texto antes de publicar

Antes de un acto que publica texto para otras personas — abrir o editar un pull request, comentar en un issue o un pull request, crear un release, una llamada de conector que manda un mensaje o publica un comentario — la compuerta pide una vez una revisión: `arroway_norms` con ese texto como `draft`, que devuelve completo lo que el equipo decidió y el texto toca. Después de la revisión, el acto pasa; el siguiente acto de publicar pide la suya. `git push`, merge y deploy son entrega de código, no texto para personas, y nunca se piden.

**Qué es, y qué no es.** Es una revisión pedida *por acto*, no una garantía sobre el texto. El servidor ve el comando de shell y el nombre de la herramienta, pero no el cuerpo de un `--body-file` ni los argumentos de un conector — y el conducto no los manda. Así que lo que puede decir es "hubo una revisión antes de este acto", nunca "este texto exacto fue revisado".

**Nunca deja una sesión atascada.** Reintenta el mismo acto sin revisar y pasa, con una nota visible. Esa liberación vale solo para el mismo acto: frenado en un pull request, intentar después un comentario pide de nuevo. Como las otras compuertas, solo pide donde el servidor puede guardar estado para la sesión.

En Claude Code, pon **"Ask for a text check before publishing"** en off, en la configuración del plugin. En Codex CLI, arráncalo con `ARROWAY_ENFORCE_CHECKING=false`. Las instalaciones anteriores a la 0.1.46 nunca reciben el pedido: la skill y el recordatorio al final de cada lectura llevan la misma instrucción, sin el freno.

### El estado del clon local, dicho en la apertura

Arroway existe para que nadie afirme de memoria en vez de afirmar desde la fuente. La fuente que lee una sesión de código no es solo la memoria común — es el clon de git en el que está sentada, y un clon desactualizado responde precioso: el archivo abre, el grep corre, los tests compilan, todo sobre un mundo que ya se movió.

Por eso `SessionStart` emite también un bloque corto, antes de las normas, cuando — y solo cuando — hay algo que decir. Tu máquina es el único sitio que puede *ver* esto, así que el conducto recoge aquí los números; las frases vienen del servidor, que es lo que permite que mejoren sin que nadie actualice nada. Qué reporta: commits por detrás del remoto (más alto cuando pasa de 20, donde las dependencias y los clientes generados suelen haberse movido juntos), qué antigüedad tiene ese conocimiento, ramas que sostienen trabajo que no existe en ningún remoto, otro directorio con el mismo origen en otro commit, y worktrees apuntando a directorios que ya no existen. **Un clon al día no imprime nada.** Cuando la sesión abre fuera de un repositorio de git — el caso multi-repo, donde el directorio de trabajo es la carpeta madre —, el bloque examina los repositorios del nivel de abajo en vez de quedarse callado, con un tope de doce y diciéndolo cuando para. También reporta la distancia hasta la rama que se convierte en producción, no solo hasta el upstream de la rama actual: una rama de trabajo sincronizada con su propio remoto mide cero por detrás y aun así sirve archivos viejos.

No hace fetch. La red en el camino de apertura la paga cada sesión, incluidas las que nunca tocan git — así que el bloque reporta lo que las refs ya saben y declara la antigüedad de ese conocimiento, porque "0 commits por detrás" en un clon que no hace fetch desde hace una semana da exactamente la impresión contraria. Cada llamada a git tiene tope y cualquier fallo degrada a silencio.

"Trabajo que no existe en ningún remoto" lo decide la **contención**, medida en contenido: una rama cuenta cuando su punta no es alcanzable desde ninguna ref de `origin`. La configuración de upstream no decide nada, porque responde a otra pregunta — una rama creada en un worktree nunca recibe upstream, así que contar por upstream hacía crecer el número solo, en cualquier flujo que abra un worktree por tarea, sin describir riesgo alguno. Una sesión que leyera ese número como "trabajo que rescatar" trataría un clon limpio como un hallazgo, y un aviso que salta en clones limpios es de los que la gente aprende a saltarse.

La medición es un único `git rev-list --no-walk --branches --not --remotes=origin`. `--no-walk` es lo que la mantiene barata: sin él, el comando imprime cada commit local que falta en el remoto, una salida sin límite en cada apertura de sesión — con él, git devuelve solo las puntas de rama que la exclusión no alcanzó, una línea cada una. La rama cuyo remoto se borró (`[gone]`) se sigue atrapando, porque su punta sigue estando fuera de toda ref remota; lo que deja de saltar es la rama `[gone]` cuyo trabajo ya se mezcló. Dos ramas que comparten una punta cuentan una vez: eso es un solo trabajo en riesgo llevando dos nombres.

### La versión de este paquete, dicha en la apertura

Aquí nada se actualiza solo. Este paquete se congela el día que lo instalas, y la forma de actualizarlo depende de dónde corre — por lo que una instalación tres versiones por detrás de la publicada es el resultado normal, no el desafortunado. Le pasó dos veces en una semana a la persona que construye Arroway.

Así que el servidor compara lo que este paquete declara con lo que está publicado, y lo dice **una vez, en la apertura de la sesión**: la versión instalada, la publicada, y el camino que corresponde a donde corre el plugin. En Cowork, y en la pestaña Code de la app de Claude, no hay comando de terminal: la persona actualiza Arroway en la pantalla de Plugins y sigue en una conversación nueva. En Claude Code en la terminal, el camino son dos comandos (`claude plugin marketplace update arroway` y después `claude plugin update arroway@arroway`) y reiniciar la sesión. Cuando el cliente no dice su nombre, como Cursor y Codex, el aviso da los dos caminos. Va dirigido al asistente que está en la sesión, que ejecuta lo que ese cliente permite o te lo cuenta. Actualizar escribe el paquete nuevo en disco; la sesión en la que estás conserva la instantánea con la que empezó, así que la conversación siguiente es la que toma el paquete nuevo.

**Una instalación al día no imprime nada**, y tampoco una que vaya *por delante* de lo publicado. Hay además un suelo: por debajo de la versión más antigua que el servidor sigue considerando compatible, esa misma apertura lo dice con palabras más firmes, porque ese paquete lleva decisiones congeladas propias a las que ninguna promoción llega. **Ninguna de las dos bloquea nunca nada.** Una instalación vieja merece una frase, nunca una herramienta bloqueada — y la frase viaja en la apertura precisamente para que no pueda convertirse en una línea debajo de cada comando, que es el fallo que hace que la gente apague los hooks.

Pon `ARROWAY_ENFORCE_READING=false` para apagar solo la compuerta de primera mutación en Codex CLI. Desactivar la compuerta no quita la skill ni el recordatorio de cierre.

### Apagar el recordatorio de cierre

El hook de cierre es un empujón, no una política. En Claude Code, pon **"Ask before ending a turn without a record"** en off, en la configuración del plugin. En Codex CLI, arráncalo con `ARROWAY_ENFORCE_CLOSING=false`; para desactivar todos los hooks de Codex globalmente, pon `[features] hooks = false` en la configuración de Codex. La skill sigue enseñando el protocolo — lo único desactivado es la interrupción.

Es deliberadamente difícil quedarse atascado en él: pregunta **como mucho una vez por turno**, cerrar tu respuesta con la frase *No durable residue.* lo satisface en una sola frase, y cualquier fallo interno deja pasar el turno en vez de bloquearlo — incluido un fallo al recordar que ya preguntó.

El turno lo juzga el servidor, como todo lo demás, y viaja **una vez por turno, no una por herramienta**: el conducto guarda una lista local de qué herramientas corrieron (y el texto de los comandos de shell, por la misma razón de clasificación de arriba) y la envía cuando el turno termina. Lo último que va con ella es la **cola de la respuesta final de tu asistente** — los últimos mil caracteres —, porque la frase de liberación solo cuenta cuando cierra la respuesta, así que eso es todo lo que el servidor necesita ver. El resto de la respuesta no sale nunca.

La frase tiene que *cerrar* la respuesta. Citada en medio de un párrafo no cuenta, para que un turno que simplemente discuta esta regla no pueda liberarse a sí mismo mencionándola.

### Desinstalar y revocar

Quitar el plugin detiene la skill y los hooks. **No** revoca tu acceso:

```bash
/plugin uninstall arroway@arroway
```

Después revoca la conexión en el panel de Arroway, en Conexiones. Eso es lo que de verdad mata la credencial — revocar ahí termina tanto el acceso como la vía de renovación.

### Dónde corren los hooks

Codex CLI/Desktop y Claude Code descubren `hooks/hooks.json` por convención. El manifiesto no debe declarar ese archivo por defecto otra vez. ChatGPT Work en la web no ejecuta hooks de comando locales; allí la skill y las propias instrucciones del servidor llevan el protocolo, sin coerción. El paquete nunca da por hecho que haya un hook presente.

Cowork ejecuta los mismos hooks que Claude Code, con dos diferencias que el conducto tiene en cuenta. Su herramienta de shell se llama `mcp__workspace__bash`, y se juzga exactamente igual que `Bash`. Y Cowork termina la sesión y la reanuda con cada mensaje que envías, con el mismo identificador de sesión. Por eso, cuando una sesión termina, el conducto borra solo el turno, que ya acabó, y conserva la etiqueta de sesión de tu última lectura, para que el mensaje siguiente no parezca una sesión que nunca leyó. Cualquier archivo que el conducto guarda y que pasa dos días sin tocarse se borra; la etiqueta que contiene vive poco en el servidor de todos modos.

### Mantener y publicar el paquete

Cada arreglo del paquete necesita una versión nueva. Actualiza la misma versión en las cuatro declaraciones de publicación:

- `.claude-plugin/plugin.json`, dentro de este paquete;
- `.codex-plugin/plugin.json`, dentro de este paquete;
- `.cursor-plugin/plugin.json`, dentro de este paquete;
- la entrada `arroway` en el `.claude-plugin/marketplace.json` del repositorio.

El servidor anuncia ese número como la versión publicada, así que guarda una copia en `lib/plugin-version-rules.mjs` y un test falla cuando las cuatro no coinciden — un servidor que anunciara una versión que nadie publicó mandaría a cada sesión a perseguir una actualización que no existe.

El mismo número vive también en `gemini-extension.json` (el manifiesto de Gemini CLI, publicado en la raíz del repositorio público) y en el `PLUGIN_VERSION` del conducto (`hooks/arroway-gate.mjs`), y hay tests que fallan cuando cualquiera de los dos diverge. El `server.json` del repositorio también lo lleva: la tarjeta del servidor lo lee, y el workflow del registro de MCP estampa la versión del plugin al publicar.

Dos comprobaciones corren en cada pull request, antes de que nada pueda mezclarse, y las dos comparan contra **lo que publica main**, no contra la etiqueta más nueva:

* los tres manifiestos tienen que nombrar el mismo plugin y la misma versión;
* si lo instalable difiere de lo publicado, la versión tiene que ser mayor. Enviar contenido distinto bajo un número ya publicado hace que cada cliente instalado dé el arreglo por instalado.

```bash
pnpm test                    # incluye la comprobación de los tres manifiestos
pnpm check:plugin-version    # la compuerta de subida de versión y continuidad de etiquetas
```

**Cortar la etiqueta de publicación ya no es un paso.** Promover a `main` publica — el espejo actualiza el repositorio de instalación — y ese mismo push corta `arroway--v<version>` por su cuenta. `claude plugin tag` ya no forma parte del proceso: era un gesto manual que nadie recordaba, y por eso seis versiones publicadas se quedaron sin punto de vuelta atrás con nombre. Las versiones promovidas antes de que ese workflow existiera las lista la compuerta como deuda declarada, y una sola ejecución del workflow de publicación con `backfill` las corta todas, cada una en su propio commit de promoción.

El comando revisa el paquete, rechaza un árbol de plugin sucio, verifica que el manifiesto del plugin y la entrada del marketplace coincidan, y crea la etiqueta `{plugin-name}--v{version}`. Un arreglo no está publicado hasta que esa etiqueta se empuja; cambiar archivos en la rama por defecto del marketplace sin cambiar la versión no actualiza una instalación existente.

---

## Português

[English](#arroway-plugin) · [Español](#español) · **Português**

A [Arroway](https://www.arroway.app/pt-BR) coordena pessoas e agentes de IA em torno das decisões que estão valendo.

Uma instalação em vez de dois passos. Antes deste pacote, entrar na Arroway significava adicionar o conector **e** colar uma semente à mão no seu Projeto ou no `CLAUDE.md`. A semente agora é a skill, e a skill viaja junto com o plugin.

O plugin não substitui o servidor MCP — ele o embrulha. O servidor continua sendo o motor; isto aqui é a embalagem.

### O que vem na caixa

| Componente | Arquivo | O que faz |
| :--- | :--- | :--- |
| Conexão MCP (Claude) | `.mcp.json` | Conecta o Claude Code por HTTP ao endereço da própria Arroway. A identidade vem de entrar, não de um link colado. |
| Skill | `skills/arroway-workflow/SKILL.md` | Ensina o protocolo: ler → trabalhar → normas → fechar. As constatações são nomeadas ali como contexto, nunca como norma; o julgamento do que conta como constatação continua morando no servidor, não neste arquivo. |
| Hooks | `hooks/hooks.json` | Casa com tudo e entrega cada evento ao cano. Nenhum nome de ferramenta fica congelado no pacote. |
| O cano | `hooks/arroway-gate.mjs` | O único script que roda. Ele observa, pergunta ao servidor, imprime a resposta e obedece. Não carrega regra nenhuma nem texto próprio — veja **O que sai da sua máquina**, mais abaixo. |
| Observação local | `hooks/clone-facts.mjs`, `hooks/norms-cache.mjs` | As duas coisas que só a sua máquina consegue ver ou guardar: o estado dos clones de git que existem aqui, e as últimas normas entregues para este diretório. Números e texto, sem julgamento. |
| Conexão MCP (OpenAI) | `codex-mcp.json` | Declara o endpoint MCP público da Arroway para que o diretório o conecte e o examine diretamente. |
| Manifesto, MCP e hooks (Cursor) | `.cursor-plugin/plugin.json`, `cursor-mcp.json`, `hooks/cursor-hooks.json` | O Cursor lê manifesto próprio e formato de hooks próprio. A mesma skill, o mesmo cano, sem fork — e nenhum link para colar: o endereço é o da própria Arroway e a identidade vem de entrar. |

### Instalação — Claude Code

```bash
/plugin marketplace add oaleviola/arroway-plugin
```

```bash
/plugin install arroway@arroway
```

Nada para colar, e nenhum conector separado para instalar: o pacote já traz a conexão com o endereço da própria Arroway.

Se o resumo da instalação disser `Run /reload-plugins to activate.`, rode isso.

A conexão começa sem login. Entre uma vez só: rode `/mcp`, escolha `plugin:arroway:arroway` e siga o login no navegador. O Claude Code se registra sozinho, você aprova a conexão em seu próprio nome, e a memória escrita dali em diante leva o seu nome. Enquanto você não entrar, as ferramentas da Arroway não aparecem na sessão e nada é lido nem registrado.

Se a Arroway já está conectada à sua conta do Claude como conector e as ferramentas dela já aparecem na sessão, você pode pular este passo.

Para instalar a partir de uma cópia local em vez do repositório:

```bash
/plugin marketplace add ./arroway-app
```

### Instalação — Codex Desktop / CLI

O manifesto do Codex aponta para o `codex-mcp.json`, que declara o endpoint MCP público da Arroway. O diretório conecta esse endpoint, descobre o OAuth no próprio servidor e o examina diretamente; o mesmo pacote acrescenta a skill e, onde houver suporte, os hooks.

Adicione o marketplace público do GitHub e instale o pacote:

```bash
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Abra uma tarefa nova depois de instalar ou atualizar, para a tarefa pegar a nova fotografia do plugin.

Para desenvolvimento local do pacote, aponte o comando do marketplace para uma cópia local em vez do repositório do GitHub.

A extensão do Codex para o IDE não suporta plugins. Conecte ali o servidor MCP da Arroway; não espere que a skill nem os hooks locais carreguem.

### Instalação — Cursor

Adicione este repositório como marketplace de plugins no Cursor e depois instale o **arroway** pela lista de plugins.

**Nada para colar.** O pacote do Cursor carrega o endereço da própria Arroway e faz você entrar pelo navegador na primeira vez que precisa: o Cursor se registra sozinho, você aprova a conexão em seu próprio nome, e a memória que seu assistente escrever dali em diante leva o seu nome. Aqui um link de conexão seria pior, não melhor — é uma identidade morando dentro de um arquivo que um repositório pode acabar commitando.

O Cursor lê um manifesto diferente do Claude Code (`.cursor-plugin/plugin.json`) e um formato de hooks diferente (`hooks/cursor-hooks.json`). Os dois viajam neste mesmo pacote, sobre a mesma skill e o mesmo cano: um pacote, três clientes, sem fork.

### Conexão — ChatGPT

O ChatGPT não exige uma segunda instalação manual do pacote depois que você registra o servidor MCP remoto. Até o plugin público da Arroway ser aprovado, ative o modo desenvolvedor, adicione a URL do MCP da Arroway e complete o OAuth; esse registro cria o plugin pessoal dentro do ChatGPT. Depois da aprovação, use a entrada do diretório público.

O envio da 1.0.0 já incluía a skill `arroway-workflow`; foi recusado por causa do acesso de quem revisava, não do pacote. O pacote atual declara o endpoint MCP remoto diretamente, para que o diretório complete a conexão, o OAuth e o exame das ferramentas pelo painel de submissão.

Num espaço de trabalho corporativo quem decide é quem administra: um plugin fica **Disponível** (cada pessoa instala) ou **Instalado** (empurrado por padrão). Uma pessoa do time não consegue adicionar um plugin qualquer sem isso. É o mesmo portão pelo qual o conector já passa.

### O que sai da sua máquina

Quem decide o portão de leitura é o servidor, não o pacote instalado. É isso que faz um conserto alcançar todo mundo no momento em que é promovido, em vez de alcançar só quem por acaso atualizou — e tem um preço que você não deveria ter que adivinhar.

**O que é enviado**, uma vez por chamada de ferramenta, até o portão se resolver para a sessão:

* o nome da ferramenta;
* o texto de um comando de shell, e só de um comando de shell — classificar shell exige ler o comando;
* uma chave opaca de sessão, que é o identificador de sessão do seu cliente e nada mais — e só quando o cano tem uma credencial para apresentar, porque sem ela não há estado a separar;
* a versão do plugin, o nome do cliente, e se você está com cada um dos três interruptores ligado;
* depois que a ferramenta rodou: se a resposta voltou sem erro e se ela trazia algum texto — e, na resposta do `arroway_norms`, se ela traz a marca de rascunho conferido: um sim ou um não, nunca a resposta.

**O que nunca é enviado:** caminho de arquivo, o diretório de trabalho, conteúdo de arquivo, conteúdo de resposta. Nem como impressão digital. O portão não precisa disso, então isso não sai. A única exceção é você quem liga: com o cockpit ligado, a última resposta do agente vai para o cockpit (veja **O cockpit** abaixo).

**O comando de shell é usado para classificar a chamada e para mais nada.** Nunca é escrito no banco, nunca é escrito em log, e não sobrevive à requisição que o carregou. A única coisa que o portão guarda são seis campos — se uma leitura foi entregue, se ele já pediu uma, se ele já pediu para você fechar este turno, se uma conferência de texto foi feita e ainda não foi usada, uma impressão digital do ato de publicar que ele já cobrou (um hash curto de ferramenta e comando, nunca o comando), e uma contagem de requisições —, e existe um teste que trava essa lista para que um sétimo campo não entre sem alguém perceber. Fora esse estado, o lembrete de fechamento deixa um registro com data em dois momentos: quando pede para você registrar o turno e quando deixa a parada seguinte passar. A conferência antes de publicar deixa um a cada vez que cobra, que deixa um ato passar depois da conferência, ou que deixa uma repetição passar sem ela. Cada registro guarda a sua conta, a conexão e uma etiqueta curta da sessão — nada do turno: nem nome de ferramenta, nem comando, nem mensagem. É por ele que se sabe que o lembrete pede uma vez e depois solta. Mantenha segredo fora da linha de comando mesmo assim: o portão não é a única coisa que a enxerga.

**De quem é o estado.** O portão responde a qualquer um, mas só *lembra* de uma conta autenticada. Sem credencial ele não lê nada e não escreve nada, e a resposta é sempre a mesma. A credencial é uma etiqueta de sessão de vida curta que o servidor da Arroway emite dentro da primeira leitura da memória comum; ela se prende à primeira sessão que a apresenta e expira em poucas horas.

**O portão não lê credencial nenhuma da sua máquina.** Ele sempre procura o endpoint público do portão da Arroway, e nenhuma variável de ambiente muda esse endereço. Com conexão OAuth, o primeiro `arroway_read` bem-sucedido devolve a etiqueta de sessão; o cano a guarda na pasta de dados do próprio plugin e dali em diante só a apresenta a esse endpoint. É assim que o servidor associa a versão instalada à conexão certa sem expor credencial OAuth, sem ler token ou chave do seu ambiente e sem pedir que você cole um link. Claude Code e Cursor usam esse endereço público; a identidade vem de entrar.

**Quando o servidor não pode ser alcançado** — sem rede, tempo esgotado, uma resposta que ele não entende — a ferramenta segue e nada é impresso. Não existe cópia local das regras: falhar aberto *é* a degradação. Depois de três falhas de rede seguidas o cano para de tentar pelo resto da sessão, então um servidor inalcançável custa uma espera curta em vez de uma por chamada de ferramenta.

Quando o portão já não pode bloquear nada numa sessão, o servidor diz isso e o cano para de falar com a rede pelo resto dela — exceto, a partir da versão 0.1.46, pelas chamadas que o servidor nomeia: atos que podem publicar texto para outras pessoas, e a resposta do `arroway_norms`. O servidor manda essa lista como padrões simples; o cano compara nomes com ela e não decide nada.

### O cockpit (desde a 0.1.47)

O cockpit da Arroway mostra suas sessões de agente num lugar só e deixa você mandar mensagem para uma sessão que está esperando por você. Ele fica desligado até você ligá-lo no painel da Arroway, e desligado o cano não manda nada novo.

**O que muda com ele ligado**

* Quando um turno termina, o cano avisa o servidor que a sessão está esperando. Ele manda o nome da pasta (nunca o caminho), o modelo quando o cliente informa, e a última resposta do agente inteira — e, quando o lembrete de fechamento fez o agente continuar, também a resposta que veio depois. Esse texto é guardado para o cockpit mostrar a você, e só a você. Ele é apagado depois de pouco tempo, quando você arquiva a sessão ou quando desliga o cockpit.
* Quando você manda um prompt, o cano avisa que a sessão voltou a trabalhar. O prompt em si não é enviado.
* Quando a sessão termina, o cano avisa.

**Como a mensagem chega ao agente.** Quando o servidor tem motivo — uma mensagem esperando, ou o seu cockpit aberto —, o gancho de parada espera um pouco por ela: até 90 segundos no Claude Code, até 10 minutos no Codex e no Cursor. A mensagem continua o turno com o prefixo "From <seu nome>, via Arroway:", e um aviso na abertura de cada sessão diz ao agente que mensagens com esse prefixo vêm de você. Nada do que você digita na janela se perde: no Cursor vai na hora, no Codex o Esc manda na hora, e no Claude Code roda quando a espera curta acaba.

**A campainha (só no Claude Code).** Depois que um turno termina, um gancho em segundo plano espera mensagens por até duas horas. Quando chega uma e nada está escutando, ele acorda a sessão com um pedido de parar e esperar, e a parada seguinte entrega a mensagem. O Codex e o Cursor não têm equivalente: mensagem enviada depois que a espera acabou chega ao agente na parada seguinte dele.

**Aprovar pelo cockpit (desde a 0.1.48, Claude Code e Codex).** Quando o agente pede permissão para usar uma ferramenta e o seu cockpit esteve aberto nos últimos minutos, o gancho de permissão manda o pedido ao servidor: o nome da ferramenta e o comando, ou a descrição que a janela mostraria, ou só o nome do arquivo (nunca o caminho). Depois espera até 20 segundos você permitir ou negar no cockpit. Se você responde a tempo, a janela não pergunta. Se não, a janela pergunta como sempre. A negação chega ao agente com um aviso curto de que veio de você. O pedido é guardado como o resto do texto do cockpit, e nunca sai com o cockpit desligado. O Cursor fica de fora: o gancho dele roda em todo comando de shell, e o "allow" dele não dispensa a pergunta na janela.

**Onde funciona.** Claude Code (terminal e app), Codex (depois que você confia nos ganchos do plugin em `/hooks`) e o agente interativo do Cursor. O `cursor-agent -p` não roda o gancho de parada, então essas sessões não recebem mensagem.

O aviso da sessão e as palavras da campainha vêm do servidor, como toda palavra que o cano imprime.

### Portão de leitura e lembrete de fechamento

A primeira ferramenta de arquivo ou de shell que muta alguma coisa numa sessão é bloqueada quando nenhum `arroway_read` ou `arroway_norms` devolveu um corpo bem-sucedido. Se uma leitura for entregue em partes de transporte, receba todas as partes com `arroway_continue` e confirme a última com `arroway_complete_read`: uma parte não é uma leitura completa. Chamar uma leitura não basta: erro, recusa ou parte incompleta não libera o portão. Comando de shell somente de leitura e sessão que só conversa ou inspeciona arquivo não são cobrados.

**O portão pede no máximo uma vez por sessão.** Tente a mesma ferramenta de novo e ela segue, com uma nota visível dizendo que a memória comum não foi lida. Isso é deliberado: enquanto a marca de leitura entregue estiver certa, bloquear é um empurrão barato, mas quando a marca está errada — uma forma de resposta que o servidor não reconhece, ou uma leitura que o envelope da conexão recusa e vai recusar sempre — bloquear para sempre deixa a sessão sem saída, e o único remédio que sobra é desligar o plugin. Um portão cujo modo de falha é "me desinstale" não protege nada. Os dois portões só *bloqueiam* numa sessão para a qual o servidor consegue guardar estado; sem estado eles observam e ficam calados, porque a promessa de pedir uma vez só é a única coisa que torna bloquear seguro.

Se uma leitura foi entregue, quem decide é a resposta ter trazido texto, não o formato dela: qualquer serialização que um cliente use é desembrulhada, e só os marcadores explícitos de erro dizem que não.

Depois da primeira leitura entregue numa sessão, o servidor responde com o bloco de normas vigentes do projeto que acabou de ser lido — o bloco que o `arroway_norms` devolve, com data e sem o carimbo de sessão. O cano o guarda como veio, no diretório de dados privado do plugin, e o reinsere quando uma sessão começa no mesmo diretório: a próxima sessão no Claude Code, e a próxima mensagem da mesma conversa no Cowork, que reabre a sessão a cada mensagem. É uma cópia, não uma leitura: pode estar desatualizada e nunca libera uma mutação sozinha. O bloco só viaja do servidor para a sua máquina; o cano nunca o manda de volta. Numa instalação limpa ainda não existe cache, então o contexto de abertura diz isso com todas as letras e a primeira mutação continua exigindo `arroway_read`. Os hooks de comando atuais do Codex não conseguem invocar sozinhos uma ferramenta de app OAuth; quando o Codex suportar hooks de ferramenta MCP, o cache pode ser substituído por uma leitura ao vivo no `SessionStart` sem mudar o protocolo.

### Conferir o texto antes de publicar

Antes de um ato que publica texto para outras pessoas — abrir ou editar um pull request, comentar numa issue ou num pull request, criar um release, uma chamada de conector que manda mensagem ou publica comentário — o portão pede uma conferência, uma vez: `arroway_norms` com esse texto em `draft`, que devolve inteiro o que o time decidiu e o texto toca. Depois da conferência, o ato passa; o próximo ato de publicar pede a dele. `git push`, merge e deploy são entrega de código, não texto para pessoas, e nunca são cobrados.

**O que é, e o que não é.** É uma conferência cobrada *por ato*, não uma garantia sobre o texto. O servidor vê o comando de shell e o nome da ferramenta, mas não o corpo de um `--body-file` nem os argumentos de um conector — e o cano não os manda. Então o que ele pode dizer é "houve uma conferência antes deste ato", nunca "este texto exato foi conferido".

**Nunca prende a sessão.** Tente o mesmo ato de novo sem conferir e ele passa, com uma nota visível. Essa liberação vale só para o mesmo ato: barrado num pull request, tentar depois um comentário cobra de novo. Como os outros portões, ele só cobra onde o servidor consegue guardar estado da sessão.

No Claude Code, ponha **"Ask for a text check before publishing"** em off, na configuração do plugin. No Codex CLI, inicie-o com `ARROWAY_ENFORCE_CHECKING=false`. Instalações anteriores à 0.1.46 nunca são cobradas: a skill e o lembrete no fim de toda leitura levam a mesma instrução, sem a parada.

### O estado do clone local, dito na abertura

A Arroway existe para ninguém afirmar de memória em vez de afirmar a partir da fonte. A fonte que uma sessão de código lê não é só a memória comum — é o clone de git em que ela está sentada, e clone desatualizado responde lindamente: o arquivo abre, o grep roda, os testes compilam, tudo sobre um mundo que já andou.

Por isso o `SessionStart` também emite um bloco curto, antes das normas, quando — e só quando — há o que dizer. Sua máquina é o único lugar que consegue *ver* isso, então o cano recolhe os números aqui; as frases vêm do servidor, que é o que permite que elas melhorem sem ninguém atualizar nada. O que ele relata: commits atrás do remoto (mais alto passando de 20, onde dependências e clientes gerados costumam ter andado juntos), que idade tem esse conhecimento, ramos segurando trabalho que não existe em remoto nenhum, outro diretório com a mesma origem em outro commit, e worktrees apontando para diretórios que já não existem. **Clone em dia não imprime nada.** Quando a sessão abre fora de um repositório de git — o caso multi-repo, em que o diretório de trabalho é a pasta mãe —, o bloco examina os repositórios do nível de baixo em vez de ficar calado, com teto de doze e dizendo quando para. Ele também relata a distância até o ramo que vira produção, não só até o upstream do ramo atual: um ramo de trabalho sincronizado com o próprio remoto mede zero atrás e mesmo assim serve arquivo velho.

Ele não faz fetch. Rede no caminho de abertura é paga por toda sessão, inclusive as que nunca encostam no git — então o bloco relata o que as refs já sabem e declara a idade desse conhecimento, porque "0 commits atrás" num clone que não faz fetch há uma semana dá exatamente a impressão errada. Toda chamada ao git tem teto e qualquer falha degrada para silêncio.

"Trabalho que não existe em remoto nenhum" é decidido por **contenção**, medida em conteúdo: um ramo conta quando a ponta dele não é alcançável de nenhuma ref de `origin`. Configuração de upstream não decide nada, porque responde outra pergunta — ramo criado em worktree nunca ganha upstream, então contar por upstream fazia o número crescer sozinho em qualquer fluxo que abre um worktree por tarefa, sem descrever risco nenhum. Uma sessão lendo esse número como "trabalho a resgatar" trataria um clone limpo como achado, e aviso que dispara em clone limpo é aviso que as pessoas aprendem a pular.

A medição é um único `git rev-list --no-walk --branches --not --remotes=origin`. O `--no-walk` é o que a mantém barata: sem ele, o comando imprime cada commit local que falta no remoto, uma saída sem limite a cada abertura de sessão — com ele, o git devolve só as pontas de ramo que a exclusão não alcançou, uma linha cada. O ramo cujo remoto foi apagado (`[gone]`) continua sendo pego, porque a ponta dele continua fora de toda ref remota; o que para de disparar é o ramo `[gone]` cujo trabalho já foi mesclado. Dois ramos dividindo uma ponta contam uma vez: isso é um trabalho só em risco carregando dois nomes.

### A versão deste pacote, dita na abertura

Aqui nada se atualiza sozinho. Este pacote congela no dia em que você o instala, e o caminho da atualização depende de onde ele roda — e é por isso que instalação três versões atrás da publicada é o resultado normal, não o azarado. Aconteceu duas vezes numa semana com a pessoa que constrói a Arroway.

Então o servidor compara o que este pacote declara com o que está publicado, e diz isso **uma vez, na abertura da sessão**: a versão instalada, a publicada, e o caminho que cabe onde o plugin está rodando. No Cowork, e na aba Code do app do Claude, não há comando de terminal: a pessoa atualiza a Arroway na tela de Plugins e continua numa conversa nova. No Claude Code do terminal, o caminho são dois comandos (`claude plugin marketplace update arroway` e depois `claude plugin update arroway@arroway`) e reiniciar a sessão. Onde o cliente não diz o nome, como no Cursor e no Codex, o aviso dá os dois caminhos. É endereçado ao assistente que está na sessão, que roda o que aquele cliente permite ou conta para você. Atualizar escreve o pacote novo em disco; a sessão em que você está mantém a fotografia com que começou, então a conversa seguinte é a que pega o pacote novo.

**Instalação em dia não imprime nada**, e instalação *à frente* da publicada também não. Existe ainda um piso: abaixo da versão mais antiga que o servidor ainda considera compatível, a mesma abertura diz isso em palavras mais firmes, porque aquele pacote carrega decisões congeladas próprias que promoção nenhuma alcança. **Nenhuma das duas bloqueia nada, nunca.** Instalação velha vale uma frase, nunca uma ferramenta travada — e a frase viaja na abertura justamente para não virar uma linha embaixo de cada comando, que é a falha que faz as pessoas desligarem os hooks.

Ponha `ARROWAY_ENFORCE_READING=false` para desligar só o portão de primeira mutação no Codex CLI. Desligar o portão não tira a skill nem o lembrete de fechamento.

### Desligando o lembrete de fechamento

O hook de fechamento é um empurrão, não uma política. No Claude Code, ponha **"Ask before ending a turn without a record"** em off, na configuração do plugin. No Codex CLI, inicie-o com `ARROWAY_ENFORCE_CLOSING=false`; para desativar todos os hooks do Codex globalmente, ponha `[features] hooks = false` na configuração do Codex. A skill continua ensinando o protocolo — o que é desativado é só a interrupção.

É deliberadamente difícil ficar preso nele: ele pede **no máximo uma vez por turno**, fechar sua resposta com a frase *No durable residue.* o satisfaz numa frase só, e qualquer falha interna deixa o turno passar em vez de bloquear — inclusive a falha de lembrar que já pediu.

Quem julga o turno é o servidor, como tudo o mais, e ele viaja **uma vez por turno, não uma por ferramenta**: o cano guarda uma lista local de quais ferramentas rodaram (e o texto dos comandos de shell, pela mesma razão de classificação lá de cima) e a envia quando o turno termina. A última coisa que vai junto é o **final da última resposta do seu assistente** — os últimos mil caracteres —, porque a frase de liberação só conta quando fecha a resposta, então é só isso que o servidor precisa ver. O resto da resposta nunca sai.

A frase tem que *fechar* a resposta. Citada no meio de um parágrafo ela não conta, para que um turno que apenas discuta esta regra não possa se liberar mencionando-a.

### Desinstalar e revogar

Tirar o plugin interrompe a skill e os hooks. Isso **não** revoga o seu acesso:

```bash
/plugin uninstall arroway@arroway
```

Depois revogue a conexão no painel da Arroway, em Conexões. É isso que mata a credencial de verdade — revogar ali encerra tanto o acesso quanto o caminho de renovação.

### Onde os hooks rodam

Codex CLI/Desktop e Claude Code descobrem o `hooks/hooks.json` por convenção. O manifesto não deve declarar esse arquivo padrão de novo. O ChatGPT Work na web não roda hooks de comando locais; ali a skill e as próprias instruções do servidor carregam o protocolo, sem coerção. O pacote nunca presume que exista um hook.

O Cowork roda os mesmos hooks do Claude Code, com duas diferenças que o cano leva em conta. A ferramenta de shell dele se chama `mcp__workspace__bash`, e é julgada exatamente como o `Bash`. E o Cowork encerra a sessão e a retoma a cada mensagem que você manda, com o mesmo identificador de sessão. Por isso, quando uma sessão termina, o cano apaga só o turno, que acabou, e guarda a etiqueta de sessão da sua última leitura, para a mensagem seguinte não parecer uma sessão que nunca leu. Qualquer arquivo que o cano guarda e que fica dois dias sem ser tocado é apagado; a etiqueta que ele contém vive pouco no servidor de qualquer jeito.

### Manter e publicar o pacote

Todo conserto do pacote precisa de uma versão nova. Atualize a mesma versão nas quatro declarações de publicação:

- `.claude-plugin/plugin.json`, dentro deste pacote;
- `.codex-plugin/plugin.json`, dentro deste pacote;
- `.cursor-plugin/plugin.json`, dentro deste pacote;
- a entrada `arroway` no `.claude-plugin/marketplace.json` do repositório.

O servidor anuncia esse número como a versão publicada, então ele guarda uma cópia dele no `lib/plugin-version-rules.mjs` e um teste falha quando as quatro discordam — um servidor que anunciasse uma versão que ninguém publicou mandaria toda sessão perseguir uma atualização que não existe.

O mesmo número mora também no `gemini-extension.json` (o manifesto do Gemini CLI, publicado na raiz do repositório público) e no `PLUGIN_VERSION` do cano (`hooks/arroway-gate.mjs`), e há testes que falham quando qualquer um dos dois diverge. O `server.json` do repositório também carrega o número: o cartão do servidor o lê, e o workflow do registro de MCP carimba a versão do plugin na hora de publicar.

Duas conferências rodam em todo pull request, antes de qualquer coisa poder ser mesclada, e as duas comparam contra **o que a main publica**, não contra a etiqueta mais nova:

* os três manifestos têm que nomear o mesmo plugin e a mesma versão;
* se o instalável difere do publicado, a versão tem que ser maior. Enviar conteúdo diferente sob um número já publicado faz todo cliente instalado considerar o conserto já instalado.

```bash
pnpm test                    # inclui a conferência dos três manifestos
pnpm check:plugin-version    # o portão de subida de versão e continuidade de etiqueta
```

**Cortar a etiqueta de publicação não é mais um passo.** Promover para a `main` publica — o espelho atualiza o repositório de instalação — e esse mesmo push corta a `arroway--v<version>` sozinho. O `claude plugin tag` não faz mais parte do processo: era um gesto manual que ninguém lembrava, e seis versões publicadas acabaram sem ponto de volta com nome por causa disso. As versões promovidas antes daquele workflow existir são listadas pelo portão como dívida declarada, e uma rodada do workflow de publicação com `backfill` corta todas elas, cada uma no próprio commit de promoção.

O comando confere o pacote, recusa uma árvore de plugin suja, verifica que o manifesto do plugin e a entrada do marketplace concordam, e cria a etiqueta `{plugin-name}--v{version}`. Um conserto não está publicado até essa etiqueta ser empurrada; mudar arquivo no ramo padrão do marketplace sem mudar a versão não atualiza uma instalação existente.
