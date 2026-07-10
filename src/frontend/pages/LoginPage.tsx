import { Database, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";

type LoginPageProps = {
  isLoading: boolean;
  onGoogleLogin: () => void;
};

export function LoginPage({ isLoading, onGoogleLogin }: LoginPageProps) {
  return (
    <main className="min-h-screen bg-cash-canvas">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_440px]">
        <div className="flex items-center bg-[linear-gradient(120deg,rgba(15,118,110,0.94),rgba(21,94,117,0.84)),url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center px-6 py-10 text-white sm:px-10 lg:px-14">
          <div className="max-w-2xl">
            <div className="grid size-14 place-items-center rounded-lg bg-white text-xl font-black text-cash-brand">G</div>
            <h1 className="mt-8 text-5xl font-black leading-none tracking-normal sm:text-6xl lg:text-7xl">
              GSTec Cashflow
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">
              Controle contas, cartoes, faturas e movimentacoes em uma experiencia simples para computador e celular.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-bold">
                <ShieldCheck size={18} />
                Acesso por usuario
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-bold">
                <Database size={18} />
                Banco local isolado
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full rounded-lg border border-cash-line bg-white p-6 shadow-soft">
            <div>
              <p className="text-sm font-black uppercase text-cash-brand">Entrar</p>
              <h2 className="mt-2 text-2xl font-black text-cash-ink">Acesse sua area financeira</h2>
              <p className="mt-3 text-sm leading-6 text-cash-muted">
                Ao autenticar, o Cashflow abre ou cria automaticamente seu banco de dados local. As contas, cartoes,
                faturas e movimentacoes ficam vinculados ao seu usuario.
              </p>
            </div>

            <Button
              className="mt-6 w-full bg-cash-brand text-white hover:bg-cash-brandDark"
              disabled={isLoading}
              onClick={onGoogleLogin}
              type="button"
            >
              {isLoading ? "Preparando ambiente..." : "Continuar com Google"}
            </Button>

            <p className="mt-4 rounded-lg bg-cash-canvas p-3 text-xs leading-5 text-cash-muted">
              Nesta etapa o login ainda pode usar o provedor demonstrativo. A integracao Firebase substituira somente o
              servico de autenticacao, mantendo o fluxo local.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
