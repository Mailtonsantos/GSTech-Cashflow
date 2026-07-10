import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: "teal" | "blue" | "emerald" | "rose";
};

const toneStyles = {
  teal: "bg-teal-50 text-teal-700",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
};

export function MetricCard({ title, value, description, icon, tone }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-cash-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-cash-muted">{title}</p>
          <strong className="mt-2 block break-words text-2xl font-black text-cash-ink">{value}</strong>
        </div>
        <div className={`grid size-11 shrink-0 place-items-center rounded-lg ${toneStyles[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-sm leading-6 text-cash-muted">{description}</p>
    </article>
  );
}
