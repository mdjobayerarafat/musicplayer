'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { account } from './appwrite';
import { User } from './types';
import { Models } from 'appwrite';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await account.get();
      const appwriteUser = response as Models.User<Models.Preferences>;
      setUser({
        $id: appwriteUser.$id,
        name: appwriteUser.name,
        email: appwriteUser.email,
        isAdmin: false,
      });
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    await refreshUser();
  };

  const register = async (name: string, email: string, password: string) => {
    await account.create('unique()', email, password, name);
    await account.createEmailPasswordSession(email, password);
    await refreshUser();
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
