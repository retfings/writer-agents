import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './api';

interface User {
  id: string;
  username: string;
  displayName: string;
  approvalMode: 'auto' | 'manual';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateApprovalMode: (mode: 'auto' | 'manual') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      auth.me()
        .then(({ user: u }) => {
          setUser(u);
          if (window.location.pathname === '/login') {
            navigate('/', { replace: true });
          }
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user: u } = await auth.login(username, password);
    localStorage.setItem('token', token);
    setUser(u);
    navigate('/', { replace: true });
  };

  const register = async (username: string, password: string, displayName: string) => {
    const { token, user: u } = await auth.register(username, password, displayName);
    localStorage.setItem('token', token);
    setUser(u);
    navigate('/', { replace: true });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  const updateApprovalMode = async (mode: 'auto' | 'manual') => {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ approvalMode: mode }),
    });
    const data = await res.json();
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateApprovalMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
