import { useState } from "react";
import { signInWithGoogle } from "../services/authService";
import { databaseService } from "../services/DatabaseService";
import { FinanceRepository } from "../repositories/FinanceRepository";
import type { UserProfile } from "../types/finance";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loginWithGoogle() {
    setIsLoading(true);
    try {
      const profile = await signInWithGoogle();
      const connection = await databaseService.initialize({ userId: profile.id });
      const financeRepository = new FinanceRepository(connection);
      await financeRepository.ensureInitialUserData(profile);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    user,
    isLoading,
    loginWithGoogle,
  };
}
