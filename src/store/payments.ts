import { create } from 'zustand';
import { storage } from './storage';

export interface PaymentCard { id: string; brand: 'visa' | 'mastercard'; last4: string; holder: string; expiry: string; isDefault: boolean }
const key = (uid: string) => `bulir.cards.${uid}`;

interface State {
  uid: string | null; cards: PaymentCard[];
  load: (uid: string) => Promise<void>;
  add: (c: Omit<PaymentCard, 'id' | 'isDefault'>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
}

/** Só guardamos os últimos 4 dígitos (nunca o número completo nem o CVV). */
export const usePayments = create<State>((set, get) => {
  const save = (cards: PaymentCard[]) => {
    set({ cards });
    const { uid } = get();
    if (uid) storage.set(key(uid), JSON.stringify(cards)).catch(() => {});
  };
  return {
    uid: null, cards: [],
    load: async (uid) => {
      try { set({ uid, cards: JSON.parse((await storage.get(key(uid))) ?? '[]') }); } catch { set({ uid, cards: [] }); }
    },
    add: (c) => { const cards = get().cards; save([...cards, { ...c, id: String(Date.now()), isDefault: cards.length === 0 }]); },
    remove: (id) => {
      const rest = get().cards.filter((c) => c.id !== id);
      if (rest.length && !rest.some((c) => c.isDefault)) rest[0].isDefault = true;
      save(rest);
    },
    setDefault: (id) => save(get().cards.map((c) => ({ ...c, isDefault: c.id === id }))),
  };
});
