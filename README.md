# Arroway — plugin

[Arroway](https://www.arroway.app) orchestrates people and AI agents around the decisions in force.

**English** · [Español](#español) · [Português](#português) · [Français](#français)

Your team writes down what it decided; every teammate's AI reads it before it acts, and leaves behind what someone arriving later would need in order not to redo the work.

This repository is the plugin: the connection to Arroway, the working protocol, and the hooks that make an assistant read before it changes anything and record when it finishes.

## Install

### Claude Code and Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

Nothing to paste, and no separate connector to install: the package carries the connection to Arroway's own address. It starts signed out, so sign in once. In Claude Code, run `/mcp`, choose `plugin:arroway:arroway` and follow the sign-in in the browser. Approve the connection as yourself, and the memory your assistant writes from then on carries your name. Until you sign in, Arroway's tools do not appear and nothing is read or recorded. If Arroway is already connected to your Claude account as a connector and its tools already show up, you can skip this step.

### Cursor

Add `https://github.com/oaleviola/arroway-plugin` as a plugin marketplace in Cursor, then install **arroway** from the plugin list.

Nothing to paste here: the Cursor package carries Arroway's own address and signs you in through the browser the first time it needs you. Approve the connection as yourself, and the memory your assistant writes from then on carries your name.

### Claude in the browser or on your phone

You don't need this repository: add Arroway as a connector instead, from the same Connections page.

### The skill alone, in any agent that reads skills

If your agent reads agent skills but there is no Arroway plugin for it, add the workflow skill with the [skills](https://skills.sh) CLI:

```
npx skills add oaleviola/arroway-plugin
```

The skill teaches your agent to read Arroway before acting and to close each task. It still needs Arroway connected as an MCP server at `https://www.arroway.app/api/mcp`. Where your client has the plugin, use the plugin: it brings the connection and the hooks too.

### Asking an AI agent to install it

Point it to [llms-install.md](llms-install.md): the steps for each client, written for an agent, Cline and any other MCP client included.

## Usage

Once you are signed in there is nothing to call by hand: the skill tells your assistant when to use Arroway. It happens at four moments, and this is what each one looks like.

### Examples

1. **Before it acts.** You ask: *"Draft the pricing page for the new plan."* The assistant first calls `arroway_read` for your project and answers from what the team already decided. If two decisions conflict, it tells you instead of picking one.
2. **Before it commits to a claim.** `arroway_norms` returns what is already decided, at a fraction of the cost of a full read, right before the assistant tells you something or proposes a course of action.
3. **When it finishes.** `arroway_log` records what someone arriving later would need in order not to redo the work. If nothing durable came out of the task, the assistant says so in one sentence: *No durable residue.*
4. **When it stops without finishing.** `arroway_pass` leaves where the work stands, the single next step, what must not be redone and the risk still open. The next person's assistant finds it at the top of its first read and takes it with `arroway_claim`.

You can also ask for these directly:

- *"Catch me up on what happened across my projects this week."* — `arroway_catch_up`
- *"Where did we talk about the pricing change?"* — `arroway_search_log`
- *"Remember that we don't discount annual plans."* — `arroway_remember`. What you state yourself is recorded as your decision; what an assistant proposes on its own waits for a person to approve it.

A short example: one assistant researches a pricing change and records a proposal. A person approves the decision. Another assistant drafts the pricing page using that decision, and the next person can see what was decided, who approved it and what remains open.

### What it looks like

Screens from a demo account with sample data.

**What waits for you, across projects.** Decisions an assistant proposed sit in one place until a person decides.

![The Arroway home screen: two decisions wait for the person, with the list of projects, recent activity and connected AIs](screenshots/01-decisions-wait-for-you.png)

**Inside a project.** An assistant's proposals wait for approval (approve, approve and pin, reject or correct), and the rules the team pinned are what every connected assistant reads first.

![An Arroway project: two proposals waiting for a decision, and three pinned rules about money movement](screenshots/02-project-proposals-and-rules.png)

**Your own standing rules.** How you work travels with you into every project, and no one else sees it.

![A personal space in Arroway with two pinned memories: a preference for short answers and a rule to give the number before the recommendation](screenshots/03-personal-standing-rules.png)

## What is in here

- `plugin/skills/` — the working protocol: read before acting, record when a task ends, hand work forward when you stop
- `plugin/hooks/` — the gates that ask for those two moments instead of only describing them, and for a check of the text before something is published for other people
- `plugin/.mcp.json` — the Claude Code connection, which uses Arroway's own address; identity comes from signing in
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — the same package as Cursor reads it: its own manifest and hook format, Arroway's own address, no link to paste
- `plugin/assets/` — icons and wordmarks

## Permission requests

The plugin's permission hook (Claude Code and Codex) exists only so you can answer, from your own Arroway cockpit, a permission request your agent made. It never approves anything on its own. An approval is valid for that one request only: the hook fingerprints the exact request on your machine and accepts an "allow" only when it comes back bound to that fingerprint and to a single-use code, signed with the session's credential. Without your answer — or with the cockpit off, the server unreachable, or anything that does not match — the window asks as usual. You can also deny from the cockpit, and every decision is recorded.

## This repository is a mirror

It is generated. The source lives elsewhere and is published here automatically whenever it changes.

**Please do not open pull requests or edit files here** — changes made in this repository are overwritten on the next publish, and a fix that lands here never reaches the product. Two edits, one of them silently lost, is the exact failure this note exists to prevent.

Found a problem, or want to suggest something? [www.arroway.app/support](https://www.arroway.app/support). For a security problem, see [SECURITY.md](SECURITY.md). How to help is in [CONTRIBUTING.md](CONTRIBUTING.md), and everyone here follows the [code of conduct](CODE_OF_CONDUCT.md).

## Links

[Arroway](https://www.arroway.app) · [How it works](https://www.arroway.app/how-it-works) · [Privacy](https://www.arroway.app/privacy) · [Terms](https://www.arroway.app/terms) · [Changelog](CHANGELOG.md#english)

---

## Español

[English](#arroway--plugin) · **Español** · [Português](#português) · [Français](#français)

[Arroway](https://www.arroway.app/es) coordina a personas y agentes de IA en torno a las decisiones vigentes. Tu equipo anota lo que decidió; la IA de cada persona lo lee antes de actuar, y deja atrás lo que alguien que llegue después necesitaría para no rehacer el trabajo.

Este repositorio es el plugin: la conexión con Arroway, el protocolo de trabajo, y los hooks que hacen que un asistente lea antes de cambiar nada y registre cuando termina.

### Instalación

#### Claude Code y Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

No hay nada que pegar, ni un conector aparte que instalar: el paquete lleva la conexión con la dirección de Arroway. Empieza sin sesión iniciada, así que entra una sola vez. En Claude Code, ejecuta `/mcp`, elige `plugin:arroway:arroway` y sigue el inicio de sesión en el navegador. Aprueba la conexión en tu propio nombre, y la memoria que tu asistente escriba desde entonces lleva tu nombre. Hasta que entres, las herramientas de Arroway no aparecen y no se lee ni se registra nada. Si Arroway ya está conectada a tu cuenta de Claude como conector y sus herramientas ya aparecen, puedes saltarte este paso.

#### Cursor

Añade `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins en Cursor y luego instala **arroway** desde la lista de plugins.

Aquí tampoco hay nada que pegar: el paquete de Cursor lleva la dirección de Arroway y te hace entrar por el navegador la primera vez que te necesita. Aprueba la conexión en tu propio nombre, y la memoria que tu asistente escriba desde entonces lleva tu nombre.

#### Claude en el navegador o en el móvil

No necesitas este repositorio: añade Arroway como conector, desde la misma página de Conexiones.

#### Solo la skill, en cualquier agente que lea skills

Si tu agente lee skills pero no hay plugin de Arroway para él, añade la skill de trabajo con la CLI de [skills](https://skills.sh):

```
npx skills add oaleviola/arroway-plugin
```

La skill le enseña a tu agente a leer Arroway antes de actuar y a cerrar cada tarea. Sigue necesitando Arroway conectada como servidor MCP en `https://www.arroway.app/api/mcp`. Donde tu cliente tiene el plugin, usa el plugin: trae también la conexión y los hooks.

#### Si se lo pides a un agente de IA

Muéstrale [llms-install.md](llms-install.md): los pasos de cada cliente, escritos para un agente, incluidos Cline y cualquier otro cliente MCP.

### Uso

Una vez que has entrado, no hay nada que invocar a mano: la skill le dice a tu asistente cuándo usar Arroway. Ocurre en cuatro momentos, y así se ve cada uno.

#### Ejemplos

1. **Antes de actuar.** Tú pides: *«Redacta la página de precios del plan nuevo».* El asistente primero llama a `arroway_read` para tu proyecto y responde a partir de lo que el equipo ya decidió. Si dos decisiones se contradicen, te lo dice en vez de elegir una.
2. **Antes de afirmar algo.** `arroway_norms` devuelve lo que ya está decidido, por una fracción del costo de una lectura completa, justo antes de que el asistente te diga algo o proponga un camino.
3. **Al terminar.** `arroway_log` registra lo que alguien que llegue después necesitaría para no rehacer el trabajo. Si de la tarea no salió nada duradero, el asistente lo dice en una frase: *No durable residue.*
4. **Al parar sin terminar.** `arroway_pass` deja dónde está el trabajo, el único paso siguiente, lo que no se debe rehacer y el riesgo que sigue abierto. El asistente de la siguiente persona lo encuentra al principio de su primera lectura y lo toma con `arroway_claim`.

También puedes pedir estas cosas directamente:

- *«Ponme al día con lo que pasó esta semana en mis proyectos».* — `arroway_catch_up`
- *«¿Dónde hablamos del cambio de precios?»* — `arroway_search_log`
- *«Recuerda que no hacemos descuento en los planes anuales».* — `arroway_remember`. Lo que dices tú queda registrado como decisión tuya; lo que un asistente propone por su cuenta espera a que una persona lo apruebe.

Un ejemplo corto: un asistente investiga un cambio de precios y registra una propuesta. Una persona aprueba la decisión. Otro asistente redacta la página de precios usando esa decisión, y la siguiente persona puede ver qué se decidió, quién lo aprobó y qué sigue abierto.

#### Cómo se ve

Pantallas de una cuenta de demostración con datos de ejemplo (la interfaz de las capturas está en inglés).

**Lo que te espera, entre proyectos.** Las decisiones que un asistente propuso esperan en un solo lugar hasta que una persona decide.

![La pantalla de inicio de Arroway: dos decisiones esperan a la persona, con la lista de proyectos, la actividad reciente y las IAs conectadas](screenshots/01-decisions-wait-for-you.png)

**Dentro de un proyecto.** Las propuestas de un asistente esperan aprobación (aprobar, aprobar y fijar, rechazar o corregir), y las reglas que el equipo fijó son lo primero que lee cada asistente conectado.

![Un proyecto de Arroway: dos propuestas esperando decisión y tres reglas fijadas sobre movimiento de dinero](screenshots/02-project-proposals-and-rules.png)

**Tus reglas permanentes.** Tu forma de trabajar te acompaña a cada proyecto, y nadie más la ve.

![Un espacio personal en Arroway con dos memorias fijadas: una preferencia por respuestas cortas y una regla de dar el número antes de la recomendación](screenshots/03-personal-standing-rules.png)

### Qué hay aquí

- `plugin/skills/` — el protocolo de trabajo: leer antes de actuar, registrar cuando una tarea termina, pasar el trabajo adelante cuando te detienes
- `plugin/hooks/` — las compuertas que piden esos dos momentos, en vez de solo describirlos, y una revisión del texto antes de publicar algo para otras personas
- `plugin/.mcp.json` — la conexión de Claude Code, que usa la dirección de Arroway; la identidad viene de entrar
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — el mismo paquete tal como lo lee Cursor: su propio manifiesto y su propio formato de hooks, la dirección de Arroway, ningún enlace que pegar
- `plugin/assets/` — iconos y logotipos

### Pedidos de permiso

El hook de permiso del plugin (Claude Code y Codex) existe solo para que respondas, desde tu propio cockpit de Arroway, un pedido de permiso que hizo tu agente. Nunca aprueba nada por sí solo. Una aprobación vale solo para ese pedido: el hook calcula en tu máquina la huella del pedido exacto y acepta un "allow" solo si vuelve atado a esa huella y a un código de un solo uso, firmado con la credencial de la sesión. Sin tu respuesta — o con el cockpit apagado, el servidor inalcanzable o cualquier cosa que no coincida — la ventana pregunta como siempre. También puedes denegar desde el cockpit, y cada decisión queda registrada.

### Este repositorio es un espejo

Es generado. La fuente vive en otro sitio y se publica aquí automáticamente cada vez que cambia.

**Por favor, no abras pull requests ni edites archivos aquí** — los cambios hechos en este repositorio se sobrescriben en la siguiente publicación, y un arreglo que aterrice aquí nunca llega al producto. Dos ediciones, una de ellas perdida en silencio, es exactamente el fallo que esta nota existe para evitar.

¿Encontraste un problema, o quieres sugerir algo? [www.arroway.app/es/support](https://www.arroway.app/es/support). Para un problema de seguridad, mira [SECURITY.md](SECURITY.md). Cómo ayudar está en [CONTRIBUTING.md](CONTRIBUTING.md), y todas las personas aquí siguen el [código de conducta](CODE_OF_CONDUCT.md).

### Enlaces

[Arroway](https://www.arroway.app/es) · [Cómo funciona](https://www.arroway.app/es/how-it-works) · [Privacidad](https://www.arroway.app/es/privacy) · [Términos](https://www.arroway.app/es/terms) · [Cambios por versión](CHANGELOG.md#español)

---

## Português

[English](#arroway--plugin) · [Español](#español) · **Português** · [Français](#français)

A [Arroway](https://www.arroway.app/pt-BR) coordena pessoas e agentes de IA em torno das decisões que estão valendo. Seu time anota o que decidiu; a IA de cada pessoa lê isso antes de agir, e deixa para trás o que alguém que chegar depois precisaria para não refazer o trabalho.

Este repositório é o plugin: a conexão com a Arroway, o protocolo de trabalho, e os hooks que fazem um assistente ler antes de mudar qualquer coisa e registrar quando termina.

### Instalação

#### Claude Code e Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

Nada para colar, e nenhum conector separado para instalar: o pacote já traz a conexão com o endereço da própria Arroway. Ela começa sem login, então entre uma vez só. No Claude Code, rode `/mcp`, escolha `plugin:arroway:arroway` e siga o login no navegador. Aprove a conexão em seu próprio nome, e a memória que seu assistente escrever dali em diante leva o seu nome. Enquanto você não entrar, as ferramentas da Arroway não aparecem e nada é lido nem registrado. Se a Arroway já está conectada à sua conta do Claude como conector e as ferramentas dela já aparecem, você pode pular este passo.

#### Cursor

Adicione `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins no Cursor e depois instale o **arroway** pela lista de plugins.

Aqui também não há nada para colar: o pacote do Cursor carrega o endereço da própria Arroway e faz você entrar pelo navegador na primeira vez que precisa. Aprove a conexão em seu próprio nome, e a memória que seu assistente escrever dali em diante leva o seu nome.

#### Claude no navegador ou no celular

Você não precisa deste repositório: adicione a Arroway como conector, pela mesma página de Conexões.

#### Só a skill, em qualquer agente que leia skills

Se o seu agente lê skills mas não há plugin da Arroway para ele, adicione a skill de trabalho pela CLI do [skills](https://skills.sh):

```
npx skills add oaleviola/arroway-plugin
```

A skill ensina o seu agente a ler a Arroway antes de agir e a fechar cada tarefa. Ela continua precisando da Arroway conectada como servidor MCP em `https://www.arroway.app/api/mcp`. Onde o seu cliente tem o plugin, use o plugin: ele traz também a conexão e os hooks.

#### Se quem instala é um agente de IA

Aponte para o [llms-install.md](llms-install.md): os passos de cada cliente, escritos para um agente, inclusive o Cline e qualquer outro cliente MCP.

### Uso

Depois que você entrou, não há nada para chamar na mão: a skill diz ao seu assistente quando usar a Arroway. Acontece em quatro momentos, e é assim que cada um aparece.

#### Exemplos

1. **Antes de agir.** Você pede: *"Escreva a página de preços do plano novo."* O assistente primeiro chama `arroway_read` para o seu projeto e responde a partir do que o time já decidiu. Se duas decisões se contradizem, ele avisa em vez de escolher uma.
2. **Antes de afirmar algo.** `arroway_norms` devolve o que já está decidido, por uma fração do custo de uma leitura completa, logo antes de o assistente te dizer algo ou propor um caminho.
3. **Ao terminar.** `arroway_log` registra o que alguém que chegar depois precisaria para não refazer o trabalho. Se da tarefa não saiu nada duradouro, o assistente diz isso em uma frase: *No durable residue.*
4. **Ao parar sem terminar.** `arroway_pass` deixa onde o trabalho está, o único próximo passo, o que não deve ser refeito e o risco que continua aberto. O assistente da próxima pessoa encontra isso no topo da primeira leitura e assume com `arroway_claim`.

Você também pode pedir essas coisas direto:

- *"Me atualize sobre o que aconteceu esta semana nos meus projetos."* — `arroway_catch_up`
- *"Onde a gente falou da mudança de preço?"* — `arroway_search_log`
- *"Lembre que a gente não dá desconto no plano anual."* — `arroway_remember`. O que você mesmo afirma fica registrado como decisão sua; o que um assistente propõe por conta própria espera uma pessoa aprovar.

Um exemplo curto: um assistente pesquisa uma mudança de preço e registra uma proposta. Uma pessoa aprova a decisão. Outro assistente escreve a página de preços usando essa decisão, e a próxima pessoa vê o que foi decidido, quem aprovou e o que continua em aberto.

#### Como fica

Telas de uma conta de demonstração com dados de exemplo (a interface dos prints está em inglês).

**O que espera por você, entre projetos.** As decisões que um assistente propôs ficam num lugar só até uma pessoa decidir.

![A tela inicial da Arroway: duas decisões esperam a pessoa, com a lista de projetos, a atividade recente e as IAs conectadas](screenshots/01-decisions-wait-for-you.png)

**Dentro de um projeto.** As propostas de um assistente esperam aprovação (aprovar, aprovar e fixar, rejeitar ou corrigir), e as regras que o time fixou são o que todo assistente conectado lê primeiro.

![Um projeto da Arroway: duas propostas esperando decisão e três regras fixadas sobre movimentação de dinheiro](screenshots/02-project-proposals-and-rules.png)

**Suas regras permanentes.** Seu jeito de trabalhar vai com você para cada projeto, e mais ninguém o vê.

![Um espaço pessoal na Arroway com duas memórias fixadas: uma preferência por respostas curtas e uma regra de dar o número antes da recomendação](screenshots/03-personal-standing-rules.png)

### O que tem aqui

- `plugin/skills/` — o protocolo de trabalho: ler antes de agir, registrar quando uma tarefa termina, passar o trabalho adiante quando você para
- `plugin/hooks/` — os portões que cobram esses dois momentos, em vez de só descrevê-los, e uma conferência do texto antes de publicar algo para outras pessoas
- `plugin/.mcp.json` — a conexão do Claude Code, que usa o endereço da própria Arroway; a identidade vem de entrar
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — o mesmo pacote como o Cursor o lê: manifesto e formato de hooks próprios, o endereço da própria Arroway, nenhum link para colar
- `plugin/assets/` — ícones e logotipos

### Pedidos de permissão

O gancho de permissão do plugin (Claude Code e Codex) existe só para você responder, do seu próprio cockpit da Arroway, um pedido de permissão que o seu agente fez. Ele nunca aprova nada sozinho. Uma aprovação vale só para aquele pedido: o gancho calcula na sua máquina a impressão do pedido exato e só aceita um "allow" que volte preso a essa impressão e a um código de uso único, assinado com a credencial da sessão. Sem a sua resposta — ou com o cockpit desligado, o servidor fora do ar ou qualquer coisa que não confira — a janela pergunta como sempre. Você também pode negar pelo cockpit, e toda decisão fica registrada.

### Este repositório é um espelho

Ele é gerado. A fonte mora em outro lugar e é publicada aqui automaticamente sempre que muda.

**Por favor, não abra pull requests nem edite arquivos aqui** — mudanças feitas neste repositório são sobrescritas na publicação seguinte, e um conserto que aterrissa aqui nunca chega ao produto. Duas edições, uma delas perdida em silêncio, é exatamente a falha que esta nota existe para evitar.

Encontrou um problema, ou quer sugerir alguma coisa? [www.arroway.app/pt-BR/support](https://www.arroway.app/pt-BR/support). Para um problema de segurança, veja o [SECURITY.md](SECURITY.md). Como ajudar está no [CONTRIBUTING.md](CONTRIBUTING.md), e todo mundo aqui segue o [código de conduta](CODE_OF_CONDUCT.md).

### Links

[Arroway](https://www.arroway.app/pt-BR) · [Como funciona](https://www.arroway.app/pt-BR/how-it-works) · [Privacidade](https://www.arroway.app/pt-BR/privacy) · [Termos](https://www.arroway.app/pt-BR/terms) · [Mudanças por versão](CHANGELOG.md#português)


---

## Français

[English](#arroway--plugin) · [Español](#español) · [Português](#português) · **Français**

[Arroway](https://www.arroway.app/fr) orchestre les personnes et les agents IA autour des décisions en vigueur. Votre équipe note ce qu’elle a décidé ; l’IA de chaque personne le lit avant d’agir, et laisse derrière elle ce dont quelqu’un qui arrive après aurait besoin pour ne pas refaire le travail.

Ce dépôt est le plugin : la connexion à Arroway, le protocole de travail, et les hooks qui font qu’un assistant lit avant de rien modifier et consigne quand il termine.

### Installation

#### Claude Code et Cowork

```
claude plugin marketplace add oaleviola/arroway-plugin
```

```
claude plugin install arroway@arroway
```

Rien à coller, et aucun connecteur séparé à installer : le paquet porte déjà la connexion vers l’adresse d’Arroway. Il démarre déconnecté, alors connectez-vous une seule fois. Dans Claude Code, lancez `/mcp`, choisissez `plugin:arroway:arroway` et suivez la connexion dans le navigateur. Approuvez la connexion en votre propre nom, et la mémoire que votre assistant écrira dès lors porte votre nom. Tant que vous ne vous êtes pas connecté·e, les outils d’Arroway n’apparaissent pas et rien n’est lu ni consigné. Si Arroway est déjà connectée à votre compte Claude comme connecteur et que ses outils apparaissent déjà, vous pouvez sauter cette étape.

#### Cursor

Ajoutez `https://github.com/oaleviola/arroway-plugin` comme marketplace de plugins dans Cursor, puis installez **arroway** depuis la liste des plugins.

Ici non plus, rien à coller : le paquet de Cursor porte l’adresse d’Arroway et vous fait passer par le navigateur la première fois qu’il a besoin de vous. Approuvez la connexion en votre propre nom, et la mémoire que votre assistant écrira dès lors porte votre nom.

#### Claude dans le navigateur ou sur mobile

Vous n’avez pas besoin de ce dépôt : ajoutez Arroway comme connecteur, depuis la même page Connexions.

#### La skill seule, dans tout agent qui lit des skills

Si votre agent lit des skills mais qu’il n’existe pas de plugin Arroway pour lui, ajoutez la skill de travail avec la CLI [skills](https://skills.sh) :

```
npx skills add oaleviola/arroway-plugin
```

La skill apprend à votre agent à lire Arroway avant d’agir et à clore chaque tâche. Elle exige toujours qu’Arroway soit connectée comme serveur MCP à l’adresse `https://www.arroway.app/api/mcp`. Là où votre client a le plugin, utilisez le plugin : il apporte aussi la connexion et les hooks.

#### Si c’est un agent IA qui installe

Indiquez-lui [llms-install.md](llms-install.md) : les étapes de chaque client, écrites pour un agent, Cline et tout autre client MCP compris.

### Utilisation

Une fois connecté·e, il n’y a rien à appeler à la main : la skill dit à votre assistant quand utiliser Arroway. Cela se produit à quatre moments, et voici à quoi chacun ressemble.

#### Exemples

1. **Avant d’agir.** Vous demandez : *« Rédigez la page de tarifs du nouveau forfait. »* L’assistant appelle d’abord `arroway_read` pour votre projet et répond à partir de ce que l’équipe a déjà décidé. Si deux décisions se contredisent, il vous le dit au lieu d’en choisir une.
2. **Avant d’affirmer quelque chose.** `arroway_norms` renvoie ce qui est déjà décidé, pour une fraction du coût d’une lecture complète, juste avant que l’assistant vous dise quelque chose ou propose une direction.
3. **En terminant.** `arroway_log` consigne ce dont quelqu’un qui arrive après aurait besoin pour ne pas refaire le travail. Si rien de durable n’est sorti de la tâche, l’assistant le dit en une phrase : *No durable residue.*
4. **En s’arrêtant sans avoir fini.** `arroway_pass` laisse l’état du travail, l’unique étape suivante, ce qu’il ne faut pas refaire et le risque qui reste ouvert. L’assistant de la personne suivante le trouve en tête de sa première lecture et le prend avec `arroway_claim`.

Vous pouvez aussi demander ces choses directement :

- *« Mettez-moi à jour sur ce qui s’est passé cette semaine dans mes projets. »* — `arroway_catch_up`
- *« Où avons-nous parlé du changement de prix ? »* — `arroway_search_log`
- *« Retenez que nous ne faisons pas de remise sur les forfaits annuels. »* — `arroway_remember`. Ce que vous affirmez vous-même est consigné comme votre décision ; ce qu’un assistant propose de sa propre initiative attend qu’une personne l’approuve.

Un exemple court : un assistant étudie un changement de prix et consigne une proposition. Une personne approuve la décision. Un autre assistant rédige la page de tarifs à partir de cette décision, et la personne suivante peut voir ce qui a été décidé, qui l’a approuvé et ce qui reste ouvert.

#### À quoi cela ressemble

Écrans d’un compte de démonstration avec des données d’exemple (l’interface des captures est en anglais).

**Ce qui vous attend, entre les projets.** Les décisions qu’un assistant a proposées attendent au même endroit qu’une personne tranche.

![L’écran d’accueil d’Arroway : deux décisions attendent la personne, avec la liste des projets, l’activité récente et les IA connectées](screenshots/01-decisions-wait-for-you.png)

**Dans un projet.** Les propositions d’un assistant attendent d’être approuvées (approuver, approuver et épingler, rejeter ou corriger), et les règles que l’équipe a épinglées sont ce que tout assistant connecté lit en premier.

![Un projet Arroway : deux propositions en attente de décision et trois règles épinglées sur les mouvements d’argent](screenshots/02-project-proposals-and-rules.png)

**Vos règles permanentes.** Votre façon de travailler vous suit dans chaque projet, et personne d’autre ne la voit.

![Un espace personnel dans Arroway avec deux mémoires épinglées : une préférence pour les réponses courtes et une règle qui demande de donner le chiffre avant la recommandation](screenshots/03-personal-standing-rules.png)

### Ce qu’il y a ici

- `plugin/skills/` — le protocole de travail : lire avant d’agir, consigner quand une tâche se termine, passer le relais quand on s’arrête
- `plugin/hooks/` — les verrous qui exigent ces deux moments au lieu de seulement les décrire, et une relecture du texte avant de publier quelque chose pour d’autres personnes
- `plugin/.mcp.json` — la connexion de Claude Code, qui utilise l’adresse d’Arroway ; l’identité vient de la connexion
- `plugin/.cursor-plugin/`, `plugin/cursor-mcp.json`, `plugin/hooks/cursor-hooks.json` — le même paquet tel que Cursor le lit : son propre manifeste et son propre format de hooks, l’adresse d’Arroway, aucun lien à coller
- `plugin/assets/` — icônes et logotypes

### Demandes d’autorisation

Le hook d’autorisation du plugin (Claude Code et Codex) n’existe que pour que vous répondiez, depuis votre propre cockpit Arroway, à une demande d’autorisation faite par votre agent. Il n’approuve jamais rien de lui-même. Une approbation ne vaut que pour cette demande : le hook calcule sur votre machine l’empreinte de la demande exacte et n’accepte un « allow » que s’il revient lié à cette empreinte et à un code à usage unique, signé avec les identifiants de la session. Sans votre réponse — ou si le cockpit est éteint, le serveur injoignable ou que quoi que ce soit ne correspond pas — la fenêtre demande comme d’habitude. Vous pouvez aussi refuser depuis le cockpit, et chaque décision est consignée.

### Ce dépôt est un miroir

Il est généré. La source se trouve ailleurs et est publiée ici automatiquement chaque fois qu’elle change.

**Merci de ne pas ouvrir de pull requests ni de modifier des fichiers ici** — les changements faits dans ce dépôt sont écrasés à la publication suivante, et un correctif qui atterrit ici n’atteint jamais le produit. Deux modifications, dont l’une perdue en silence, c’est exactement l’échec que cette note existe pour éviter.

Vous avez trouvé un problème, ou vous voulez suggérer quelque chose ? [www.arroway.app/fr/support](https://www.arroway.app/fr/support). Pour un problème de sécurité, voyez [SECURITY.md](SECURITY.md). La façon d’aider est dans [CONTRIBUTING.md](CONTRIBUTING.md), et toutes les personnes ici suivent le [code de conduite](CODE_OF_CONDUCT.md).

### Liens

[Arroway](https://www.arroway.app/fr) · [Comment ça marche](https://www.arroway.app/fr/how-it-works) · [Confidentialité](https://www.arroway.app/fr/privacy) · [Conditions](https://www.arroway.app/fr/terms) · [Changements par version](CHANGELOG.md)
