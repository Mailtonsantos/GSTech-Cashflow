import { useCallback, useState } from "react";
import { databaseService } from "../services/DatabaseService";
import { FinanceRepository } from "../repositories/FinanceRepository";
import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "../repositories/IFinanceRepository";
import type {
  BandeiraCartaoInput,
  CartaoCreditoInput,
  CategoriaMovimentacaoInput,
  ContaBancariaInput,
  MovimentacaoInput,
  RendaInput,
  UsuarioDadosComplementaresInput,
} from "../types/finance";

type UseFinanceOptions = {
  userId: string;
  repository?: IFinanceRepository;
};

export function useFinance({ userId, repository }: UseFinanceOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getRepository = useCallback(async () => {
    if (repository) {
      return repository;
    }

    const connection = await databaseService.initialize({ userId });
    return new FinanceRepository(connection);
  }, [repository, userId]);

  const execute = useCallback(
    async <T>(operation: (financeRepository: IFinanceRepository) => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const financeRepository = await getRepository();
        return await operation(financeRepository);
      } catch (caughtError) {
        const normalizedError = caughtError instanceof Error ? caughtError : new Error("Erro financeiro inesperado.");
        setError(normalizedError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getRepository],
  );

  const salvarMovimentacao = useCallback(
    (movimentacao: MovimentacaoInput) =>
      execute((financeRepository) => financeRepository.salvarMovimentacao(movimentacao)),
    [execute],
  );

  const atualizarMovimentacao = useCallback(
    (id: string, movimentacao: Partial<MovimentacaoInput>) =>
      execute((financeRepository) => financeRepository.atualizarMovimentacao(id, movimentacao)),
    [execute],
  );

  const excluirMovimentacao = useCallback(
    (id: string) => execute((financeRepository) => financeRepository.excluirMovimentacao(id)),
    [execute],
  );

  const buscarResumoMensal = useCallback(
    (params: BuscarResumoMensalParams) =>
      execute((financeRepository) => financeRepository.buscarResumoMensal(params)),
    [execute],
  );

  const buscarFaturaAtual = useCallback(
    (params: BuscarFaturaAtualParams) =>
      execute((financeRepository) => financeRepository.buscarFaturaAtual(params)),
    [execute],
  );

  const cadastrarCartao = useCallback(
    (cartao: CartaoCreditoInput) => execute((financeRepository) => financeRepository.cadastrarCartao(cartao)),
    [execute],
  );

  const salvarDadosComplementaresUsuario = useCallback(
    (dados: UsuarioDadosComplementaresInput) =>
      execute((financeRepository) => financeRepository.salvarDadosComplementaresUsuario(dados)),
    [execute],
  );

  const buscarDadosComplementaresUsuario = useCallback(
    () => execute((financeRepository) => financeRepository.buscarDadosComplementaresUsuario(userId)),
    [execute, userId],
  );

  const cadastrarConta = useCallback(
    (conta: ContaBancariaInput) => execute((financeRepository) => financeRepository.cadastrarConta(conta)),
    [execute],
  );

  const atualizarConta = useCallback(
    (id: string, conta: Partial<ContaBancariaInput>) =>
      execute((financeRepository) => financeRepository.atualizarConta(id, conta)),
    [execute],
  );

  const excluirConta = useCallback(
    (id: string) => execute((financeRepository) => financeRepository.excluirConta(id)),
    [execute],
  );

  const atualizarCartao = useCallback(
    (id: string, cartao: Partial<CartaoCreditoInput>) =>
      execute((financeRepository) => financeRepository.atualizarCartao(id, cartao)),
    [execute],
  );

  const excluirCartao = useCallback(
    (id: string) => execute((financeRepository) => financeRepository.excluirCartao(id)),
    [execute],
  );

  const cadastrarRenda = useCallback(
    (renda: RendaInput) => execute((financeRepository) => financeRepository.cadastrarRenda(renda)),
    [execute],
  );

  const atualizarRenda = useCallback(
    (id: string, renda: Partial<RendaInput>) =>
      execute((financeRepository) => financeRepository.atualizarRenda(id, renda)),
    [execute],
  );

  const excluirRenda = useCallback(
    (id: string) => execute((financeRepository) => financeRepository.excluirRenda(id)),
    [execute],
  );

  const listarRendas = useCallback(
    () => execute((financeRepository) => financeRepository.listarRendas(userId)),
    [execute, userId],
  );

  const listarBandeirasCartao = useCallback(
    () => execute((financeRepository) => financeRepository.listarBandeirasCartao(userId)),
    [execute, userId],
  );

  const cadastrarBandeiraCartao = useCallback(
    (bandeira: BandeiraCartaoInput) =>
      execute((financeRepository) => financeRepository.cadastrarBandeiraCartao(bandeira)),
    [execute],
  );

  const listarCategoriasMovimentacao = useCallback(
    () => execute((financeRepository) => financeRepository.listarCategoriasMovimentacao(userId)),
    [execute, userId],
  );

  const cadastrarCategoriaMovimentacao = useCallback(
    (categoria: CategoriaMovimentacaoInput) =>
      execute((financeRepository) => financeRepository.cadastrarCategoriaMovimentacao(categoria)),
    [execute],
  );

  const listarContas = useCallback(
    () => execute((financeRepository) => financeRepository.listarContas(userId)),
    [execute, userId],
  );

  const listarCartoes = useCallback(
    () => execute((financeRepository) => financeRepository.listarCartoes(userId)),
    [execute, userId],
  );

  return {
    loading,
    error,
    salvarMovimentacao,
    atualizarMovimentacao,
    excluirMovimentacao,
    buscarResumoMensal,
    buscarFaturaAtual,
    salvarDadosComplementaresUsuario,
    buscarDadosComplementaresUsuario,
    cadastrarConta,
    atualizarConta,
    excluirConta,
    cadastrarCartao,
    atualizarCartao,
    excluirCartao,
    cadastrarRenda,
    atualizarRenda,
    excluirRenda,
    listarRendas,
    listarBandeirasCartao,
    cadastrarBandeiraCartao,
    listarCategoriasMovimentacao,
    cadastrarCategoriaMovimentacao,
    listarContas,
    listarCartoes,
  };
}
