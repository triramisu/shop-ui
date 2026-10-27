import { apiRequest } from '@/lib/apiClient';
import type {
  AdminCategory,
  AdminImage,
  AdminProduct,
  Page,
  ProductInput,
  ProductStatus,
  StockItem,
  StockMovement,
  VariantInput,
} from './types';

const catalog = '/admin/catalog';
const inventory = '/admin/inventory/stock-items';
type Query = Record<string, string | number | boolean | undefined | null>;
function segment(id: string): string {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw new Error('Mã tài nguyên không hợp lệ.');
  return id;
}
// No mutation retry/refresh replay: a timeout may follow a committed write.
const write = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, { method, body, retryAuth: false });
export const adminApi = {
  categories: (signal?: AbortSignal) =>
    apiRequest<AdminCategory[]>(`${catalog}/categories`, { signal }),
  createCategory: (body: { code: string; name: string; slug: string }) =>
    write<AdminCategory>(`${catalog}/categories`, 'POST', body),
  updateCategory: (
    id: string,
    body: { name: string; slug: string; version: number },
  ) =>
    write<AdminCategory>(`${catalog}/categories/${segment(id)}`, 'PUT', body),
  categoryStatus: (item: AdminCategory) =>
    write<AdminCategory>(
      `${catalog}/categories/${segment(item.id)}/status`,
      'PATCH',
      {
        status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        version: item.version,
      },
    ),
  products: (query: Query, signal?: AbortSignal) =>
    apiRequest<Page<AdminProduct>>(`${catalog}/products`, { query, signal }),
  product: (id: string, signal?: AbortSignal) =>
    apiRequest<AdminProduct>(`${catalog}/products/${segment(id)}`, { signal }),
  createProduct: (body: ProductInput) =>
    write<AdminProduct>(`${catalog}/products`, 'POST', body),
  updateProduct: (id: string, body: ProductInput & { version: number }) =>
    write<AdminProduct>(`${catalog}/products/${segment(id)}`, 'PUT', body),
  productStatus: (item: AdminProduct, action: 'publish' | 'hide') =>
    write<AdminProduct>(
      `${catalog}/products/${segment(item.id)}/${action}`,
      'PATCH',
      { version: item.version },
    ),
  addVariant: (item: AdminProduct, body: VariantInput) =>
    write<AdminProduct>(
      `${catalog}/products/${segment(item.id)}/variants`,
      'POST',
      { ...body, productVersion: item.version },
    ),
  updateVariant: (
    id: string,
    variantId: string,
    body: VariantInput & { version: number },
  ) =>
    write<AdminProduct>(
      `${catalog}/products/${segment(id)}/variants/${segment(variantId)}`,
      'PUT',
      body,
    ),
  variantStatus: (
    id: string,
    variantId: string,
    status: 'ACTIVE' | 'INACTIVE',
    version: number,
  ) =>
    write<AdminProduct>(
      `${catalog}/products/${segment(id)}/variants/${segment(variantId)}/status`,
      'PATCH',
      { status, version },
    ),
  images: (id: string, signal?: AbortSignal) =>
    apiRequest<AdminImage[]>(`${catalog}/products/${segment(id)}/images`, {
      signal,
    }),
  upload: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiRequest<AdminImage[]>(
      `${catalog}/products/${segment(id)}/images`,
      { method: 'POST', formData, retryAuth: false },
    );
  },
  arrange: (id: string, imageIds: string[], primaryImageId: string) =>
    write<AdminImage[]>(
      `${catalog}/products/${segment(id)}/images/arrangement`,
      'PUT',
      { imageIds, primaryImageId },
    ),
  removeImage: (id: string, imageId: string) =>
    write<AdminImage[]>(
      `${catalog}/products/${segment(id)}/images/${segment(imageId)}`,
      'DELETE',
    ),
  stocks: (query: Query, signal?: AbortSignal) =>
    apiRequest<Page<StockItem>>(inventory, { query, signal }),
  stock: (id: string, signal?: AbortSignal) =>
    apiRequest<StockItem>(`${inventory}/${segment(id)}`, { signal }),
  createStock: (body: {
    sku: string;
    locationCode: string;
    initialQuantity: number;
    reason: string;
    referenceId: string;
  }) => write<StockItem>(inventory, 'POST', body),
  adjustStock: (
    id: string,
    body: {
      quantityDelta: number;
      reason: string;
      referenceId: string;
      version: number;
    },
  ) =>
    write<StockItem>(`${inventory}/${segment(id)}/adjustments`, 'POST', body),
  movements: (id: string, page: number, signal?: AbortSignal) =>
    apiRequest<Page<StockMovement>>(`${inventory}/${segment(id)}/movements`, {
      query: { page, size: 20 },
      signal,
    }),
};
export function statusLabel(status: ProductStatus | string) {
  return (
    (
      {
        DRAFT: 'Bản nháp',
        PUBLISHED: 'Đang bán',
        HIDDEN: 'Đã ẩn',
        ARCHIVED: 'Lưu trữ',
        ACTIVE: 'Hoạt động',
        INACTIVE: 'Tạm ngưng',
      } as Record<string, string>
    )[status] ?? status
  );
}
