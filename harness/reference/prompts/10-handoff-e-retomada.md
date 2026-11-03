# Handoff e retomada

Fonte: slide 14, componente Handoff e retomada. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

Quando a decisão exige conversa, a etapa pausa e separa o objetivo, o plano atual, as evidências e a decisão pendente. A pessoa leva esse contexto para uma sessão interativa. Depois da conversa, a decisão volta na issue, o artefato afetado é atualizado e as condições de avanço são conferidas de novo.

## Entrada

O estado da pausa e o comentário novo na issue. Na sessão, a pessoa abre o que já existe: na aprovação do plano, o comentário e o JSON do estado; na revisão do commit, o comentário, o diff da PR e as evidências. Não há arquivo novo de handoff. A passagem para o Cursor é manual.

## Saída

Um comentário cujo corpo é o valor pendente. No plano, o fingerprint. No design, o fingerprint da opção. Na revisão do commit, o SHA da cabeça. O estado guarda ator, valor e id do comentário. Esclarecimento é texto livre: o id do comentário entra no estado e o planejamento recomeça.

## Arquivos do explorador

- `harness/responses.py` L207–208. Um esclarecimento acumula o id do comentário e devolve a ação `start`, o que recomeça o fluxo.

As pausas de aprovação e de revisão estão em `resolve`, no mesmo arquivo. O exemplo também reconhece frases livres amarradas à versão pendente. Neste fork a autorização de uma versão é só o valor exato.

## O que impede a transição

Status diferente da pausa esperada, comentário diferente do valor pendente, autor sem escrita, ou issue e base alteradas, interrompem a retomada. Na revisão, o SHA comentado precisa ser a cabeça atual. Comentário que cita outra versão, ou que fala da etapa errada, não avança. Esclarecimento invalida o plano anterior porque a issue mudou.

## O que o fork já tem

A forma dessas pausas está decidida e ainda sem código. Não há sessão interativa ligada a uma issue.

## O que falta

Não há pausa que publique a versão pendente, nem leitura do comentário de volta, nem revalidação antes de retomar.
