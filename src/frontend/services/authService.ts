import type { UserProfile } from "../types/finance";

export async function signInWithGoogle(): Promise<UserProfile> {
  return {
    id: "google:demo",
    name: "Conta Google",
    email: "google.demo@gstec-cashflow.local",
    authProvider: "google",
  };
}
