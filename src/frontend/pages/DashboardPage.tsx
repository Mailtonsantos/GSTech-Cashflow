import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, CreditCard, Plus, TrendingUp, Wallet } from "lucide-react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { AppShell } from "../components/layout/AppShell";
import { useFinance } from "../hooks/useFinance";
import { useFinanceSummary } from "../hooks/useFinanceSummary";
import type { CartaoCredito, ContaBancaria, ResumoMensal, TipoMovimentacao } from "../types/finance";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const compactLabelClass = "block text-xs font-medium text-slate-600";
const compactFieldClass =
  "mt-1 w-full rounded-lg border border-cash-line px-3 py-1.5 text-sm text-cash-ink outline-none focus:border-cash-brand focus:ring-4 focus:ring-teal-700/10";
const compactButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-cash-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-cash-brandDark disabled:opacity-60";

type DashboardPageProps = {
  userId: string;
};

export function DashboardPage({ userId }: DashboardPageProps) {
  const fallbackSummary = useFinanceSummary();
  const { loading, error, salvarMovimentacao, buscarResumoMensal, listarContas, listarCartoes } = useFinance({ userId });
  const [monthlySummary, setMonthlySummary] = useState<ResumoMensal | null>(null);
  const [accounts, setAccounts] = useState<ContaBancaria[]>([]);
  const [cards, setCards] = useState<CartaoCredito[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const referenceDate = new Date();
  const mes = referenceDate.getMonth() + 1;
  const ano = referenceDate.getFullYear();

  useEffect(() => {
    let isMounted = true;

    Promise.all([buscarResumoMensal({ userId, mes, ano }), listarContas(), listarCartoes()]).then(
      ([summary, nextAccounts, nextCards]) => {
        if (!isMounted) return;
        if (summary) setMonthlySummary(summary);
        if (nextAccounts) setAccounts(nextAccounts);
        if (nextCards) setCards(nextCards);
      },
    );

    return () => {
      isMounted = false;
    };
  }, [ano, buscarResumoMensal, listarCartoes, listarContas, mes, refreshKey, userId]);

  const summary = {
    ...fallbackSummary,
    accountBalance: monthlySummary?.saldoContas ?? fallbackSummary.accountBalance,
    cardInvoiceTotal: monthlySummary?.totalFaturasAbertas ?? fallbackSummary.cardInvoiceTotal,
    creditLimitAvailable: monthlySummary?.limiteCreditoDisponivel ?? fallbackSummary.creditLimitAvailable,
    monthlyIncome: monthlySummary?.totalEntradas ?? 0,
    monthlyExpense: monthlySummary?.totalSaidas ?? 0,
    monthBalance: monthlySummary?.balancoMes ?? 0,
    nextInvoiceDueDate: monthlySummary?.proximoVencimentoFatura
      ? new Date(`${monthlySummary.proximoVencimentoFatura}T00:00:00`).toLocaleDateString("pt-BR")
      : fallbackSummary.nextInvoiceDueDate,
  };

  async function handleSaveTransaction(form: NewTransactionFormValues) {
    const targetAccount = form.paymentTarget === "conta" ? accounts[0] : null;
    const targetCard = form.paymentTarget === "cartao" ? cards[0] : null;

    await salvarMovimentacao({
      userId,
      contaId: targetAccount?.id ?? null,
      cartaoId: targetCard?.id ?? null,
      tipo: form.type,
      descricao: form.description,
      categoria: form.category,
      valor: form.amount,
      dataMovimento: form.date,
      formaPagamento: form.paymentTarget,
      parcelaAtual: 1,
      totalParcelas: 1,
    });

    setRefreshKey((current) => current + 1);
  }

  return (
    <AppShell title="Visao principal">
      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg border border-cash-line bg-white px-3 py-2 text-sm font-bold text-cash-muted">
        <CalendarClock size={18} />
        {loading ? "Atualizando dados..." : `Fatura vence em ${summary.nextInvoiceDueDate}`}
      </div>
      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error.message}
        </p>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo em contas"
          value={money(summary.accountBalance)}
          description="Total disponivel em contas bancarias cadastradas."
          icon={<Wallet size={22} />}
          tone="teal"
        />
        <MetricCard
          title="Limite disponivel"
          value={money(summary.creditLimitAvailable)}
          description={`Limite total menos fatura atual: ${money(summary.cardInvoiceTotal)} em aberto.`}
          icon={<CreditCard size={22} />}
          tone="blue"
        />
        <MetricCard
          title="Entradas do mes"
          value={money(summary.monthlyIncome)}
          description="Receitas confirmadas no mes corrente."
          icon={<TrendingUp size={22} />}
          tone="emerald"
        />
        <MetricCard
          title="Balanco do mes"
          value={money(summary.monthBalance)}
          description={`Entradas menos saidas: ${money(summary.monthlyIncome)} - ${money(summary.monthlyExpense)}.`}
          icon={<TrendingUp size={22} />}
          tone={summary.monthBalance >= 0 ? "teal" : "rose"}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border border-cash-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-cash-ink">Resumo do mes</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="Entradas" value={money(summary.monthlyIncome)} tone="text-emerald-700" />
            <SummaryRow label="Saidas" value={money(summary.monthlyExpense)} tone="text-rose-700" />
            <SummaryRow label="Resultado" value={money(summary.monthBalance)} tone="text-cash-brand" />
          </div>
        </div>

        <NewTransactionForm
          cards={cards}
          isSaving={loading}
          onSubmit={handleSaveTransaction}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border border-cash-line bg-white p-4 shadow-sm lg:col-start-2">
          <h2 className="text-lg font-black text-cash-ink">Proxima fatura</h2>
          <p className="mt-4 text-3xl font-black text-cash-ink">{money(summary.cardInvoiceTotal)}</p>
          <p className="mt-2 text-sm leading-6 text-cash-muted">
            Valor calculado por movimentacoes de cartao associadas a fatura aberta.
          </p>
        </div>
      </section>
    </AppShell>
  );
}

type NewTransactionFormValues = {
  description: string;
  category: string;
  amount: number;
  date: string;
  type: TipoMovimentacao;
  paymentTarget: "conta" | "cartao";
};

function NewTransactionForm({
  cards,
  isSaving,
  onSubmit,
}: {
  cards: CartaoCredito[];
  isSaving: boolean;
  onSubmit: (values: NewTransactionFormValues) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<NewTransactionFormValues>({
    description: "",
    category: "",
    amount: 0,
    date: today,
    type: "saida",
    paymentTarget: "conta",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.description.trim() || form.amount <= 0) return;

    await onSubmit(form);
    setForm({
      description: "",
      category: "",
      amount: 0,
      date: today,
      type: "saida",
      paymentTarget: "conta",
    });
  }

  return (
    <form className="w-full max-w-lg rounded-lg border border-cash-line bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-cash-ink">Novo lancamento</h2>
        <div className="grid size-9 place-items-center rounded-lg bg-teal-50 text-cash-brand">
          <Plus size={18} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className={compactLabelClass}>
          Descricao
          <input
            className={compactFieldClass}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Ex: Mercado, salario, internet"
            required
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={compactLabelClass}>
            Tipo
            <select
              className={compactFieldClass}
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as TipoMovimentacao })}
            >
              <option value="saida">Saida</option>
              <option value="entrada">Entrada</option>
            </select>
          </label>

          <label className={compactLabelClass}>
            Destino
            <select
              className={compactFieldClass}
              value={form.paymentTarget}
              onChange={(event) => setForm({ ...form, paymentTarget: event.target.value as "conta" | "cartao" })}
            >
              <option value="conta">Conta</option>
              <option value="cartao" disabled={cards.length === 0 || form.type === "entrada"}>
                Cartao {cards.length === 0 ? "(cadastre um cartao)" : ""}
              </option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={compactLabelClass}>
            Valor
            <input
              className={compactFieldClass}
              min="0.01"
              step="0.01"
              type="number"
              value={form.amount || ""}
              onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
              required
            />
          </label>

          <label className={compactLabelClass}>
            Data
            <input
              className={compactFieldClass}
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              required
            />
          </label>
        </div>

        <label className={compactLabelClass}>
          Categoria
          <input
            className={compactFieldClass}
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder="Ex: Alimentacao, renda, transporte"
          />
        </label>

        <button
          className={compactButtonClass}
          disabled={isSaving}
          type="submit"
        >
          <Plus size={18} />
          {isSaving ? "Salvando..." : "Salvar lancamento"}
        </button>
      </div>
    </form>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-cash-canvas px-4 py-3">
      <span className="text-sm font-bold text-cash-muted">{label}</span>
      <strong className={`text-base font-black ${tone}`}>{value}</strong>
    </div>
  );
}
