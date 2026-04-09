import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { apiFetch, getAuthUserId, setAuthUserId } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  users: User[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  createUser: (username: string, password: string, role: UserRole) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    const response = await apiFetch<{ users: User[] }>('/api/auth/users');
    setUsers(response.users);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await refreshUsers();
        const userId = getAuthUserId();
        if (userId) {
          const response = await apiFetch<{ user: User }>(`/api/auth/users/${userId}`);
          if (mounted) {
            setUser(response.user);
          }
        }
      } catch (error) {
        setAuthUserId(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [refreshUsers]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiFetch<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(response.user);
      setAuthUserId(response.user.id);
      await refreshUsers();
      return true;
    } catch {
      return false;
    }
  }, [refreshUsers]);

  const logout = useCallback(() => {
    setUser(null);
    setAuthUserId(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return false;
    try {
      const response = await apiFetch<{ user: User }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      setUser(response.user);
      setUsers(prev => prev.map(u => (u.id === response.user.id ? response.user : u)));
      return true;
    } catch {
      return false;
    }
  }, [user]);

  const createUser = useCallback(async (username: string, password: string, role: UserRole) => {
    const response = await apiFetch<{ user: User }>('/api/auth/users', {
      method: 'POST',
      includeAuthUser: true,
      body: JSON.stringify({ username, password, role }),
    });
    setUsers(prev => [...prev, response.user]);
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    const response = await apiFetch<{ user: User }>(`/api/auth/users/${id}`, {
      method: 'PATCH',
      includeAuthUser: true,
      body: JSON.stringify(updates),
    });
    setUsers(prev => prev.map(u => (u.id === id ? response.user : u)));
    setUser(prev => (prev && prev.id === id ? response.user : prev));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await apiFetch<void>(`/api/auth/users/${id}`, {
      method: 'DELETE',
      includeAuthUser: true,
    });
    setUsers(prev => prev.filter(u => u.id !== id));
    setUser(prev => (prev && prev.id === id ? null : prev));
  }, []);

  const resetUserPassword = useCallback(async (id: string, newPassword: string) => {
    const response = await apiFetch<{ user: User }>(`/api/auth/users/${id}/reset-password`, {
      method: 'POST',
      includeAuthUser: true,
      body: JSON.stringify({ newPassword }),
    });
    setUsers(prev => prev.map(u => (u.id === id ? response.user : u)));
    setUser(prev => (prev && prev.id === id ? response.user : prev));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      users,
      isLoading,
      login,
      logout,
      changePassword,
      createUser,
      updateUser,
      deleteUser,
      resetUserPassword,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
