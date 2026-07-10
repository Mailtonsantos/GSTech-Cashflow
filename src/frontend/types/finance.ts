export type UserProfile = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  authProvider: "email" | "google";
};

export type FinanceSummary = {
  accountBalance: number;
  cardInvoiceTotal: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthBalance: number;
  nextInvoiceDueDate: string;
};
