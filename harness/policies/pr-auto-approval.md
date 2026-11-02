# Autoaprovação de PR

Uma PR recebe `auto-approve` só quando todas as condições abaixo valem para o commit das evidências. Qualquer falha produz `human-review`. Não há terceiro resultado.

- Cada arquivo do diff termina em `.md`, em qualquer diretório, ou fica em `packages/i18n/locales/` e termina em `.json`.
- A soma de inserções e remoções é de no máximo 80 linhas, medida por `git diff --numstat` entre a base da PR e o commit avaliado.
- `git diff --check` está registrado como aprovado para esse mesmo commit.

Evidência ausente, evidência de outro commit, diff sem arquivos ou diff sem contagem de linhas também levam a `human-review`. O script consulta a cabeça da PR de novo antes de registrar. Se ela mudou, a decisão é `human-review`.

`yarn lint`, `yarn type-check` e `yarn test` continuam os checks do projeto. Esta política não os exige.
