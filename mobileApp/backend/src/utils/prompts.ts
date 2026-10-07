// backend/src/utils/prompts.ts
import { Transaction, Budget } from '../types/finance';

export const generateFinancialPrompt = (
    income: number,
    expenses: number,
    savingsRate: number,
    topCategories: { category: string; amount: number }[],
    remainingBudgets: Record<string, number>,
    transactions: Transaction[],
    budgets: Budget[],
    query: string
): string => {
    const hasFinancialData = income || expenses || transactions.length || budgets.length;

    const formattedTransactions = transactions.map((t) => ({
        amount: t.amount,
        category: t.category || 'Uncategorized',
        type: t.type,
        date: t.date,
    }));

    const formattedBudgets = budgets.map((b) => ({
        category: b.category,
        limit: b.limit,
        remaining: remainingBudgets[b.category] || 0,
    }));

    return `
Finanzdaten verfügbar: ${hasFinancialData ? 'Ja' : 'Nein'}

Financial Summary:
- Total Income: $${income.toFixed(2)}
- Total Expenses: $${expenses.toFixed(2)}
- Net Balance: $${(income - expenses).toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%

Top Spending Categories:
${topCategories.map(c => `- ${c.category}: $${c.amount.toFixed(2)}`).join('\n') || '- Keine Daten verfügbar'}

Remaining Budgets:
${Object.entries(remainingBudgets).map(([category, remaining]) => `- ${category}: $${remaining.toFixed(2)}`).join('\n') || '- Keine Daten verfügbar'}

User's transactions (recent first):
${JSON.stringify(formattedTransactions.slice(0, 10), null, 2) || '[]'}

User's budgets:
${JSON.stringify(formattedBudgets, null, 2) || '[]'}

User Query:
"${query}"

Instructions:
1. **Finanzbezogene Fragen** (z. B. "Wie viel habe ich diesen Monat für Kleidung übrig?"):
   - Wenn Finanzdaten vorhanden sind: Analysiere sie und beantworte präzise in **max. 30 Tokens**.
   - Beispiel: "Du hast noch 45 € für 'Clothing' übrig."
   - Falls keine ausreichenden Daten vorhanden sind: Antworte stattdessen allgemeinfreundlich, wie in 2.

2. **Nicht-finanzbezogene oder allgemeine Fragen** (z. B. "Wie ist das Wetter?", "Erzähl mir einen Witz", oder bei fehlenden Daten):
   - Antworte kreativ, unterhaltsam oder informativ – **maximal 30 Tokens**.
   - Beispiele:
     - Wetter: "In Berlin: sonnig, 22 °C ☀️"
     - Witz: "Warum können Geister nicht lügen? Man sieht durch sie durch!"
     - Definition: "Ein Sparschwein ist ein Behälter zum Sparen, meist aus Keramik."

3. **Allgemeine Richtlinien**:
   - Freundlicher, kompetenter Ton.
   - Antworte auf Deutsch, sofern nicht anders gewünscht.
   - Bei Mehrdeutigkeit: Versuche, eine sinnvolle Interpretation zu liefern.
   - **Antwort darf nie länger als 30 Tokens sein.**
`;
};