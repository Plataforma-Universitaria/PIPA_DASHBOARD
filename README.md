# PIPA Dashboard

Dashboard local de observabilidade da Plataforma PIPA. A primeira tela apresenta a visão geral dos serviços com filtros, métricas, gráficos e exportação CSV/PDF.

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

O navegador nunca acessa essa variável. Os Route Handlers em `/api/observability/*` funcionam como BFF e encaminham ao Core somente `from`, `to`, `persona`, `toolName` e `institution`.

## Funcionalidades

- período inicial de 30 dias e intervalo personalizado no calendário de `America/Sao_Paulo`;
- filtros sincronizados na URL e atualização automática ou manual;
- cards de volume, duração média, ferramentas ativas e taxa de sucesso;
- gráficos de ferramentas, tendência diária, status e canais;
- exportação do conjunto filtrado em CSV ou PDF;
- estados de carregamento, vazio e erro recuperável;
- layout responsivo e navegação acessível por teclado;
- sidebar fixa durante a rolagem em desktop e tablet, preservando a navegação móvel recolhível;
- tabelas semanticamente ocultas como alternativa aos gráficos.

## Verificação

```bash
npm test
npm run lint
npm run build
```

Não há polling nem publicação nesta entrega. A proteção administrativa será definida em etapa posterior.
