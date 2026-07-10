import { CalendarClock, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { AppShell } from "../components/layout/AppShell";
import { useFinanceSummary } from "../hooks/useFinanceSummary";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function DashboardPage() {
  const summary = useFinanceSummary();

  return (
    <AppShell title="Visao principal">
      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg border border-cash-line bg-white px-3 py-2 text-sm font-bold text-cash-muted">
        <CalendarClock size={18} />
        Fatura vence em {summary.nextInvoiceDueDate}
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo em contas"
          value={money(summary.accountBalance)}
          description="Total disponivel em contas bancarias cadastradas."
          icon={<Wallet size={22} />}
          tone="teal"
        />
        <MetricCard
          title="Fatura do cartao"
          value={money(summary.cardInvoiceTotal)}
          description="Total calculado pelas movimentacoes vinculadas a faturas abertas."
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
        <div className="rounded-lg border border-cash-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-cash-ink">Resumo do mes</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label="Entradas" value={money(summary.monthlyIncome)} tone="text-emerald-700" />
            <SummaryRow label="Saidas" value={money(summary.monthlyExpense)} tone="text-rose-700" />
            <SummaryRow label="Resultado" value={money(summary.monthBalance)} tone="text-cash-brand" />
          </div>
        </div>

        <div className="rounded-lg border border-cash-line bg-white p-5 shadow-sm">
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

function SummaryRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-cash-canvas px-4 py-3">
      <span className="text-sm font-bold text-cash-muted">{label}</span>
      <strong className={`text-base font-black ${tone}`}>{value}</strong>
    </div>
  );
}
