import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginPayload, RegisterPayload, UserProfileUpdateRequest, authApi } from '../services/auth';
import { getStoredToken, setStoredToken, clearStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateProfile: (payload: UserProfileUpdateRequest) => Promise<User>;
  updateUser: (updatedUser: User) => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('treeguard_active_role') as UserRole) || null;
  });

  // Initialize session by verifying token with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getProfile();
        setUser(currentUser);
        setToken(storedToken);
      } catch (err) {
        // Fallback to getMe if profile endpoint fails during startup
        try {
          const currentUser = await authApi.getMe();
          setUser(currentUser);
          setToken(storedToken);
        } catch {
          clearStoredToken();
          setUser(null);
          setToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const handleAuthExpired = () => {
      clearStoredToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('treeguard:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('treeguard:auth_expired', handleAuthExpired);
    };
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      setStoredToken(response.access_token, !!payload.remember_me);
      setToken(response.access_token);
      
      // Fetch full profile if available
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
        return profile;
      } catch {
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await authApi.register(payload);
      // Flow requirement: Do NOT log user in automatically. Redirect to Sign In.
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      clearStoredToken();
      setUser(null);
      setToken(null);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const currentUser = await authApi.getProfile();
      setUser(currentUser);
      return currentUser;
    } catch {
      try {
        const currentUser = await authApi.getMe();
        setUser(currentUser);
        return currentUser;
      } catch {
        clearStoredToken();
        setUser(null);
        setToken(null);
        return null;
      }
    }
  };

  const updateProfile = async (payload: UserProfileUpdateRequest): Promise<User> => {
    const updatedUser = await authApi.updateProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  const switchRole = (newRole: UserRole): void => {
    try {
      localStorage.setItem('treeguard_active_role', newRole);
    } catch {
      // Ignore storage error
    }
    setActiveRole(newRole);
    if (user) {
      setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      localStorage.removeItem('treeguard_active_role');
    } catch {
      // Ignore storage error
    }
    setActiveRole(null);
    await logout();
  };

  const effectiveRole: UserRole | null = activeRole || user?.role || (user ? 'citizen' : null);
  const effectiveUser: User | null = user
    ? {
        ...user,
        role: effectiveRole || user.role,
        full_name:
          effectiveRole === 'inspector' && (!user.full_name || user.full_name === 'User' || user.role === 'citizen')
            ? 'Marcus Chen'
            : effectiveRole === 'admin' && (!user.full_name || user.full_name === 'User' || user.role === 'citizen')
            ? 'David Kim'
            : user.full_name,
      }
    : null;

  const value: AuthContextType = {
    user: effectiveUser,
    token,
    role: effectiveRole,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout: handleLogout,
    refreshUser,
    updateProfile,
    updateUser,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
