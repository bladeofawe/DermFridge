import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: number;
  email: string;
  language: string;
}

interface AuthResponse {
  success: boolean;
  status?: number;
  data?: User;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<AuthResponse>;
  resetPassword: (token: string, password: string) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/me`, {
          method: "GET",
          credentials: "include",
        });
        console.log("Response status:", response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log("User data:", userData);
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch (e) {
        return { success: false, status: response.status, error: "Invalid server response" };
      }

      if (response.status === 422) {
        const message = data?.detail?.[0]?.msg || "Invalid input";
        return { success: false, status: 422, error: message };
      }

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: data.detail || "Authentication failed",
        };
      }

      const cleanUser = data.user;
      setUser(cleanUser);

      return { success: true, data: cleanUser };

    } catch (error) {
      return { success: false, error: "Connection error" };
    }
  };

  const signup = async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: data.detail || "Registration failed",
        };
      }

      setUser(data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Connection error" };
    }
  };

  const forgotPassword = async (email: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: data.detail || "Error during request",
        };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Connection error" };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: data.detail || "Error during reset",
        };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Connection error" };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};