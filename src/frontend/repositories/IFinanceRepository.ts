import type {
  CartaoCredito,
  CartaoCreditoInput,
  BandeiraCartao,
  BandeiraCartaoInput,
  CategoriaMovimentacao,
  CategoriaMovimentacaoInput,
  ContaBancaria,
  ContaBancariaInput,
  CreditCardImportPayload,
  CreditCardImportResult,
  FaturaAtual,
  Movimentacao,
  MovimentacaoInput,
  Renda,
  RendaInput,
  ResumoMensal,
  UsuarioDadosComplementares,
  UsuarioDadosComplementaresInput,
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
  atualizarMovimentacao(id: string, movimentacao: Partial<MovimentacaoInput>): Promise<Movimentacao>;
  excluirMovimentacao(id: string): Promise<void>;
  buscarResumoMensal(params: BuscarResumoMensalParams): Promise<ResumoMensal>;
  buscarFaturaAtual(params: BuscarFaturaAtualParams): Promise<FaturaAtual | null>;
  salvarDadosComplementaresUsuario(dados: UsuarioDadosComplementaresInput): Promise<UsuarioDadosComplementares>;
  buscarDadosComplementaresUsuario(userId: string): Promise<UsuarioDadosComplementares | null>;
  cadastrarConta(conta: ContaBancariaInput): Promise<ContaBancaria>;
  atualizarConta(id: string, conta: Partial<ContaBancariaInput>): Promise<ContaBancaria>;
  excluirConta(id: string): Promise<void>;
  cadastrarCartao(cartao: CartaoCreditoInput): Promise<CartaoCredito>;
  atualizarCartao(id: string, cartao: Partial<CartaoCreditoInput>): Promise<CartaoCredito>;
  excluirCartao(id: string): Promise<void>;
  cadastrarRenda(renda: RendaInput): Promise<Renda>;
  atualizarRenda(id: string, renda: Partial<RendaInput>): Promise<Renda>;
  excluirRenda(id: string): Promise<void>;
  listarRendas(userId: string): Promise<Renda[]>;
  listarBandeirasCartao(userId: string): Promise<BandeiraCartao[]>;
  cadastrarBandeiraCartao(bandeira: BandeiraCartaoInput): Promise<BandeiraCartao>;
  listarCategoriasMovimentacao(userId: string): Promise<CategoriaMovimentacao[]>;
  cadastrarCategoriaMovimentacao(categoria: CategoriaMovimentacaoInput): Promise<CategoriaMovimentacao>;
  listarContas(userId: string): Promise<ContaBancaria[]>;
  listarCartoes(userId: string): Promise<CartaoCredito[]>;
  importarDadosCartaoCredito(userId: string, payload: CreditCardImportPayload): Promise<CreditCardImportResult>;
}
