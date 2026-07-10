import type { FinanceSummary } from "../types/finance";

export function useFinanceSummary(): FinanceSummary {
  return {
    accountBalance: 4850.75,
    cardInvoiceTotal: 1268.9,
    monthlyIncome: 6200,
    monthlyExpense: 3884.4,
    monthBalance: 2315.6,
    nextInvoiceDueDate: "15/08/2026",
  };
}
