# Arroway — plugin

**English** · [Español](#español) · [Português](#português)

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

Add `https://github.com/oaleviola/arroway-plugin` as a plugin marketplace in Cursor, then install **arroway** from the plugin list.

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

---

## Español

[English](#arroway--plugin) · **Español** · [Português](#português)

Memoria compartida para un equipo de personas e IAs. Tu equipo anota lo que decidió; la IA de cada persona lo lee antes de actuar, y deja atrás lo que alguien que llegue después necesitaría para no rehacer el trabajo.

Este repositorio es el plugin: la conexión con Arroway, el protocolo de trabajo, y los hooks que hacen que un asistente lea antes de cambiar nada y registre cuando termina.

### Instalación

#### Claude Code y Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

No hay nada que pegar. El paquete lleva la dirección de Arroway. La primera vez que el conector te necesite, entra desde el navegador: aprueba la conexión en tu propio nombre, y la memoria que tu asistente escriba desde entonces lleva tu nombre.

#### Cursor

Añade `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins en Cursor y luego instala **arroway** desde la lista de plugins.

Aquí tampoco hay nada que pegar: el paquete de Cursor lleva la dirección de Arroway y te hace entrar por el navegador la primera vez que te necesita. Aprueba la conexión en tu propio nombre, y la memoria que tu asistente escriba desde entonces lleva tu nombre.

#### Claude en el navegador o en el móvil

No necesitas este repositorio: añade Arroway como conector, desde la misma página de Conexiones.

### Qué hay aquí

- `plugin/skills/` — el protocolo de trabajo: leer antes de actuar, registrar cuando una tarea termina, pasar el trabajo adelante cuando te detienes
- `plugin/hooks/` — las compuertas que piden esos dos momentos, en vez de solo describirlos
- `plugin/.mcp.json` — la conexión de Claude Code, que usa la dirección de Arroway; la identidad viene de entrar
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — el mismo paquete tal como lo lee Cursor: su propio manifiesto y su propio formato de hooks, la dirección de Arroway, ningún enlace que pegar
- `plugin/assets/` — iconos y logotipos

### Este repositorio es un espejo

Es generado. La fuente vive en otro sitio y se publica aquí automáticamente cada vez que cambia.

**Por favor, no abras pull requests ni edites archivos aquí** — los cambios hechos en este repositorio se sobrescriben en la siguiente publicación, y un arreglo que aterrice aquí nunca llega al producto. Dos ediciones, una de ellas perdida en silencio, es exactamente el fallo que esta nota existe para evitar.

¿Encontraste un problema, o quieres sugerir algo? [www.arroway.app/es/support](https://www.arroway.app/es/support).

### Enlaces

[Arroway](https://www.arroway.app/es) · [Cómo funciona](https://www.arroway.app/es/how-it-works) · [Privacidad](https://www.arroway.app/es/privacy) · [Términos](https://www.arroway.app/es/terms)

---

## Português

[English](#arroway--plugin) · [Español](#español) · **Português**

Memória compartilhada para um time de pessoas e IAs. Seu time anota o que decidiu; a IA de cada pessoa lê isso antes de agir, e deixa para trás o que alguém que chegar depois precisaria para não refazer o trabalho.

Este repositório é o plugin: a conexão com a Arroway, o protocolo de trabalho, e os hooks que fazem um assistente ler antes de mudar qualquer coisa e registrar quando termina.

### Instalação

#### Claude Code e Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

Nada para colar. O pacote carrega o endereço da própria Arroway. Na primeira vez que o conector precisar de você, entre pelo navegador: aprove a conexão em seu próprio nome, e a memória que seu assistente escrever dali em diante leva o seu nome.

#### Cursor

Adicione `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins no Cursor e depois instale o **arroway** pela lista de plugins.

Aqui também não há nada para colar: o pacote do Cursor carrega o endereço da própria Arroway e faz você entrar pelo navegador na primeira vez que precisa. Aprove a conexão em seu próprio nome, e a memória que seu assistente escrever dali em diante leva o seu nome.

#### Claude no navegador ou no celular

Você não precisa deste repositório: adicione a Arroway como conector, pela mesma página de Conexões.

### O que tem aqui

- `plugin/skills/` — o protocolo de trabalho: ler antes de agir, registrar quando uma tarefa termina, passar o trabalho adiante quando você para
- `plugin/hooks/` — os portões que cobram esses dois momentos, em vez de só descrevê-los
- `plugin/.mcp.json` — a conexão do Claude Code, que usa o endereço da própria Arroway; a identidade vem de entrar
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — o mesmo pacote como o Cursor o lê: manifesto e formato de hooks próprios, o endereço da própria Arroway, nenhum link para colar
- `plugin/assets/` — ícones e logotipos

### Este repositório é um espelho

Ele é gerado. A fonte mora em outro lugar e é publicada aqui automaticamente sempre que muda.

**Por favor, não abra pull requests nem edite arquivos aqui** — mudanças feitas neste repositório são sobrescritas na publicação seguinte, e um conserto que aterrissa aqui nunca chega ao produto. Duas edições, uma delas perdida em silêncio, é exatamente a falha que esta nota existe para evitar.

Encontrou um problema, ou quer sugerir alguma coisa? [www.arroway.app/pt-BR/support](https://www.arroway.app/pt-BR/support).

### Links

[Arroway](https://www.arroway.app/pt-BR) · [Como funciona](https://www.arroway.app/pt-BR/how-it-works) · [Privacidade](https://www.arroway.app/pt-BR/privacy) · [Termos](https://www.arroway.app/pt-BR/terms)
