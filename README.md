# Arroway — plugin

Shared memory for a team of people and AIs. Your team writes down what it decided; every teammate's AI reads it before it acts, and leaves behind what someone arriving later would need in order not to redo the work.

This repository is the plugin: the connection to Arroway, the working protocol, and the hooks that make an assistant read before it changes anything and record when it finishes.

## Install

### Claude Code and Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

Nothing to paste. The package carries Arroway's own address. The first time the connector needs you, sign in in the browser: approve the connection as yourself, and the memory your assistant writes from then on carries your name.

### Cursor

Add this repository as a plugin marketplace in Cursor, then install **arroway** from the plugin list.

Nothing to paste here: the Cursor package carries Arroway's own address and signs you in through the browser the first time it needs you. Approve the connection as yourself, and the memory your assistant writes from then on carries your name.

### Claude in the browser or on your phone

You don't need this repository: add Arroway as a connector instead, from the same Connections page.

## What is in here

- `plugin/skills/` — the working protocol: read before acting, record when a task ends, hand work forward when you stop
- `plugin/hooks/` — the gates that ask for those two moments instead of only describing them
- `plugin/.mcp.json` — the Claude Code connection, which uses Arroway's own address; identity comes from signing in
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — the same package as Cursor reads it: its own manifest and hook format, Arroway's own address, no link to paste
- `plugin/assets/` — icons and wordmarks

## This repository is a mirror

It is generated. The source lives elsewhere and is published here automatically whenever it changes.

**Please do not open pull requests or edit files here** — changes made in this repository are overwritten on the next publish, and a fix that lands here never reaches the product. Two edits, one of them silently lost, is the exact failure this note exists to prevent.

Found a problem, or want to suggest something? [www.arroway.app/support](https://www.arroway.app/support).

## Links

[Arroway](https://www.arroway.app) · [How it works](https://www.arroway.app/how-it-works) · [Privacy](https://www.arroway.app/privacy) · [Terms](https://www.arroway.app/terms)
