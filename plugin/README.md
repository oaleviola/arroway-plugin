# Arroway plugin

One install instead of two steps. Before this package, joining Arroway meant adding the connector **and** pasting a seed into your Project or `CLAUDE.md` by hand. The seed is now the skill, and the skill travels with the plugin.

The plugin does not replace the MCP server — it wraps it. The server is still the engine; this is the packaging.

## What is in the box

| Component | File | What it does |
| :--- | :--- | :--- |
| MCP connection (Claude) | `.mcp.json` | Connects Claude Code over HTTP. The link you paste carries your identity. |
| Skill | `skills/arroway-workflow/SKILL.md` | Teaches the protocol: read → work → norms → close. |
| Hooks | `hooks/hooks.json` | Matches everything and hands every event to the pipe. No tool name is frozen in the package. |
| The pipe | `hooks/arroway-gate.mjs` | The only script that runs. It observes, asks the server, prints the answer and obeys it. It carries no rule and no wording of its own — see **What leaves your machine** below. |
| Local observation | `hooks/clone-facts.mjs`, `hooks/norms-cache.mjs` | The two things only your machine can see or keep: the state of the git clones here, and the last delivered norms for this directory. Numbers and text, no judgement. |
| App mapping (OpenAI) | `.app.json` | Maps the package to the registered Arroway OAuth app used by ChatGPT and Codex. |

## Install — Claude Code

```bash
/plugin marketplace add oaleviola/arroway-app
```

```bash
/plugin install arroway@arroway
```

Claude Code asks for your **connection link** when the plugin is enabled. Get it from the Connections page of your Arroway panel and paste the whole URL. It is stored the way credentials are stored — the macOS Keychain, or `~/.claude/.credentials.json` where no keychain exists — never in `settings.json`, and never in the repository.

If the install summary says `Run /reload-plugins to activate.`, run that.

To install from a local checkout instead:

```bash
/plugin marketplace add ./arroway-app
```

## Install — Codex Desktop / CLI

OpenAI plugins do not consume Claude's `${user_config.connection_url}`. The Codex manifest points to `.app.json`, which contains the technical ID of the registered **Arroway OAuth** app. That app owns the MCP connection and login handshake; the same package adds the skill and, where supported, the hooks.

Add the public GitHub marketplace and install the package:

```bash
codex plugin marketplace add oaleviola/arroway-app
codex plugin add arroway@arroway
```

Open a new task after installing or updating so the task picks up the new plugin snapshot.

For local package development, point the marketplace command at a local checkout instead of the GitHub repository.

The Codex IDE extension does not support plugins. Connect the Arroway MCP server there; do not expect the local skill or hooks to load.

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

**The gate does not need your connection link.** It always contacts Arroway's public gate endpoint. With an OAuth connection, the first successful `arroway_read` returns a short session tag that the pipe presents from then on, so the server can associate the installed version with the right connection without exposing OAuth credentials or asking you to configure an environment variable. A Claude connection link still configures Claude's MCP server itself; it is not required for the gate to reach the server.

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

"Work that exists in no remote" is decided by whether the branch **has an upstream at all**, never by how the tracking column happens to read: a branch in sync with its remote prints an *empty* tracking column, so counting by that column announced every synced branch as work at risk — and excluded the one case the line exists for, the branch whose remote was deleted (`[gone]`). Three things count: no upstream (never pushed), `[gone]` (the remote that held it is gone), and `[ahead N]`. A branch that is only behind loses nothing if this clone is deleted. This is a count of branches at risk, not a patch-by-patch proof: a branch whose commits already reached the remote under another name still counts, because comparing patches would mean one `git` call per branch on every session opening.

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

Every package fix needs a new version. Update the same version in all three release declarations:

- `.claude-plugin/plugin.json` inside this package;
- `.codex-plugin/plugin.json` inside this package;
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
