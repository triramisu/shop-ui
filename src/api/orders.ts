import { api } from '@/lib/apiClient';
import type { OrderHistoryResponse, OrderSnapshotResponse } from '@/lib/types';

export const ordersApi = {
  history: (page: number, signal?: AbortSignal) =>
    api.get<OrderHistoryResponse>('/orders', {
      query: { page, size: 10 },
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    api.get<OrderSnapshotResponse>(`/orders/${encodeURIComponent(id)}`, {
      signal,
    }),
};
