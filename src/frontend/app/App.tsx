import { useAuth } from "../hooks/useAuth";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";

export function App() {
  const { user, isLoading, loginWithGoogle } = useAuth();

  if (!user) {
    return <LoginPage isLoading={isLoading} onGoogleLogin={loginWithGoogle} />;
  }

  return <DashboardPage userId={user.id} />;
}
