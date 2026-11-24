# Dicionário de Métricas

Definição oficial de cada número do projeto. App, planilha, ETL e Power BI
devem calcular exatamente assim.

## Métricas

| Métrica | Fórmula | Observação |
|---|---|---|
| Receita bruta | Soma de todas as plataformas + particular + entrega | Valor recebido antes de qualquer gasto |
| Jornada | Fim do turno − início do turno | Ex.: 05:00 → 13:30 = 8h30 |
| Tempo em pausa | Soma de todas as pausas do turno | Um turno pode ter quantas pausas forem necessárias |
| Horas trabalhadas | Jornada − tempo em pausa | Ex.: 8h30 − 40 min = 7h50. É a que entra no R$/hora |
| **R$/hora bruto** | Receita bruta ÷ Horas trabalhadas | **Métrica principal** |
| R$/minuto | R$/hora bruto ÷ 60 | |
| Despesas totais | Soma de todas as despesas do dia (todos os grupos) | Inclui as despesas de rotina e as extras |
| Lucro líquido | Receita bruta − Despesas totais | |
| Custo da hora | Despesas totais ÷ Horas trabalhadas | "Sua hora de trabalho custou R$ X" |
| Lucro por hora | Lucro líquido ÷ Horas trabalhadas | |
| Margem | Lucro líquido ÷ Receita bruta | Quanto sobra de cada R$ 1 que entra |

## Meta

Cada motorista define a **própria meta de R$/hora** no primeiro acesso
(onboarding) e pode mudar depois nas configurações.
Ex.: a meta do Luis é R$ 60/h (= R$ 1/min).

## Avaliação do dia

Calculada automaticamente (não é digitada), comparando o R$/hora do dia
com a meta do próprio motorista:

**% da meta = R$/hora do dia ÷ meta de R$/hora**

| Avaliação | % da meta |
|---|---|
| 🔴 Ruim | abaixo de 75% |
| 🟡 Regular | de 75% até menos de 100% |
| 🟢 Bom | de 100% até menos de 133% |
| 🔵 Ótimo | 133% ou mais |

As porcentagens são iguais para todos os motoristas; só a meta muda.
Fronteira: "a partir de" inclui o valor (ex.: exatamente 100% = Bom).

Exemplo (meta R$ 60/h): Ruim < R$ 45 · Regular R$ 45–59,99 ·
Bom R$ 60–79,79 · Ótimo ≥ R$ 79,80

## Regras de negócio

1. **O turno pertence ao dia em que começou.** Se o motorista sai às 15:00
   do dia 18 e volta às 02:00 do dia 19, tudo conta no dia 18.
2. **Vazio ≠ zero.** Vazio quer dizer "não sei". Zero quer dizer "não teve".
   Os dois nunca se misturam.
3. **Cada motorista só vê os próprios dados** (garantido pelo banco, via RLS).
4. **Categorias de despesa:** padrões do sistema + personalizadas por motorista.
   Toda categoria pertence a um grupo fixo (Combustível, Veículo, Alimentação,
   Plataforma/Taxas, Telefonia, Impostos/Documentos, Outros).
5. **Combustível é uma categoria só**, com o tipo (gasolina, etanol, GNV,
   elétrico) num campo separado.
6. **Dados históricos com horário ajustado** ficam marcados como `ajustado`:
   o total de horas é confiável, mas o horário exato nem sempre.
7. **A meta de R$/hora é de cada motorista**, guardada no perfil.
   Nunca fica fixa no código.
8. **A avaliação do dia é sempre calculada**, nunca digitada, usando as
   faixas acima.