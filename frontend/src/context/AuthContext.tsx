import { createContext, useContext, useState, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────
interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, extraData?: Partial<User>) => void;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

/** Hook to access auth state from any component */
export const useAuth = () => useContext(AuthContext);

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Hydrate from localStorage on first render
    const email = localStorage.getItem('email');
    if (!email) return null;

    const raw = localStorage.getItem('googleUser');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          email: parsed.email || email,
          name: parsed.name,
          picture: parsed.picture,
        };
      } catch {
        // Corrupted JSON — fall through
      }
    }

    const name = localStorage.getItem('name') || undefined;
    return { email, name };
  });

  const login = (email: string, extraData?: Partial<User>) => {
    const newUser: User = { email, ...extraData };
    setUser(newUser);
    localStorage.setItem('email', email);
    if (extraData?.name) localStorage.setItem('name', extraData.name);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    localStorage.removeItem('googleUser');
    localStorage.removeItem('token');
    localStorage.removeItem('rating');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
