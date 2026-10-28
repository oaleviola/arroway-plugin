# Changelog

What changed in each version of the Arroway plugin. Every version is also a [release](https://github.com/oaleviola/arroway-plugin/releases) of this repository.

[English](#english) · [Español](#español) · [Português](#português)

## English

### 0.1.56

- **Cursor sessions now show up in the cockpit.** Cursor hands the result of a tool to the plugin in a different field than Claude Code, so the plugin never picked up the session credential that comes with the first read. Without it, a Cursor session was never reported to the cockpit and could not receive messages there. The plugin now reads the result in either form.

### 0.1.55

- **In Cursor, the plugin's refusal no longer looks like a tool error.** When the hook stops the first file change of a session, Cursor now shows the reason to you and to the agent in its own message channels, and the session opening says in advance that this can happen once. The README explains it.

### 0.1.54

- **Moving a card is no longer treated as publishing.** For a connector's tools, the plugin now tells the server which fields a request carries (never their values), so a change of status, label or assignee goes through without a text check, and a comment on one card is not confused with a comment on another. The README says exactly what is sent.

### 0.1.53

- **The publishing check keeps up with parallel calls.** When several acts of publishing arrive at the same time, the check no longer loses track of the ones it already asked about, so a repeated act goes through instead of being stopped again. The windows are in the README.

### 0.1.52

- **The cockpit names the right client in more cases.** Codex is now recognized at the start and end of a session too, not only when a turn ends, and Claude Code is recognized even when it does not set its client name. Before, those sessions could show up under the wrong client or none.

### 0.1.51

- **An approval from the cockpit is valid for that one request only.** The permission hook now fingerprints the exact request on your machine and accepts an "allow" only when it comes back bound to that fingerprint and to a single-use code, signed with the session's credential. Anything else approves nothing, and the window asks as usual. The README now says what the permission hook does and does not do.

### 0.1.50

- **Cowork sessions in the cockpit.** The plugin now tells Cowork apart from Claude Code, so your Cowork sessions show up in the cockpit with their own badge, including the ones that already ended, with a link to continue in Cowork.

### 0.1.49

- **Easier to find in plugin directories.** The README now has Usage and Examples sections, and the marketplace entry declares its category (productivity). Nothing changes in how the plugin works.

### 0.1.48

- **Approving from the cockpit (Claude Code and Codex).** When the agent asks permission to run a tool and your cockpit was open in the last few minutes, you can allow or deny it in the cockpit instead of the window. If you do not answer within 20 seconds, the window asks as usual. Cursor is left out.

### 0.1.47

- **The cockpit.** Your agent sessions in one place, with a message to the session that is waiting for you. It stays off until you turn it on in the Arroway panel; while it is off, the plugin sends nothing new.

### 0.1.46

- **Checking text before publishing.** Before an act that publishes text for other people — a pull request, a comment, a release, a message — the plugin asks once for a check against what your team decided. Repeating the same act without checking goes through with a note. It can be turned off in the plugin's configuration.

## Español

### 0.1.56

- **Las sesiones de Cursor ahora aparecen en el cockpit.** Cursor le entrega al plugin el resultado de una herramienta en un campo distinto al de Claude Code, así que el plugin nunca tomaba la credencial de sesión que llega con la primera lectura. Sin ella, una sesión de Cursor nunca se informaba al cockpit ni podía recibir mensajes desde allí. El plugin ahora lee el resultado en cualquiera de las dos formas.

### 0.1.55

- **En Cursor, el rechazo del plugin ya no parece un error de la herramienta.** Cuando el gancho detiene el primer cambio de archivo de una sesión, Cursor ahora te muestra el motivo a ti y al agente en sus propios canales de mensaje, y la apertura de la sesión avisa de antemano que puede pasar una vez. El README lo explica.

### 0.1.54

- **Mover una tarjeta ya no cuenta como publicar.** En las herramientas de un conector, el plugin ahora le dice al servidor qué campos lleva la petición (nunca sus valores), así que un cambio de estado, etiqueta o responsable pasa sin verificación de texto, y el comentario de una tarjeta no se confunde con el de otra. El README dice exactamente qué se envía.

### 0.1.53

- **La verificación de publicación aguanta llamadas en paralelo.** Cuando varios actos de publicar llegan al mismo tiempo, la verificación ya no pierde los que ya preguntó, así que un acto repetido pasa en lugar de detenerse otra vez. Las ventanas están en el README.

### 0.1.52

- **El cockpit identifica el cliente correcto en más casos.** Codex ahora se reconoce también al inicio y al final de la sesión, no solo cuando termina un turno, y Claude Code se reconoce aunque no indique el nombre del cliente. Antes, esas sesiones podían aparecer con el cliente equivocado o sin ninguno.

### 0.1.51

- **Una aprobación desde el cockpit vale solo para ese pedido.** El hook de permiso ahora calcula en tu máquina la huella del pedido exacto y acepta un "allow" solo si vuelve atado a esa huella y a un código de un solo uso, firmado con la credencial de la sesión. Cualquier otra cosa no aprueba nada, y la ventana pregunta como siempre. El README ahora dice qué hace y qué no hace el hook de permiso.

### 0.1.50

- **Sesiones de Cowork en el cockpit.** El plugin ahora distingue Cowork de Claude Code, así que tus sesiones de Cowork aparecen en el cockpit con su propia insignia, también las que ya terminaron, con un enlace para continuar en Cowork.

### 0.1.49

- **Más fácil de encontrar en los directorios de plugins.** El README ahora tiene las secciones Uso y Ejemplos, y la entrada del marketplace declara su categoría (productividad). Nada cambia en cómo funciona el plugin.

### 0.1.48

- **Aprobar desde el cockpit (Claude Code y Codex).** Cuando el agente pide permiso para usar una herramienta y tu cockpit estuvo abierto en los últimos minutos, puedes permitirlo o denegarlo en el cockpit en lugar de en la ventana. Si no respondes en 20 segundos, la ventana pregunta como siempre. Cursor queda fuera.

### 0.1.47

- **El cockpit.** Tus sesiones de agente en un solo lugar, con un mensaje a la sesión que te está esperando. Queda desactivado hasta que lo activas en el panel de Arroway; mientras está desactivado, el plugin no envía nada nuevo.

### 0.1.46

- **Revisar el texto antes de publicar.** Antes de un acto que publica texto para otras personas — un pull request, un comentario, una release, un mensaje —, el plugin pide una vez una revisión contra lo que decidió tu equipo. Repetir el mismo acto sin revisar pasa con un aviso. Se puede desactivar en la configuración del plugin.

## Português

### 0.1.56

- **As sessões do Cursor passam a aparecer no cockpit.** O Cursor entrega ao plugin o resultado de uma ferramenta num campo diferente do Claude Code, então o plugin nunca pegava a credencial de sessão que vem com a primeira leitura. Sem ela, uma sessão do Cursor nunca era relatada ao cockpit nem podia receber mensagens por lá. O plugin agora lê o resultado nas duas formas.

### 0.1.55

- **No Cursor, a recusa do plugin deixa de parecer erro da ferramenta.** Quando o gancho barra a primeira mudança de arquivo da sessão, o Cursor passa a mostrar o motivo para você e para o agente nos canais de mensagem dele, e a abertura da sessão avisa de antemão que isso pode acontecer uma vez. O README explica.

### 0.1.54

- **Mover um card deixa de contar como publicar.** Nas ferramentas de um conector, o plugin passa a dizer ao servidor quais campos o pedido leva (nunca os valores), então mudar status, etiqueta ou responsável passa sem conferência de texto, e o comentário de um card não se confunde com o de outro. O README diz exatamente o que é enviado.

### 0.1.53

- **A conferência de publicação aguenta chamadas em paralelo.** Quando vários atos de publicar chegam ao mesmo tempo, a conferência deixa de perder os que já cobrou, e um ato repetido passa em vez de ser barrado de novo. As janelas estão no README.

### 0.1.52

- **O cockpit reconhece o cliente certo em mais casos.** O Codex agora é reconhecido também no início e no fim da sessão, não só quando um turno termina, e o Claude Code é reconhecido mesmo quando não informa o nome do cliente. Antes, essas sessões podiam aparecer com o cliente errado ou sem nenhum.

### 0.1.51

- **Uma aprovação pelo cockpit vale só para aquele pedido.** O gancho de permissão agora calcula na sua máquina a impressão do pedido exato e só aceita um "allow" que volte preso a essa impressão e a um código de uso único, assinado com a credencial da sessão. Qualquer outra coisa não aprova nada, e a janela pergunta como sempre. O README agora diz o que o gancho de permissão faz e o que não faz.

### 0.1.50

- **Sessões do Cowork no cockpit.** O plugin agora distingue o Cowork do Claude Code, e as suas sessões do Cowork aparecem no cockpit com selo próprio, inclusive as que já terminaram, com um link para continuar no Cowork.

### 0.1.49

- **Mais fácil de achar nos diretórios de plugins.** O README agora tem as seções Uso e Exemplos, e a entrada do marketplace declara a categoria (produtividade). Nada muda no funcionamento do plugin.

### 0.1.48

- **Aprovar pelo cockpit (Claude Code e Codex).** Quando o agente pede permissão para usar uma ferramenta e o seu cockpit esteve aberto nos últimos minutos, você pode permitir ou negar no cockpit em vez da janela. Se você não responde em 20 segundos, a janela pergunta como sempre. O Cursor fica de fora.

### 0.1.47

- **O cockpit.** As suas sessões de agente num lugar só, com uma mensagem para a sessão que está esperando você. Fica desligado até você ligar no painel da Arroway; enquanto está desligado, o plugin não manda nada novo.

### 0.1.46

- **Conferir o texto antes de publicar.** Antes de um ato que publica texto para outras pessoas — um pull request, um comentário, uma release, uma mensagem —, o plugin pede uma vez a conferência contra o que o seu time decidiu. Repetir o mesmo ato sem conferir passa com um aviso. Dá para desligar na configuração do plugin.
