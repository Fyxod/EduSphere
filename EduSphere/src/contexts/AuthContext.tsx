import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, AuthState } from '@/types';
import { authApi, userApi } from '@/services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'user' | 'creator') => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'edusphere_user';

type ApiError = Error & { status?: number };

// Transform API user to frontend User type
const transformUser = (apiUser: { _id: string; name: string; email: string; role: 'user' | 'creator'; avatar?: string; bio?: string; createdAt: string }, token?: string): User & { token?: string } => ({
  id: apiUser._id,
  name: apiUser.name,
  email: apiUser.email,
  role: apiUser.role,
  avatar: apiUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiUser.name}`,
  bio: apiUser.bio,
  createdAt: apiUser.createdAt,
  token,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return {
          user: parsed,
          isAuthenticated: true,
          isLoading: false,
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  const [error, setError] = useState<string | null>(null);


  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data?.user) {
            const parsed = JSON.parse(savedUser);
            const user = transformUser(response.data.user as Parameters<typeof transformUser>[0], parsed.token);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err) {
          const apiError = err as ApiError;

          if (apiError.status === 401 || apiError.status === 403) {
            // Token invalid, clear storage
            localStorage.removeItem(STORAGE_KEY);
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            // Preserve existing session data when backend is unreachable or returns non-auth errors
            setState(prev => ({
              ...prev,
              isLoading: false,
            }));
          }
        }
      }
    };

    verifyAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    
    try {
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        const user = transformUser(response.data.user as Parameters<typeof transformUser>[0], response.data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: 'user' | 'creator') => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    
    try {
      const response = await authApi.register(name, email, password, role);
      
      if (response.success && response.data) {
        const user = transformUser(response.data.user as Parameters<typeof transformUser>[0], response.data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    
    localStorage.removeItem(STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });

    // Also update on backend
    try {
      await userApi.updateProfile({
        name: updates.name,
        bio: updates.bio,
        avatar: updates.avatar,
      });
    } catch {
      // Silently fail - local update already done
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
