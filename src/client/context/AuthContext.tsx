import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    role?: 'customer' | 'repairman',
    shopDetails?: {
      shopName?: string;
      shopAddress?: string;
      shopCity?: string;
      shopPin?: string;
      shopPhone?: string;
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on mount
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          setUser(json.data.user);
          setToken(storedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Login failed.');
    }

    localStorage.setItem('auth_token', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
  };

  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    role: 'customer' | 'repairman' = 'customer',
    shopDetails?: {
      shopName?: string;
      shopAddress?: string;
      shopCity?: string;
      shopPin?: string;
      shopPhone?: string;
    }
  ) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        password,
        role,
        ...shopDetails
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Registration failed.');
    }

    localStorage.setItem('auth_token', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
