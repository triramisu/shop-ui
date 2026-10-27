import type { QueryClient } from '@tanstack/react-query';

/** Không xóa catalog public; hủy request riêng tư trước khi bỏ cache. */
export function clearCustomerQueries(client: QueryClient): void {
  for (const key of ['cart', 'quote', 'orders', 'admin']) {
    void client.cancelQueries({ queryKey: [key] });
    client.removeQueries({ queryKey: [key] });
  }
  const mutations = client.getMutationCache();
  for (const mutation of mutations.getAll()) {
    if (mutation.options.mutationKey?.[0] === 'admin')
      mutations.remove(mutation);
  }
}
