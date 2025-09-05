import { useEffect, useState } from 'react';
import { fetchEligibleMenuAPI } from '../utils/functions';

// Fetch eligible menu items for a given customer and optional diet type
// Returns: { items, loading, error, refresh }
export function useEligibleMenu({ customerId, dietType } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (signal) => {
    try {
      setLoading(true);
      setError('');
      const arr = await fetchEligibleMenuAPI({ customer_id: customerId, dietType });
      if (!signal?.aborted) setItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      if (!signal?.aborted) setError(e?.message || 'Failed to load eligible menu');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, dietType]);

  return { items, loading, error, refresh: () => load() };
}
