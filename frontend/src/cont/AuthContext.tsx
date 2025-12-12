// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthResponse, logoutUser } from "../services/api";

interface AuthContextType {
  user: AuthResponse | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading:boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from LocalStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (data: AuthResponse) => {
    setUser(data);
    setToken(data.access_token);
    // Save to localStorage so refresh doesn't log them out
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("token", data.access_token);
  };


  const logout = async () => {
    // 1. Try to notify the server (Fire and Forget)
    if (token) {
      try {
        await logoutUser(token); 
      } catch (error) {
        console.warn("Server logout failed, but clearing local state anyway.", error);
      }
    }

    // 2. NUCLEAR OPTION: Clear everything locally
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Optional: Clear any other keys you might have set
    // localStorage.clear(); 
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};