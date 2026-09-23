import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AddCartItemPayload } from '@carebridge/shared';
import { ApiError } from '@/api/client';
import { useAddCartItem } from './use-cart';
import { useIsAuthenticated } from './use-auth';

interface PharmacyConflict {
  message: string;
  confirm: () => void;
}

/**
 * Wraps adding a cart item with the two things every "Add" button on a product card needs:
 * sending signed-out shoppers to log in first, and turning the API's pharmacy-mismatch refusal
 * into a confirm-to-replace prompt instead of a raw error.
 */
export function useAddToCart() {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const addItem = useAddCartItem();
  const [conflict, setConflict] = useState<PharmacyConflict | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addToCart(payload: AddCartItemPayload) {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setError(null);
    setConflict(null);
    try {
      await addItem.mutateAsync(payload);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PHARMACY_MISMATCH') {
        setConflict({
          message: err.message,
          confirm: async () => {
            setConflict(null);
            try {
              await addItem.mutateAsync({ ...payload, replace: true });
            } catch (retryErr) {
              setError(retryErr instanceof ApiError ? retryErr.message : 'We could not add that item to your cart.');
            }
          },
        });
      } else {
        setError(err instanceof ApiError ? err.message : 'We could not add that item to your cart.');
      }
    }
  }

  return { addToCart, isPending: addItem.isPending, conflict, cancelConflict: () => setConflict(null), error, clearError: () => setError(null) };
}
