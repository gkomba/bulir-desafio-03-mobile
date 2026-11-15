import { create } from 'zustand';
import { storage } from './storage';

const key = (uid: string) => `bulir.fav.${uid}`;

interface FavState { uid: string | null; ids: string[]; load: (uid: string) => Promise<void>; toggle: (id: string) => void }

/** Favoritos guardados localmente por utilizador (sem alteração no backend). */
export const useFavorites = create<FavState>((set, get) => ({
  uid: null, ids: [],
  load: async (uid) => {
    try { set({ uid, ids: JSON.parse((await storage.get(key(uid))) ?? '[]') }); } catch { set({ uid, ids: [] }); }
  },
  toggle: (id) => {
    const { ids, uid } = get();
    const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
    set({ ids: next });
    if (uid) storage.set(key(uid), JSON.stringify(next)).catch(() => {});
  },
}));
