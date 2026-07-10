import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "./IFinanceRepository";
import type {
  CartaoCredito,
  CartaoCreditoInput,
  FaturaAtual,
  Movimentacao,
  MovimentacaoInput,
  ResumoMensal,
} from "../types/finance";
import type { DatabaseConnection } from "../services/DatabaseService";

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export class FinanceRepository implements IFinanceRepository {
  constructor(private readonly connection: DatabaseConnection) {}

  async salvarMovimentacao(movimentacao: MovimentacaoInput): Promise<Movimentacao> {
    this.assertInitialized();

    return {
      ...movimentacao,
      id: createId(),
      criadoEm: now(),
      atualizadoEm: now(),
    };
  }

  async buscarResumoMensal(params: BuscarResumoMensalParams): Promise<ResumoMensal> {
    this.assertInitialized();

    return {
      userId: params.userId,
      mes: params.mes,
      ano: params.ano,
      saldoContas: 0,
      totalEntradas: 0,
      totalSaidas: 0,
      balancoMes: 0,
    };
  }

  async buscarFaturaAtual(params: BuscarFaturaAtualParams): Promise<FaturaAtual | null> {
    this.assertInitialized();
    void params;

    return null;
  }

  async cadastrarCartao(cartao: CartaoCreditoInput): Promise<CartaoCredito> {
    this.assertInitialized();

    return {
      id: createId(),
      userId: cartao.userId,
      nome: cartao.nome,
      bandeira: cartao.bandeira,
      limiteTotal: cartao.limiteTotal,
      diaFechamento: cartao.diaFechamento,
      diaVencimento: cartao.diaVencimento,
      contaPagamentoId: cartao.contaPagamentoId,
      ativo: true,
    };
  }

  private assertInitialized(): void {
    if (!this.connection.instance) {
      throw new Error("Repositorio financeiro sem conexao de banco.");
    }
  }
}
