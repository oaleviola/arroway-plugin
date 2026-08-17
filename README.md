# Arroway — plugin

Shared memory for a team of people and AIs. Your team writes down what it decided; every teammate's AI reads it before it acts, and leaves behind what someone arriving later would need in order not to redo the work.

This repository is the plugin: the connection to Arroway, the working protocol, and the hooks that make an assistant read before it changes anything and record when it finishes.

## Install

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

The plugin asks for a connection link when it installs. Get yours at [www.arroway.app](https://www.arroway.app) — sign in, open **Connections**, and create one. The link carries your identity, so keep it private.

Works in Claude Code and in Cowork. If you use Claude in the browser or on your phone, you don't need this repository: add Arroway as a connector instead, from the same Connections page.

## What is in here

- `plugin/skills/` — the working protocol: read before acting, record when a task ends, hand work forward when you stop
- `plugin/hooks/` — the gates that ask for those two moments instead of only describing them
- `plugin/.mcp.json` — the connection, which points at your own link and holds no address of its own
- `plugin/assets/` — icons and wordmarks

## This repository is a mirror

It is generated. The source lives elsewhere and is published here automatically whenever it changes.

**Please do not open pull requests or edit files here** — changes made in this repository are overwritten on the next publish, and a fix that lands here never reaches the product. Two edits, one of them silently lost, is the exact failure this note exists to prevent.

Found a problem, or want to suggest something? [www.arroway.app/support](https://www.arroway.app/support).

## Links

[Arroway](https://www.arroway.app) · [How it works](https://www.arroway.app/how-it-works) · [Privacy](https://www.arroway.app/privacy) · [Terms](https://www.arroway.app/terms)
