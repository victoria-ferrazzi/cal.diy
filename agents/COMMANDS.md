# Comandos

Conferidos em `package.json` na raiz. O gerenciador é Yarn. `apps/web` não tem script `test`.

Na raiz:

- `yarn lint`
- `yarn type-check`
- `yarn test` (o script já define `TZ=UTC`)

Escopo:

- Um arquivo de teste: `yarn vitest run packages/lib/businessHours.test.ts`
- Lint do app web: `yarn workspace @calcom/web lint`

Headless, sem conversa interativa: `node harness/run.mjs "<tarefa>"`. Instruções em `harness/README.md`.
