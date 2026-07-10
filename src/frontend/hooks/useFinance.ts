import { useCallback, useState } from "react";
import { databaseService } from "../services/DatabaseService";
import { FinanceRepository } from "../repositories/FinanceRepository";
import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "../repositories/IFinanceRepository";
import type { CartaoCreditoInput, MovimentacaoInput } from "../types/finance";

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

  return {
    loading,
    error,
    salvarMovimentacao,
    buscarResumoMensal,
    buscarFaturaAtual,
    cadastrarCartao,
  };
}
