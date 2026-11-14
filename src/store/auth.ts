import { create } from 'zustand';
import { storage } from './storage';
import type { Session, Tokens, User } from '../types';

const KEY = 'bulir.session';

interface AuthState {
  tokens: Tokens | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  setTokens: (tokens: Tokens) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

const persist = (tokens: Tokens | null, user: User | null) =>
  tokens && user ? storage.set(KEY, JSON.stringify({ tokens, user })).catch(() => {}) : Promise.resolve();

/** Sessão em memória (Zustand), guardada no armazenamento seguro do dispositivo. */
export const useAuth = create<AuthState>((set, get) => ({
  tokens: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await storage.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {
      await storage.del(KEY);
    }
    set({ hydrated: true });
  },
  setSession: async ({ user, ...tokens }) => {
    set({ tokens, user });
    await storage.set(KEY, JSON.stringify({ tokens, user }));
  },
  setTokens: (tokens) => {
    set({ tokens });
    void persist(tokens, get().user);
  },
  setUser: (user) => {
    set({ user });
    void persist(get().tokens, user);
  },
  logout: async () => {
    set({ tokens: null, user: null });
    await storage.del(KEY);
  },
}));
