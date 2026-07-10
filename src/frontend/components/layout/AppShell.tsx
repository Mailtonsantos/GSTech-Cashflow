import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-cash-canvas px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-cash-line pb-5">
          <p className="text-sm font-black uppercase text-cash-brand">GSTec Cashflow</p>
          <h1 className="mt-1 text-3xl font-black text-cash-ink">{title}</h1>
        </header>
        {children}
      </div>
    </main>
  );
}
