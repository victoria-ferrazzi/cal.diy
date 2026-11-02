---
name: pr-auto-approval
description: Colhe evidências de uma PR e chama o controle de autoaprovação. Use quando a pessoa pedir para avaliar se uma PR pode ser autoaprovada. A decisão sai do script, não do texto desta skill.
disable-model-invocation: true
---

# Autoaprovação de PR

A decisão é o JSON de `harness/approve-pr.mjs`. Não escreva `auto-approve` por conta própria.

## Entrada

O número da PR. Se a pessoa não informar, use a PR da branch atual.

## Procedimento

1. Leia `harness/policies/pr-auto-approval.md`. Os checks exigidos estão em `harness/policies/pr-auto-approval.json`.
2. Leia a PR com `gh pr view <n> --json number,headRefOid,baseRefOid`. O SHA avaliado é `headRefOid`.
3. Crie `harness/reviews/<pr>-<sha>/`.
4. Para cada check exigido, rode o comando no SHA da PR e grave origem, saída e se passou. Para `git diff --check`, o comando é `git diff --check <baseRefOid>...<sha>`.
5. Grave `evidence.json` neste formato:

```json
{
  "pr": 1,
  "sha": "<headRefOid>",
  "checks": [
    {
      "name": "git diff --check",
      "sha": "<headRefOid>",
      "passed": true,
      "origin": "git diff --check <baseRefOid>...<sha>",
      "output": ""
    }
  ]
}
```

6. Grave `command.txt` com `node harness/approve-pr.mjs harness/reviews/<pr>-<sha>`.
7. Rode esse comando. O código de saída 0 significa que houve decisão, inclusive `human-review`. Mostre o `decision.json` sem alterá-lo.
