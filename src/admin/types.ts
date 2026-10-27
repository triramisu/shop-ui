export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
export interface AdminCategory {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface AdminVariant {
  id: string;
  sku: string;
  name: string;
  price: string | number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  version: number;
}
export interface AdminProduct {
  id: string;
  category: AdminCategory;
  name: string;
  slug: string;
  description?: string;
  status: ProductStatus;
  version: number;
  variants: AdminVariant[];
  createdAt: string;
  updatedAt: string;
}
export interface AdminImage {
  id: string;
  url: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  primary: boolean;
  displayOrder: number;
  version: number;
}
export interface StockItem {
  id: string;
  productVariantId: string;
  sku: string;
  locationCode: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface StockMovement {
  id: string;
  movementType: string;
  onHandDelta: number;
  reservedDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  reason?: string;
  referenceId?: string;
  occurredAt: string;
}
export interface ProductInput {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
}
export interface VariantInput {
  sku?: string;
  name: string;
  price: string;
  currency: string;
}
