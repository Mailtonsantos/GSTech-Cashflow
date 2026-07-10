import { useState } from "react";
import { signInWithGoogle } from "../services/authService";
import { ensureLocalDatabaseForUser } from "../services/localDatabaseService";
import type { UserProfile } from "../types/finance";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loginWithGoogle() {
    setIsLoading(true);
    try {
      const profile = await signInWithGoogle();
      await ensureLocalDatabaseForUser(profile);
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
