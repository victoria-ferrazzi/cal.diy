# Checks conhecidos na main

Registro da preparação. Estas falhas já existiam antes da issue #10. Esta fase não as corrige.

Comandos a partir da raiz, com Node 20.17.0 e `corepack yarn` 4.12.0. O shim `yarn` do asdf não é usado.

## Type check

`packages/tsconfig/nextjs.json` compila `@calcom/web` com `target` `es5`, sem `downlevelIteration`.

`packages/lib/shortBreak.ts` linha 30 faz `return [...marked]`, e `marked` é um `Set<number>`. O mesmo espalhamento, compilado com `tsc --target es5`, produz:

```text
error TS2802: Type 'Set<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

O job Type Checks das pull requests do harness falhou nessa linha. Um `tsc` completo de `@calcom/web` nesta máquina esgotou a memória e não chegou a imprimir o diagnóstico.

## Audit

`corepack yarn npm audit --all --recursive --severity critical`, em 10 de novembro de 2026, inclui:

- Advisory `GHSA-xv26-6w52-cph6`
- Pacote `websocket-driver@0.7.4`, puxado por `faye-websocket@0.11.4`
- Severidade critical
- O comando também lista outros avisos critical. O job Security Audit falha quando existe qualquer aviso dessa severidade.

E2E não entra neste registro. O exercício final só pede banco se a feature precisar.
