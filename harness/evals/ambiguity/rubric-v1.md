# Rubrica de ambiguidade v1

A nota mede ambiguidade. Nota maior significa uma issue menos clara. A nota é um inteiro de 0 a 3 e resume três critérios: objetivo, escopo e aceite.

Use somente a issue e o contexto recebidos. Uma informação que já está no contexto não é ausência e não gera pergunta ao autor.

| Nota | Objetivo | Escopo | Aceite | Condição observável |
| --- | --- | --- | --- | --- |
| 0 | Diz o resultado que a mudança produz. | Aponta arquivos, módulos ou responsabilidades. | Lista comportamentos verificáveis. | Os três bastam para planejar sem uma decisão nova. |
| 1 | O resultado está dito. | O lugar da mudança está dito. | Falta um detalhe que não muda o plano. | Dá para planejar e implementar; o detalhe pode ser assumido sem escolher uma regra. |
| 2 | O resultado está dito. | Parte do plano está dita. | Falta uma regra que escolhe entre alternativas. | Sem essa decisão, uma parte do plano não pode ser escrita. |
| 3 | Não há resultado definido, ou o aceite não existe. | O lugar da mudança não restringe o trabalho. | Não há comportamento verificável. | Não dá para planejar. |

Exemplos de detalhe que não impede o plano, nota 1: o nome de um arquivo de teste ainda não citado, quando o comportamento esperado já está escrito.

Exemplos de decisão que impede parte do plano, nota 2: quem pode executar a ação, quando o contexto não define essa permissão.

Exemplos de issue vaga, nota 3: um pedido de melhoria sem dizer o que muda nem como saber que ficou pronto.
