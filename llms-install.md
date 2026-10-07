# Installing Arroway — for AI agents

[Arroway](https://www.arroway.app) orchestrates people and AI agents around the decisions in force.

**English** · [Español](#español) · [Português](#português)

You are an AI agent asked to install Arroway. Read this whole file before acting; the steps are short.

## What you are installing

- Arroway is a remote MCP server at `https://www.arroway.app/api/mcp` (Streamable HTTP). There is nothing to clone, build or run on this machine.
- There is no API key, token, header or environment variable. The person signs in once in the browser (OAuth) and approves the connection as themselves. Do not ask them for a key, and do not invent one.
- Where the client has a plugin, install the plugin: it carries the same connection, plus what makes every session start by reading what is in force and end by recording what was done.
- Do not copy Arroway's instructions into CLAUDE.md, AGENTS.md, `.clinerules` or any other instruction file. The plugin's skill and the server's own instructions carry them.

## Steps by client

### Claude Code

```
/plugin marketplace add oaleviola/arroway-plugin
/plugin install arroway@arroway
```

If the summary says `Run /reload-plugins to activate.`, run it. Then the person signs in: `/mcp`, choose `plugin:arroway:arroway`, and finish in the browser.

### Claude app and Cowork

The person does this, not you: Customize → Plugins → search for Arroway → Add (https://claude.ai/customize/plugins), then a new conversation. If it does not show up, add the marketplace `oaleviola/arroway-plugin` on that same screen.

### Cursor

Add `https://github.com/oaleviola/arroway-plugin` as a plugin marketplace, then install **arroway** from the plugin list. The sign-in opens in the browser the first time.

### Codex

```
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Then start a new task.

### Gemini CLI

```
gemini extensions install https://github.com/oaleviola/arroway-plugin
```

Then, in a Gemini CLI session, run `/mcp auth arroway` to sign in.

### Cline and any other MCP client

Add a remote server over Streamable HTTP. In Cline, in `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "arroway": {
      "type": "streamableHttp",
      "url": "https://www.arroway.app/api/mcp"
    }
  }
}
```

No headers. Some clients list the tools before anyone signs in; every call still needs the person's sign-in, which the server asks for over OAuth. If the client cannot sign in with OAuth, every call is refused: tell the person instead of retrying.

If the client reads agent skills and has no Arroway plugin, also add the workflow skill: `npx skills add oaleviola/arroway-plugin`. It does not replace the server above.

## Check that it worked

Call `arroway_catch_up`. Once the person is signed in, it answers with their projects and what happened in them recently.

---

## Español

[English](#installing-arroway--for-ai-agents) · **Español** · [Português](#português)

[Arroway](https://www.arroway.app/es) coordina a personas y agentes de IA en torno a las decisiones vigentes.

Eres un agente de IA al que le pidieron instalar Arroway. Lee el archivo entero antes de actuar; los pasos son cortos.

### Qué estás instalando

- Arroway es un servidor MCP remoto en `https://www.arroway.app/api/mcp` (Streamable HTTP). No hay nada que clonar, compilar ni ejecutar en esta máquina.
- No hay clave de API, token, cabecera ni variable de entorno. La persona inicia sesión una vez en el navegador (OAuth) y aprueba la conexión en su propio nombre. No le pidas una clave ni inventes una.
- Donde el cliente tiene plugin, instala el plugin: lleva la misma conexión y lo que hace que cada sesión empiece leyendo lo que está vigente y termine registrando lo que se hizo.
- No copies las instrucciones de Arroway en CLAUDE.md, AGENTS.md, `.clinerules` ni en ningún otro archivo de instrucciones. Las llevan la skill del plugin y las instrucciones del propio servidor.

### Pasos por cliente

#### Claude Code

```
/plugin marketplace add oaleviola/arroway-plugin
/plugin install arroway@arroway
```

Si el resumen dice `Run /reload-plugins to activate.`, ejecútalo. Luego la persona inicia sesión: `/mcp`, elige `plugin:arroway:arroway` y termina en el navegador.

#### App de Claude y Cowork

Esto lo hace la persona, no tú: Personalizar → Plugins → busca Arroway → Añadir (https://claude.ai/customize/plugins), y después una conversación nueva. Si no aparece, añade el marketplace `oaleviola/arroway-plugin` en esa misma pantalla.

#### Cursor

Añade `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins y luego instala **arroway** desde la lista de plugins. El inicio de sesión se abre en el navegador la primera vez.

#### Codex

```
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Después, empieza una tarea nueva.

#### Gemini CLI

```
gemini extensions install https://github.com/oaleviola/arroway-plugin
```

Después, en una sesión de Gemini CLI, ejecuta `/mcp auth arroway` para iniciar sesión.

#### Cline y cualquier otro cliente MCP

Añade un servidor remoto por Streamable HTTP. En Cline, en `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "arroway": {
      "type": "streamableHttp",
      "url": "https://www.arroway.app/api/mcp"
    }
  }
}
```

Sin cabeceras. Algunos clientes muestran las herramientas antes de que alguien inicie sesión; aun así, cada llamada necesita que la persona inicie sesión, y el servidor lo pide por OAuth. Si el cliente no sabe iniciar sesión con OAuth, toda llamada se rechaza: díselo a la persona en vez de reintentar.

Si el cliente lee skills de agente y no tiene plugin de Arroway, añade también la skill de trabajo: `npx skills add oaleviola/arroway-plugin`. No sustituye al servidor de arriba.

### Comprueba que funcionó

Llama a `arroway_catch_up`. Con la sesión de la persona iniciada, responde con sus proyectos y lo que pasó en ellos últimamente.

---

## Português

[English](#installing-arroway--for-ai-agents) · [Español](#español) · **Português**

A [Arroway](https://www.arroway.app/pt-BR) coordena pessoas e agentes de IA em torno das decisões que estão valendo.

Você é um agente de IA a quem pediram para instalar a Arroway. Leia o arquivo inteiro antes de agir; os passos são curtos.

### O que você está instalando

- A Arroway é um servidor MCP remoto em `https://www.arroway.app/api/mcp` (Streamable HTTP). Não há nada para clonar, compilar nem rodar nesta máquina.
- Não existe chave de API, token, cabeçalho nem variável de ambiente. A pessoa entra uma vez pelo navegador (OAuth) e aprova a conexão em nome próprio. Não peça uma chave a ela nem invente uma.
- Onde o cliente tem plugin, instale o plugin: ele traz a mesma conexão e o que faz cada sessão começar lendo o que está valendo e terminar registrando o que foi feito.
- Não copie as instruções da Arroway para o CLAUDE.md, o AGENTS.md, o `.clinerules` nem nenhum outro arquivo de instruções. Elas já viajam na skill do plugin e nas instruções do próprio servidor.

### Passos por cliente

#### Claude Code

```
/plugin marketplace add oaleviola/arroway-plugin
/plugin install arroway@arroway
```

Se o resumo disser `Run /reload-plugins to activate.`, rode. Depois a pessoa entra: `/mcp`, escolha `plugin:arroway:arroway` e termine no navegador.

#### App do Claude e Cowork

Quem faz é a pessoa, não você: Personalização → Plugins → procure Arroway → Adicionar (https://claude.ai/customize/plugins), e depois uma conversa nova. Se não aparecer, adicione o marketplace `oaleviola/arroway-plugin` nessa mesma tela.

#### Cursor

Adicione `https://github.com/oaleviola/arroway-plugin` como marketplace de plugins e depois instale o **arroway** pela lista de plugins. O login abre no navegador na primeira vez.

#### Codex

```
codex plugin marketplace add oaleviola/arroway-plugin
codex plugin add arroway@arroway
```

Depois, comece uma tarefa nova.

#### Gemini CLI

```
gemini extensions install https://github.com/oaleviola/arroway-plugin
```

Depois, numa sessão do Gemini CLI, rode `/mcp auth arroway` para entrar.

#### Cline e qualquer outro cliente MCP

Adicione um servidor remoto por Streamable HTTP. No Cline, no `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "arroway": {
      "type": "streamableHttp",
      "url": "https://www.arroway.app/api/mcp"
    }
  }
}
```

Sem cabeçalhos. Alguns clientes mostram as ferramentas antes de alguém entrar; mesmo assim, toda chamada precisa que a pessoa entre, e o servidor pede isso por OAuth. Se o cliente não souber entrar por OAuth, toda chamada é recusada: avise a pessoa em vez de tentar de novo.

Se o cliente lê skills de agente e não tem plugin da Arroway, adicione também a skill de trabalho: `npx skills add oaleviola/arroway-plugin`. Ela não substitui o servidor acima.

### Confira que funcionou

Chame `arroway_catch_up`. Com a pessoa já dentro, ele responde com os projetos dela e o que aconteceu neles nos últimos dias.
