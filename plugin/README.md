# Arroway plugin

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
| App mapping (OpenAI) | `.app.json` | Maps the package to the registered Arroway OAuth app used by ChatGPT and Codex. |
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

The Codex manifest points to `.app.json`, which contains the technical ID of the registered **Arroway OAuth** app. That app owns the MCP connection and login handshake; the same package adds the skill and, where supported, the hooks.

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

The 1.0.0 submission already included the `arroway-workflow` skill; it was rejected on reviewer access, not on the package, and 1.1.0 carries the same skill. A fresh app registration for development would require replacing the ID in `.app.json` with the technical ID shown in the app URL (`asdk_app_…`).

In a corporate workspace the admin decides: a plugin is either **Available** (each member installs it) or **Installed** (pushed by default). A member cannot add an arbitrary plugin without that. This is the same gate the connector already passes through.

## What leaves your machine

The reading gate is decided by the server, not by the installed package. That is what lets a fix reach everyone the moment it is promoted, instead of only the people who happen to update — and it has a price you should not have to guess at.

**What is sent**, once per tool call, until the gate settles for the session:

* the tool's name;
* the text of a shell command, and only a shell command — classifying shell requires reading it;
* an opaque session key, which is your client's session identifier and nothing else — and only when the pipe has a credential to present, because without one there is no state to separate;
* the plugin version, the client name, and whether you have the gate switched on;
* after the tool ran: whether the response came back without an error and whether it carried any text.

**What is never sent:** file paths, the working directory, file contents, response contents. Not even as a fingerprint. The gate does not need them, so they do not leave.

**The shell command is used to classify the call and for nothing else.** It is never written to the database, never written to a log, and does not outlive the request that carried it. The only thing the gate stores is four fields — whether a read was delivered, whether it already asked for one, whether it already asked you to close this turn, and a request count — and a test locks that list so a fifth field cannot be added without someone noticing. Keep a secret out of a command line anyway: the gate is not the only thing that sees it.

**Who the state belongs to.** The gate answers anyone, but it only *remembers* for an authenticated account. Without a credential it reads nothing and writes nothing, and the answer is always the same. On a personal connection the pipe presents the token your connection link already carries — the same secret the connector uses, which is why the link is marked sensitive — and the server swaps it for a short-lived session tag, so the long secret stops travelling on every tool call. In a corporate workspace, where the address is public and the credential is negotiated by your client, that session tag is issued inside the first commons read and binds to the first session that presents it.

**The gate does not need a pasted connection link.** It always contacts Arroway's public gate endpoint. With an OAuth connection, the first successful `arroway_read` returns a short session tag that the pipe presents from then on, so the server can associate the installed version with the right connection without exposing OAuth credentials or asking you to configure an environment variable. Claude Code and Cursor both use that public address; identity comes from signing in.

**When the server cannot be reached** — no network, a timeout, an answer it does not understand — the tool proceeds and nothing is printed. There is no local copy of the rules: failing open *is* the degradation. After three network failures in a row the pipe stops trying for the rest of the session, so an unreachable server costs you one short wait instead of one per tool call.

Once the gate can no longer block anything in a session, the server says so and the pipe stops talking to the network for the rest of it.

## Reading gate and closing reminder

The first mutating file or shell tool in a session is blocked when no `arroway_read` or `arroway_norms` has returned a successful body. If a read is delivered in transport parts, receive every part with `arroway_continue` and confirm the final one with `arroway_complete_read`: a part is not a completed read. Calling a read is not enough: an error, refusal or incomplete part does not release the gate. Read-only shell commands and sessions that only converse or inspect files are not charged.

**The gate asks at most once per session.** Retry the same tool and it proceeds, with a visible note saying the commons was not read. This is deliberate: while the delivered-read marker is right, blocking is a cheap nudge, but when the marker is wrong — a response shape the server does not recognise, or a read the connection envelope refuses and always will — blocking forever leaves a session with no way out, and the only remaining remedy is switching the plugin off. A gate whose failure mode is "uninstall me" protects nothing. Both gates only ever *block* for a session the server can keep state for; without state they observe and stay quiet, because the promise to ask only once is the only thing that makes blocking safe.

Whether a read was delivered is decided by the response carrying text, not by its shape: any serialisation a client uses is unwrapped, and only the explicit error markers say no.

After a successful `arroway_norms`, the server tells the pipe to keep that delivered block in the plugin's private data directory and reinserts it when another session starts in the same directory. On a clean install there is no cache yet, so the opening context says that plainly and the first mutation still requires `arroway_read`. Current Codex command hooks cannot invoke an OAuth app tool themselves; when Codex supports MCP-tool hooks, the cache can be replaced by a live SessionStart read without changing the protocol.

## The state of the local clone, said at the opening

Arroway exists so that nobody asserts from memory instead of from the source. The source a coding session reads is not only the commons — it is the git clone it sits in, and a stale clone answers beautifully: the file opens, the grep runs, the tests compile, all about a world that has moved on.

So `SessionStart` also emits a short block, before the norms, when — and only when — there is something to say. Your machine is the only place that can *see* this, so the pipe collects the numbers here; the sentences come from the server, which is what lets them improve without anyone updating anything. What it reports: commits behind the remote (louder past 20, where dependencies and generated clients tend to have moved together), how old that knowledge is, branches holding work that exists in no remote, another directory with the same origin at a different commit, and worktrees pointing at directories that no longer exist. **A clone that is up to date prints nothing.** When the session opens outside a git repository — the multi-repo case, where the working directory is the parent folder — the block examines the repositories one level below instead of falling silent, capped at twelve and saying so when it stops. It also reports the distance to the branch that becomes production, not only to the current branch's own upstream: a feature branch in sync with its own remote measures zero behind and still serves stale files.

It does not fetch. Network on the opening path is paid by every session, including the ones that never touch git — so the block reports what the refs already know and states the age of that knowledge, because "0 commits behind" in a clone that has not fetched for a week gives exactly the wrong impression. Every git call is capped and any failure degrades to silence.

"Work that exists in no remote" is decided by **containment**, measured in content: a branch counts when its tip is reachable from no `origin` ref at all. Upstream configuration decides nothing, because it answers a different question — a branch created in a worktree never gets an upstream, so counting by upstream made the number grow on its own in any workflow that opens a worktree per task, while describing no risk whatsoever. A session reading that number as "work to rescue" would treat a clean clone as a finding, and a warning that fires on clean clones is one people learn to skip.

The measurement is a single `git rev-list --no-walk --branches --not --remotes=origin`. `--no-walk` is what keeps it cheap: without it the command prints every local commit missing from the remote, an unbounded output on every session opening — with it, git returns only the branch tips the exclusion did not reach, one line each. The branch whose remote was deleted (`[gone]`) is still caught, because its tip is still outside every remote ref; what stops firing is the `[gone]` branch whose work was already merged. Two branches sharing one tip count once: that is one piece of work at risk carrying two names.

## The version of this package, said at the opening

Nothing here updates itself. This package freezes on the day you install it, and updating it is two commands somebody has to remember — which is why an install three versions behind the published one is the normal outcome, not the unlucky one. It happened twice in one week to the person who builds Arroway.

So the server compares what this package declares with what is published, and says so **once, at the opening of the session** — the installed version, the published one, and the two commands. It is addressed to the assistant in the session, which can either run them or tell you. Updating writes the new package to disk; the session you are in keeps the snapshot it started with, so restart it to pick the new one up.

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

## Maintaining and releasing the package

Every package fix needs a new version. Update the same version in all four release declarations:

- `.claude-plugin/plugin.json` inside this package;
- `.codex-plugin/plugin.json` inside this package;
- `.cursor-plugin/plugin.json` inside this package;
- the `arroway` entry in the repository's `.claude-plugin/marketplace.json`.

The server announces that number as the published version, so it keeps a copy of it in `lib/plugin-version-rules.mjs` and a test fails when the four disagree — a server that announced a version nobody published would send every session chasing an update that does not exist.

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
| Mapeo de la app (OpenAI) | `.app.json` | Asocia el paquete a la app OAuth de Arroway registrada que usan ChatGPT y Codex. |
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

El manifiesto de Codex apunta a `.app.json`, que contiene el ID técnico de la app **Arroway OAuth** registrada. Esa app es la dueña de la conexión MCP y del intercambio de entrada; el mismo paquete añade la skill y, donde haya soporte, los hooks.

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

El envío de la 1.0.0 ya incluía la skill `arroway-workflow`; fue rechazado por el acceso de quien revisaba, no por el paquete, y la 1.1.0 lleva esa misma skill. Registrar una app nueva para desarrollo exigiría sustituir el ID de `.app.json` por el ID técnico que aparece en la URL de la app (`asdk_app_…`).

En un espacio de trabajo corporativo decide quien administra: un plugin está **Disponible** (cada miembro lo instala) o **Instalado** (empujado por defecto). Un miembro no puede añadir un plugin cualquiera sin eso. Es la misma puerta por la que ya pasa el conector.

### Qué sale de tu máquina

La compuerta de lectura la decide el servidor, no el paquete instalado. Eso es lo que permite que un arreglo llegue a todo el mundo en el momento en que se promueve, en vez de solo a quien resulte actualizar — y tiene un precio que no deberías tener que adivinar.

**Qué se envía**, una vez por llamada de herramienta, hasta que la compuerta se resuelve para la sesión:

* el nombre de la herramienta;
* el texto de un comando de shell, y solo de un comando de shell — clasificar shell exige leerlo;
* una clave opaca de sesión, que es el identificador de sesión de tu cliente y nada más — y solo cuando el conducto tiene una credencial que presentar, porque sin ella no hay estado que separar;
* la versión del plugin, el nombre del cliente, y si tienes la compuerta activada;
* después de que la herramienta corrió: si la respuesta volvió sin error y si traía algún texto.

**Qué no se envía nunca:** rutas de archivos, el directorio de trabajo, el contenido de los archivos, el contenido de las respuestas. Ni siquiera como huella. La compuerta no los necesita, así que no salen.

**El comando de shell se usa para clasificar la llamada y para nada más.** Nunca se escribe en la base de datos, nunca se escribe en un registro, y no sobrevive a la petición que lo llevó. Lo único que la compuerta guarda son cuatro campos — si se entregó una lectura, si ya pidió una, si ya te pidió cerrar este turno, y una cuenta de peticiones —, y hay un test que fija esa lista para que no se pueda añadir un quinto campo sin que alguien lo note. Aun así, mantén los secretos fuera de la línea de comandos: la compuerta no es lo único que la ve.

**De quién es el estado.** La compuerta le responde a cualquiera, pero solo *recuerda* para una cuenta autenticada. Sin credencial no lee nada y no escribe nada, y la respuesta es siempre la misma. En una conexión personal el conducto presenta el token que tu enlace de conexión ya lleva — el mismo secreto que usa el conector, que es por lo que el enlace está marcado como sensible — y el servidor lo cambia por una etiqueta de sesión de vida corta, para que el secreto largo deje de viajar en cada llamada de herramienta. En un espacio de trabajo corporativo, donde la dirección es pública y la credencial la negocia tu cliente, esa etiqueta de sesión se emite dentro de la primera lectura de la memoria común y queda atada a la primera sesión que la presenta.

**La compuerta no necesita ningún enlace de conexión pegado.** Siempre contacta con el endpoint público de la compuerta de Arroway. Con una conexión OAuth, el primer `arroway_read` exitoso devuelve una etiqueta corta de sesión que el conducto presenta desde entonces, para que el servidor pueda asociar la versión instalada con la conexión correcta sin exponer credenciales OAuth ni pedirte configurar una variable de entorno. Claude Code y Cursor usan esa dirección pública; la identidad viene de entrar.

**Cuando no se puede alcanzar el servidor** — sin red, un tiempo agotado, una respuesta que no entiende — la herramienta sigue adelante y no se imprime nada. No hay copia local de las reglas: fallar abierto *es* la degradación. Tras tres fallos de red seguidos el conducto deja de intentarlo durante el resto de la sesión, así que un servidor inalcanzable te cuesta una espera corta en vez de una por cada llamada.

Cuando la compuerta ya no puede bloquear nada en una sesión, el servidor lo dice y el conducto deja de hablar con la red durante el resto de ella.

### Compuerta de lectura y recordatorio de cierre

La primera herramienta de archivo o de shell que muta algo en una sesión se bloquea cuando ningún `arroway_read` ni `arroway_norms` ha devuelto un cuerpo exitoso. Si una lectura se entrega en partes de transporte, recibe todas las partes con `arroway_continue` y confirma la última con `arroway_complete_read`: una parte no es una lectura completa. Llamar a una lectura no basta: un error, una negativa o una parte incompleta no libera la compuerta. Los comandos de shell de solo lectura y las sesiones que únicamente conversan o inspeccionan archivos no se cobran.

**La compuerta pregunta como mucho una vez por sesión.** Reintenta la misma herramienta y sigue adelante, con una nota visible que dice que no se leyó la memoria común. Es deliberado: mientras la marca de lectura entregada sea correcta, bloquear es un empujón barato, pero cuando la marca está equivocada — una forma de respuesta que el servidor no reconoce, o una lectura que el sobre de la conexión rechaza y siempre va a rechazar — bloquear para siempre deja la sesión sin salida, y el único remedio que queda es apagar el plugin. Una compuerta cuyo modo de fallo es "desinstálame" no protege nada. Las dos compuertas solo *bloquean* en una sesión para la que el servidor puede guardar estado; sin estado observan y se quedan calladas, porque la promesa de preguntar una sola vez es lo único que hace que bloquear sea seguro.

Que una lectura se haya entregado lo decide la respuesta al traer texto, no su forma: cualquier serialización que use un cliente se desenvuelve, y solo los marcadores explícitos de error dicen que no.

Después de un `arroway_norms` exitoso, el servidor le dice al conducto que guarde ese bloque entregado en el directorio de datos privado del plugin, y lo reinserta cuando otra sesión empieza en el mismo directorio. En una instalación limpia todavía no hay caché, así que el contexto de apertura lo dice con claridad y la primera mutación sigue exigiendo `arroway_read`. Los hooks de comando actuales de Codex no pueden invocar por sí mismos una herramienta de app OAuth; cuando Codex soporte hooks de herramienta MCP, el caché se puede sustituir por una lectura en vivo en `SessionStart` sin cambiar el protocolo.

### El estado del clon local, dicho en la apertura

Arroway existe para que nadie afirme de memoria en vez de afirmar desde la fuente. La fuente que lee una sesión de código no es solo la memoria común — es el clon de git en el que está sentada, y un clon desactualizado responde precioso: el archivo abre, el grep corre, los tests compilan, todo sobre un mundo que ya se movió.

Por eso `SessionStart` emite también un bloque corto, antes de las normas, cuando — y solo cuando — hay algo que decir. Tu máquina es el único sitio que puede *ver* esto, así que el conducto recoge aquí los números; las frases vienen del servidor, que es lo que permite que mejoren sin que nadie actualice nada. Qué reporta: commits por detrás del remoto (más alto cuando pasa de 20, donde las dependencias y los clientes generados suelen haberse movido juntos), qué antigüedad tiene ese conocimiento, ramas que sostienen trabajo que no existe en ningún remoto, otro directorio con el mismo origen en otro commit, y worktrees apuntando a directorios que ya no existen. **Un clon al día no imprime nada.** Cuando la sesión abre fuera de un repositorio de git — el caso multi-repo, donde el directorio de trabajo es la carpeta madre —, el bloque examina los repositorios del nivel de abajo en vez de quedarse callado, con un tope de doce y diciéndolo cuando para. También reporta la distancia hasta la rama que se convierte en producción, no solo hasta el upstream de la rama actual: una rama de trabajo sincronizada con su propio remoto mide cero por detrás y aun así sirve archivos viejos.

No hace fetch. La red en el camino de apertura la paga cada sesión, incluidas las que nunca tocan git — así que el bloque reporta lo que las refs ya saben y declara la antigüedad de ese conocimiento, porque "0 commits por detrás" en un clon que no hace fetch desde hace una semana da exactamente la impresión contraria. Cada llamada a git tiene tope y cualquier fallo degrada a silencio.

"Trabajo que no existe en ningún remoto" lo decide la **contención**, medida en contenido: una rama cuenta cuando su punta no es alcanzable desde ninguna ref de `origin`. La configuración de upstream no decide nada, porque responde a otra pregunta — una rama creada en un worktree nunca recibe upstream, así que contar por upstream hacía crecer el número solo, en cualquier flujo que abra un worktree por tarea, sin describir riesgo alguno. Una sesión que leyera ese número como "trabajo que rescatar" trataría un clon limpio como un hallazgo, y un aviso que salta en clones limpios es de los que la gente aprende a saltarse.

La medición es un único `git rev-list --no-walk --branches --not --remotes=origin`. `--no-walk` es lo que la mantiene barata: sin él, el comando imprime cada commit local que falta en el remoto, una salida sin límite en cada apertura de sesión — con él, git devuelve solo las puntas de rama que la exclusión no alcanzó, una línea cada una. La rama cuyo remoto se borró (`[gone]`) se sigue atrapando, porque su punta sigue estando fuera de toda ref remota; lo que deja de saltar es la rama `[gone]` cuyo trabajo ya se mezcló. Dos ramas que comparten una punta cuentan una vez: eso es un solo trabajo en riesgo llevando dos nombres.

### La versión de este paquete, dicha en la apertura

Aquí nada se actualiza solo. Este paquete se congela el día que lo instalas, y actualizarlo son dos comandos que alguien tiene que recordar — por lo que una instalación tres versiones por detrás de la publicada es el resultado normal, no el desafortunado. Le pasó dos veces en una semana a la persona que construye Arroway.

Así que el servidor compara lo que este paquete declara con lo que está publicado, y lo dice **una vez, en la apertura de la sesión** — la versión instalada, la publicada, y los dos comandos. Va dirigido al asistente que está en la sesión, que puede ejecutarlos o contártelo. Actualizar escribe el paquete nuevo en disco; la sesión en la que estás conserva la instantánea con la que empezó, así que reiníciala para tomar la nueva.

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

### Mantener y publicar el paquete

Cada arreglo del paquete necesita una versión nueva. Actualiza la misma versión en las cuatro declaraciones de publicación:

- `.claude-plugin/plugin.json`, dentro de este paquete;
- `.codex-plugin/plugin.json`, dentro de este paquete;
- `.cursor-plugin/plugin.json`, dentro de este paquete;
- la entrada `arroway` en el `.claude-plugin/marketplace.json` del repositorio.

El servidor anuncia ese número como la versión publicada, así que guarda una copia en `lib/plugin-version-rules.mjs` y un test falla cuando las cuatro no coinciden — un servidor que anunciara una versión que nadie publicó mandaría a cada sesión a perseguir una actualización que no existe.

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
| Mapeamento do app (OpenAI) | `.app.json` | Associa o pacote ao app OAuth da Arroway registrado que o ChatGPT e o Codex usam. |
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

O manifesto do Codex aponta para o `.app.json`, que contém o ID técnico do app **Arroway OAuth** registrado. É esse app que é dono da conexão MCP e da troca de entrada; o mesmo pacote acrescenta a skill e, onde houver suporte, os hooks.

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

O envio da 1.0.0 já incluía a skill `arroway-workflow`; foi recusado por causa do acesso de quem revisava, não do pacote, e a 1.1.0 carrega essa mesma skill. Registrar um app novo para desenvolvimento exigiria trocar o ID do `.app.json` pelo ID técnico que aparece na URL do app (`asdk_app_…`).

Num espaço de trabalho corporativo quem decide é quem administra: um plugin fica **Disponível** (cada pessoa instala) ou **Instalado** (empurrado por padrão). Uma pessoa do time não consegue adicionar um plugin qualquer sem isso. É o mesmo portão pelo qual o conector já passa.

### O que sai da sua máquina

Quem decide o portão de leitura é o servidor, não o pacote instalado. É isso que faz um conserto alcançar todo mundo no momento em que é promovido, em vez de alcançar só quem por acaso atualizou — e tem um preço que você não deveria ter que adivinhar.

**O que é enviado**, uma vez por chamada de ferramenta, até o portão se resolver para a sessão:

* o nome da ferramenta;
* o texto de um comando de shell, e só de um comando de shell — classificar shell exige ler o comando;
* uma chave opaca de sessão, que é o identificador de sessão do seu cliente e nada mais — e só quando o cano tem uma credencial para apresentar, porque sem ela não há estado a separar;
* a versão do plugin, o nome do cliente, e se você está com o portão ligado;
* depois que a ferramenta rodou: se a resposta voltou sem erro e se ela trazia algum texto.

**O que nunca é enviado:** caminho de arquivo, o diretório de trabalho, conteúdo de arquivo, conteúdo de resposta. Nem como impressão digital. O portão não precisa disso, então isso não sai.

**O comando de shell é usado para classificar a chamada e para mais nada.** Nunca é escrito no banco, nunca é escrito em log, e não sobrevive à requisição que o carregou. A única coisa que o portão guarda são quatro campos — se uma leitura foi entregue, se ele já pediu uma, se ele já pediu para você fechar este turno, e uma contagem de requisições —, e existe um teste que trava essa lista para que um quinto campo não entre sem alguém perceber. Mantenha segredo fora da linha de comando mesmo assim: o portão não é a única coisa que a enxerga.

**De quem é o estado.** O portão responde a qualquer um, mas só *lembra* de uma conta autenticada. Sem credencial ele não lê nada e não escreve nada, e a resposta é sempre a mesma. Numa conexão pessoal o cano apresenta o token que o seu link de conexão já carrega — o mesmo segredo que o conector usa, que é por isso que o link é marcado como sensível — e o servidor o troca por uma etiqueta de sessão de vida curta, para o segredo longo parar de viajar a cada chamada de ferramenta. Num espaço de trabalho corporativo, onde o endereço é público e a credencial é negociada pelo seu cliente, essa etiqueta de sessão é emitida dentro da primeira leitura da memória comum e se prende à primeira sessão que a apresenta.

**O portão não precisa de link de conexão colado.** Ele sempre procura o endpoint público do portão da Arroway. Com conexão OAuth, o primeiro `arroway_read` bem-sucedido devolve uma etiqueta curta de sessão que o cano apresenta dali em diante, para o servidor conseguir associar a versão instalada à conexão certa sem expor credencial OAuth nem pedir que você configure variável de ambiente. Claude Code e Cursor usam esse endereço público; a identidade vem de entrar.

**Quando o servidor não pode ser alcançado** — sem rede, tempo esgotado, uma resposta que ele não entende — a ferramenta segue e nada é impresso. Não existe cópia local das regras: falhar aberto *é* a degradação. Depois de três falhas de rede seguidas o cano para de tentar pelo resto da sessão, então um servidor inalcançável custa uma espera curta em vez de uma por chamada de ferramenta.

Quando o portão já não pode bloquear nada numa sessão, o servidor diz isso e o cano para de falar com a rede pelo resto dela.

### Portão de leitura e lembrete de fechamento

A primeira ferramenta de arquivo ou de shell que muta alguma coisa numa sessão é bloqueada quando nenhum `arroway_read` ou `arroway_norms` devolveu um corpo bem-sucedido. Se uma leitura for entregue em partes de transporte, receba todas as partes com `arroway_continue` e confirme a última com `arroway_complete_read`: uma parte não é uma leitura completa. Chamar uma leitura não basta: erro, recusa ou parte incompleta não libera o portão. Comando de shell somente de leitura e sessão que só conversa ou inspeciona arquivo não são cobrados.

**O portão pede no máximo uma vez por sessão.** Tente a mesma ferramenta de novo e ela segue, com uma nota visível dizendo que a memória comum não foi lida. Isso é deliberado: enquanto a marca de leitura entregue estiver certa, bloquear é um empurrão barato, mas quando a marca está errada — uma forma de resposta que o servidor não reconhece, ou uma leitura que o envelope da conexão recusa e vai recusar sempre — bloquear para sempre deixa a sessão sem saída, e o único remédio que sobra é desligar o plugin. Um portão cujo modo de falha é "me desinstale" não protege nada. Os dois portões só *bloqueiam* numa sessão para a qual o servidor consegue guardar estado; sem estado eles observam e ficam calados, porque a promessa de pedir uma vez só é a única coisa que torna bloquear seguro.

Se uma leitura foi entregue, quem decide é a resposta ter trazido texto, não o formato dela: qualquer serialização que um cliente use é desembrulhada, e só os marcadores explícitos de erro dizem que não.

Depois de um `arroway_norms` bem-sucedido, o servidor manda o cano guardar aquele bloco entregue no diretório de dados privado do plugin, e o reinsere quando outra sessão começa no mesmo diretório. Numa instalação limpa ainda não existe cache, então o contexto de abertura diz isso com todas as letras e a primeira mutação continua exigindo `arroway_read`. Os hooks de comando atuais do Codex não conseguem invocar sozinhos uma ferramenta de app OAuth; quando o Codex suportar hooks de ferramenta MCP, o cache pode ser substituído por uma leitura ao vivo no `SessionStart` sem mudar o protocolo.

### O estado do clone local, dito na abertura

A Arroway existe para ninguém afirmar de memória em vez de afirmar a partir da fonte. A fonte que uma sessão de código lê não é só a memória comum — é o clone de git em que ela está sentada, e clone desatualizado responde lindamente: o arquivo abre, o grep roda, os testes compilam, tudo sobre um mundo que já andou.

Por isso o `SessionStart` também emite um bloco curto, antes das normas, quando — e só quando — há o que dizer. Sua máquina é o único lugar que consegue *ver* isso, então o cano recolhe os números aqui; as frases vêm do servidor, que é o que permite que elas melhorem sem ninguém atualizar nada. O que ele relata: commits atrás do remoto (mais alto passando de 20, onde dependências e clientes gerados costumam ter andado juntos), que idade tem esse conhecimento, ramos segurando trabalho que não existe em remoto nenhum, outro diretório com a mesma origem em outro commit, e worktrees apontando para diretórios que já não existem. **Clone em dia não imprime nada.** Quando a sessão abre fora de um repositório de git — o caso multi-repo, em que o diretório de trabalho é a pasta mãe —, o bloco examina os repositórios do nível de baixo em vez de ficar calado, com teto de doze e dizendo quando para. Ele também relata a distância até o ramo que vira produção, não só até o upstream do ramo atual: um ramo de trabalho sincronizado com o próprio remoto mede zero atrás e mesmo assim serve arquivo velho.

Ele não faz fetch. Rede no caminho de abertura é paga por toda sessão, inclusive as que nunca encostam no git — então o bloco relata o que as refs já sabem e declara a idade desse conhecimento, porque "0 commits atrás" num clone que não faz fetch há uma semana dá exatamente a impressão errada. Toda chamada ao git tem teto e qualquer falha degrada para silêncio.

"Trabalho que não existe em remoto nenhum" é decidido por **contenção**, medida em conteúdo: um ramo conta quando a ponta dele não é alcançável de nenhuma ref de `origin`. Configuração de upstream não decide nada, porque responde outra pergunta — ramo criado em worktree nunca ganha upstream, então contar por upstream fazia o número crescer sozinho em qualquer fluxo que abre um worktree por tarefa, sem descrever risco nenhum. Uma sessão lendo esse número como "trabalho a resgatar" trataria um clone limpo como achado, e aviso que dispara em clone limpo é aviso que as pessoas aprendem a pular.

A medição é um único `git rev-list --no-walk --branches --not --remotes=origin`. O `--no-walk` é o que a mantém barata: sem ele, o comando imprime cada commit local que falta no remoto, uma saída sem limite a cada abertura de sessão — com ele, o git devolve só as pontas de ramo que a exclusão não alcançou, uma linha cada. O ramo cujo remoto foi apagado (`[gone]`) continua sendo pego, porque a ponta dele continua fora de toda ref remota; o que para de disparar é o ramo `[gone]` cujo trabalho já foi mesclado. Dois ramos dividindo uma ponta contam uma vez: isso é um trabalho só em risco carregando dois nomes.

### A versão deste pacote, dita na abertura

Aqui nada se atualiza sozinho. Este pacote congela no dia em que você o instala, e atualizá-lo são dois comandos que alguém tem que lembrar — e é por isso que instalação três versões atrás da publicada é o resultado normal, não o azarado. Aconteceu duas vezes numa semana com a pessoa que constrói a Arroway.

Então o servidor compara o que este pacote declara com o que está publicado, e diz isso **uma vez, na abertura da sessão** — a versão instalada, a publicada, e os dois comandos. É endereçado ao assistente que está na sessão, que pode rodar os comandos ou contar para você. Atualizar escreve o pacote novo em disco; a sessão em que você está mantém a fotografia com que começou, então reinicie-a para pegar a nova.

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

### Manter e publicar o pacote

Todo conserto do pacote precisa de uma versão nova. Atualize a mesma versão nas quatro declarações de publicação:

- `.claude-plugin/plugin.json`, dentro deste pacote;
- `.codex-plugin/plugin.json`, dentro deste pacote;
- `.cursor-plugin/plugin.json`, dentro deste pacote;
- a entrada `arroway` no `.claude-plugin/marketplace.json` do repositório.

O servidor anuncia esse número como a versão publicada, então ele guarda uma cópia dele no `lib/plugin-version-rules.mjs` e um teste falha quando as quatro discordam — um servidor que anunciasse uma versão que ninguém publicou mandaria toda sessão perseguir uma atualização que não existe.

Duas conferências rodam em todo pull request, antes de qualquer coisa poder ser mesclada, e as duas comparam contra **o que a main publica**, não contra a etiqueta mais nova:

* os três manifestos têm que nomear o mesmo plugin e a mesma versão;
* se o instalável difere do publicado, a versão tem que ser maior. Enviar conteúdo diferente sob um número já publicado faz todo cliente instalado considerar o conserto já instalado.

```bash
pnpm test                    # inclui a conferência dos três manifestos
pnpm check:plugin-version    # o portão de subida de versão e continuidade de etiqueta
```

**Cortar a etiqueta de publicação não é mais um passo.** Promover para a `main` publica — o espelho atualiza o repositório de instalação — e esse mesmo push corta a `arroway--v<version>` sozinho. O `claude plugin tag` não faz mais parte do processo: era um gesto manual que ninguém lembrava, e seis versões publicadas acabaram sem ponto de volta com nome por causa disso. As versões promovidas antes daquele workflow existir são listadas pelo portão como dívida declarada, e uma rodada do workflow de publicação com `backfill` corta todas elas, cada uma no próprio commit de promoção.

O comando confere o pacote, recusa uma árvore de plugin suja, verifica que o manifesto do plugin e a entrada do marketplace concordam, e cria a etiqueta `{plugin-name}--v{version}`. Um conserto não está publicado até essa etiqueta ser empurrada; mudar arquivo no ramo padrão do marketplace sem mudar a versão não atualiza uma instalação existente.
