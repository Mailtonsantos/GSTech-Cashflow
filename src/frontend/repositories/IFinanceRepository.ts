import type {
  CartaoCredito,
  CartaoCreditoInput,
  FaturaAtual,
  Movimentacao,
  MovimentacaoInput,
  ResumoMensal,
} from "../types/finance";

export type BuscarResumoMensalParams = {
  userId: string;
  mes: number;
  ano: number;
};

export type BuscarFaturaAtualParams = {
  userId: string;
  cartaoId: string;
  dataReferencia?: string;
};

export interface IFinanceRepository {
  salvarMovimentacao(movimentacao: MovimentacaoInput): Promise<Movimentacao>;
  buscarResumoMensal(params: BuscarResumoMensalParams): Promise<ResumoMensal>;
  buscarFaturaAtual(params: BuscarFaturaAtualParams): Promise<FaturaAtual | null>;
  cadastrarCartao(cartao: CartaoCreditoInput): Promise<CartaoCredito>;
}
