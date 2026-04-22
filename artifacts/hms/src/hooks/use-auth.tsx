import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserWithProfile, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: UserWithProfile | null;
  token: string | null;
  login: (token: string, user: UserWithProfile) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;
  });
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [, setLocation] = useLocation();

  const { data: meData, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
  }, [meData]);

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string, newUser: UserWithProfile) => {
    localStorage.setItem("hms_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("hms_token");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading: isLoading && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
