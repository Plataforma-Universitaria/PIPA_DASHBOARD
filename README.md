# PIPA Dashboard

Dashboard local de observabilidade da Plataforma PIPA. A primeira tela, “Desempenho da plataforma”, apresenta o uso e o desempenho dos serviços com filtros, métricas, gráficos e exportação CSV/PDF.

## Execução local

Requisitos: Node.js 20 ou superior e PIPA Core acessível.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000`. A configuração server-side padrão é:

```env
PIPA_API_URL=http://localhost:8081
```

O navegador nunca acessa essa variável. Os Route Handlers em `/api/observability/*` funcionam como BFF e encaminham ao Core somente `from`, `to`, `persona`, `toolName`, `institution` e `aiProvider` nas consultas operacionais. O BFF `/api/observability/ai-usage` encaminha apenas `from`, `to` e `aiProvider` (`local` ou `external`).

## Funcionalidades

- período inicial de 30 dias no calendário de `America/Sao_Paulo`; presets de 7/30/90 dias são recalculados ao abrir, incluindo hoje, e não reutilizam datas antigas ou invertidas da URL; datas explícitas definem apenas o modo personalizado;
- período efetivamente aplicado exibido na tela, com limites inclusivos; links personalizados com apenas uma data inicializam o outro limite sem inversão;
- variação do total identificada como “vs. período anterior”: compara com o período imediatamente anterior de mesma duração e mesmos filtros, inclusive origem do modelo; sem base de comparação o indicador não é exibido;
- datas personalizadas editadas em rascunho e aplicadas juntas em “Aplicar intervalo”, sem consultas a cada digitação; datas obrigatórias, existentes no calendário e final igual ou posterior à inicial;
- enquanto as datas estão em edição, a tela mantém o intervalo aplicado e bloqueia a exportação; somente a confirmação atualiza a URL, as métricas e os tokens (de `00:00:00` a `23:59:59.999`);
- links com datas inválidas mostram validação e não consultam indicadores; os BFFs de dashboard, tokens e exportação validam os limites antes de chamar o Core e retornam HTTP 400 para datas inválidas ou intervalos invertidos;
- filtros sincronizados na URL e atualização automática ou manual;
- cards de volume, duração média, ferramentas utilizadas e taxa de sucesso;
- “Ferramentas utilizadas” conta nomes distintos não vazios nos logs filtrados, ignorando espaços nas bordas e diferenças de caixa; inclui tentativas com sucesso ou falha e preserva o campo `activeTools` da API;
- cabeçalho sem sobretítulo, com “Desempenho da plataforma” e “Acompanhe requisições, uso de ferramentas e consumo de IA.”;
- botão Atualizar com bloqueio por `aria-disabled` e guarda no handler durante consultas, sem depender do atributo nativo `disabled` na hidratação;
- gráficos de ferramentas, tendência diária, status e canais;
- rótulos provenientes de `@ServiceProviderMethod.actionName` nos provedores carregados pelo Core, recebidos em `toolLabels` de `/api/observability/filters` e compartilhados pelo filtro, gráfico, tooltip e tabela acessível; `src/lib/observability/tool-labels.ts` apenas consulta esses metadados, sem mapa de nomes fixos. Sem rótulo fornecido, exibe o identificador original; `toolName` e a exportação preservam os identificadores da API;
- filtros/rótulos do provedor são recarregados junto das métricas a cada consulta, mudança de filtros, atualização manual ou retry; novos dados só aparecem após as duas respostas, evitando nomes técnicos por metadados desatualizados quando uma ferramenta passa a ser usada durante a sessão;
- gráfico “Uso de ferramentas” em toda a largura disponível, com barras horizontais, nomes completos com quebra de linha e altura adaptada à quantidade de ferramentas (até 10);
- exportação do conjunto filtrado em CSV ou PDF;
- estados de carregamento, vazio e erro recuperável;
- layout responsivo e navegação acessível por teclado;
- conteúdo em largura total, sem sidebar ou barra superior; filtro de ferramenta junto dos demais filtros;
- seletor global de origem do modelo (Todas, Externo, Local) na área de filtros, sincronizado na URL por `aiProvider`; aplica-se a métricas, gráficos, logs e exportação de ferramentas, além dos tokens; registros sem origem são tratados como externos;
- painel de consumo com tokens de entrada, tokens de saída e tokens totais filtrados por período, origem, persona, instituição e ferramenta; os seletores filtram dados registrados e não alteram `AI_ROUTING_MODE`;
- cada indicador mantém sua própria cobertura de inferências: tokens ausentes são exibidos como indisponíveis, somas parciais são identificadas e zero medido permanece zero; entrada e saída não são usadas para reconstruir um total ausente; CSV/PDF continuam exportando somente execuções de ferramentas;
- tabelas semanticamente ocultas como alternativa aos gráficos.

O Core deve retornar os novos campos `inputTokens`, `outputTokens`, `inferencesWithInputTokens` e `inferencesWithOutputTokens` em `/api/observability/ai-usage`, além dos campos existentes. Atualize/reinicie os dois serviços para disponibilizar a separação no painel; as somas usam as colunas de tokens existentes. A correlação por turno descrita abaixo acrescenta uma coluna aos logs de ferramentas. Se uma instância antiga do Core ainda não fornecer os novos campos, os dois indicadores permanecem indisponíveis, sem estimar valores.

Para aplicar persona, instituição e ferramenta aos tokens, atualize também a correlação de turnos do Core: `ToolExecutionLog.turnId` é gravado a partir do UUID validado recebido do Guará. Esses recortes contam todas as inferências do turno com uma execução que satisfaça conjuntamente os filtros, incluindo seleção, normalização e resposta; execuções repetidas não multiplicam a soma. Uma mesma conversa com ferramentas diferentes pode aparecer em recortes diferentes, portanto as somas por ferramenta não são parcelas exclusivas. Registros anteriores sem essa associação continuam nas consultas gerais por período/origem, mas não podem ser atribuídos retroativamente a persona, instituição ou ferramenta. A nova coluna anulável e seu índice são criados pelo `ddl-auto=update` no reinício do Core, conforme a configuração atual do projeto.

## Verificação

```bash
npm test
npm run lint
npm run build
```

Não há polling nem publicação nesta entrega. A proteção administrativa será definida em etapa posterior.
