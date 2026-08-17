# Arroway plugin

One install instead of two steps. Before this package, joining Arroway meant adding the connector **and** pasting a seed into your Project or `CLAUDE.md` by hand. The seed is now the skill, and the skill travels with the plugin.

The plugin does not replace the MCP server — it wraps it. The server is still the engine; this is the packaging.

## What is in the box

| Component | File | What it does |
| :--- | :--- | :--- |
| MCP connection (Claude) | `.mcp.json` | Connects Claude Code over HTTP. The link you paste carries your identity. |
| Skill | `skills/arroway-workflow/SKILL.md` | Teaches the protocol: read → work → norms → close. |
| Hooks | `hooks/hooks.json` | Reinserts the last delivered norms for this directory, blocks the first mutation until a commons read arrives, and asks once when changed files were not closed. |
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

## Install — Codex / ChatGPT

OpenAI plugins do not consume Claude's `${user_config.connection_url}`. The Codex manifest points to `.app.json`, which contains the technical ID of the registered **Arroway OAuth** app. That app owns the MCP connection and login handshake; the same package adds the skill and, where supported, the hooks.

For local development, add the marketplace that contains the package and install it:

```bash
codex plugin marketplace add /path/to/marketplace
codex plugin add arroway@arroway
```

Open a new task after installing or updating so the task picks up the new plugin snapshot. In ChatGPT, Developer mode must be enabled and the Arroway MCP app must remain registered. A fresh registration would require replacing the ID in `.app.json` with the new technical ID shown in the app URL (`asdk_app_…`).

In a corporate workspace the admin decides: a plugin is either **Available** (each member installs it) or **Installed** (pushed by default). A member cannot add an arbitrary plugin without that. This is the same gate the connector already passes through — the plugin does not escape it, it just replaces two frictions with one.

## Reading gate and closing reminder

The first mutating file or shell tool in a session is blocked when no `arroway_read` or `arroway_norms` has returned a successful body. If a read is delivered in transport parts, receive every part with `arroway_continue` and confirm the final one with `arroway_complete_read`: a part is not a completed read. Calling a read is not enough: an error, refusal or incomplete part does not release the gate. Read-only shell commands and sessions that only converse or inspect files are not charged.

**The gate asks at most once per session.** Retry the same tool and it proceeds, with a visible note saying the commons was not read. This is deliberate: while the delivered-read marker is right, blocking is a cheap nudge, but when the marker is wrong — a response shape the hook does not recognise, or a read the connection envelope refuses and always will — blocking forever leaves a session with no way out, and the only remaining remedy is switching the plugin off. A gate whose failure mode is "uninstall me" protects nothing. The reminder is persisted before the block, so a session whose state cannot be written is never blocked at all.

Whether a read was delivered is decided by the response carrying text, not by its shape: any serialisation a client uses is unwrapped, and only the explicit error markers say no.

After a successful `arroway_norms`, the hook keeps that delivered block in the plugin's private data directory and reinserts it when another session starts in the same directory. On a clean install there is no cache yet, so the opening context says that plainly and the first mutation still requires `arroway_read`. Current Codex command hooks cannot invoke an OAuth app tool themselves; when Codex supports MCP-tool hooks, the cache can be replaced by a live SessionStart read without changing the protocol.

## The state of the local clone, said at the opening

Arroway exists so that nobody asserts from memory instead of from the source. The source a coding session reads is not only the commons — it is the git clone it sits in, and a stale clone answers beautifully: the file opens, the grep runs, the tests compile, all about a world that has moved on.

So `SessionStart` also emits a short block, before the norms, when — and only when — there is something to say: commits behind the remote (louder past 20, where dependencies and generated clients tend to have moved together), how old that knowledge is, branches holding work that exists in no remote, another directory with the same origin at a different commit, and worktrees pointing at directories that no longer exist. **A clone that is up to date prints nothing.** When the session opens outside a git repository — the multi-repo case, where the working directory is the parent folder — the block examines the repositories one level below instead of falling silent, capped at twelve and saying so when it stops. It also reports the distance to the branch that becomes production, not only to the current branch's own upstream: a feature branch in sync with its own remote measures zero behind and still serves stale files.

It does not fetch. Network on the opening path is paid by every session, including the ones that never touch git — so the block reports what the refs already know and states the age of that knowledge, because "0 commits behind" in a clone that has not fetched for a week gives exactly the wrong impression. Every git call is capped and any failure degrades to silence.

Set `ARROWAY_ENFORCE_READING=false` to turn off only the first-mutation gate in Codex CLI. Disabling the gate does not remove the skill or the closing reminder.

## Turning the closing reminder off

The closing hook is a nudge, not a policy. In Claude Code, set **"Ask before ending a turn without a record"** to off in the plugin's configuration. In Codex CLI, start it with `ARROWAY_ENFORCE_CLOSING=false`; to disable all Codex hooks globally, set `[features] hooks = false` in the Codex configuration. The skill still teaches the protocol — only the interruption is disabled.

It is deliberately hard to get stuck on: it asks **at most once per turn**, closing your reply with the sentence *No durable residue.* satisfies it in one sentence, and any internal failure lets the turn through rather than blocking it — including a failure to remember that it already asked.

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

Run the package test before tagging:

```bash
node --experimental-strip-types --test test/plugin-package.test.ts
```

From the `plugin/` directory, let Claude Code derive and validate the release tag instead of creating it by hand:

```bash
claude plugin tag --dry-run
claude plugin tag --push
```

The command checks the package, refuses a dirty plugin tree, verifies that the plugin manifest and marketplace entry agree, and creates the `{plugin-name}--v{version}` tag. A fix is not released until that tag is pushed; changing files on the marketplace's default branch without changing the version does not update an existing install.
