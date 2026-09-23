import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  medicineId: string;
  name: string;
  imageUrl: string | null;
  packSize: string;
  requiresPrescription: boolean;
  unitPrice: number;
  mrp: number;
  quantity: number;
}

interface CartState {
  pharmacyId: string | null;
  pharmacyName: string | null;
  lines: CartLine[];
  addItem: (pharmacyId: string, pharmacyName: string, line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  updateQuantity: (medicineId: string, quantity: number) => void;
  removeItem: (medicineId: string) => void;
  clear: () => void;
}

/**
 * Client-side cart for the browse/demo experience (Phase 7). A pharmacy-bound cart with real
 * checkout, persisted server-side, arrives with orders in Phase 11/12 — this keeps the "Add"
 * button and quantity steppers on product cards working in the meantime.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      pharmacyId: null,
      pharmacyName: null,
      lines: [],
      addItem: (pharmacyId, pharmacyName, line, quantity = 1) => {
        const state = get();
        // Switching pharmacy starts a new cart — prices are pharmacy-specific.
        const lines = state.pharmacyId && state.pharmacyId !== pharmacyId ? [] : state.lines;
        const existing = lines.find((l) => l.medicineId === line.medicineId);
        set({
          pharmacyId,
          pharmacyName,
          lines: existing
            ? lines.map((l) => (l.medicineId === line.medicineId ? { ...l, quantity: l.quantity + quantity } : l))
            : [...lines, { ...line, quantity }],
        });
      },
      updateQuantity: (medicineId, quantity) =>
        set((state) => ({
          lines: quantity <= 0 ? state.lines.filter((l) => l.medicineId !== medicineId) : state.lines.map((l) => (l.medicineId === medicineId ? { ...l, quantity } : l)),
        })),
      removeItem: (medicineId) => set((state) => ({ lines: state.lines.filter((l) => l.medicineId !== medicineId) })),
      clear: () => set({ pharmacyId: null, pharmacyName: null, lines: [] }),
    }),
    { name: 'carebridge-cart' },
  ),
);

export function useCartCount() {
  return useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
}
