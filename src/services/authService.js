const sessionKey = "gstec-cashflow:session";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const userIdFromEmail = (provider, email) => `${provider}:${normalizeEmail(email)}`;

export const AuthService = {
  getSession() {
    const raw = localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) : null;
  },

  saveSession(user) {
    localStorage.setItem(sessionKey, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(sessionKey);
  },

  signInWithEmail({ name, email }) {
    const safeEmail = normalizeEmail(email);
    return {
      id: userIdFromEmail("email", safeEmail),
      name: String(name || "").trim() || safeEmail.split("@")[0] || "Usuario",
      email: safeEmail,
      photoUrl: "",
      authProvider: "email",
    };
  },

  signInWithGoogleDemo() {
    const email = "google.demo@gstec-cashflow.local";
    return {
      id: userIdFromEmail("google", email),
      name: "Conta Google",
      email,
      photoUrl: "",
      authProvider: "google",
    };
  },
};
