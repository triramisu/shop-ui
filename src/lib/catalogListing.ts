import type { StorefrontProductVariantResponse } from './types';

export const LISTING_PAGE_SIZE = 12;
export const LISTING_MAX_PAGE = 10_000;
export const LISTING_SORTS = [
  { value: 'CREATED_AT:DESC', label: 'Mới nhất' },
  { value: 'CREATED_AT:ASC', label: 'Cũ nhất' },
  { value: 'NAME:ASC', label: 'Tên A – Z' },
  { value: 'NAME:DESC', label: 'Tên Z – A' },
] as const;

export type ListingSort = (typeof LISTING_SORTS)[number]['value'];
export type ListingView = 'grid' | 'list';
export interface ListingState {
  keyword: string;
  categoryId: string;
  sort: ListingSort;
  page: number;
  view: ListingView;
}

export function readListingState(params: URLSearchParams): ListingState {
  const rawPage = params.get('page') ?? '0';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  const category = params.get('category') ?? '';
  const sort = params.get('sort');
  return {
    keyword: (params.get('q') ?? '').trim().slice(0, 100),
    categoryId:
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        category,
      )
        ? category.toLowerCase()
        : '',
    sort: LISTING_SORTS.some((item) => item.value === sort)
      ? (sort as ListingSort)
      : 'CREATED_AT:DESC',
    page: Number.isSafeInteger(page) && page <= LISTING_MAX_PAGE ? page : 0,
    view: params.get('view') === 'list' ? 'list' : 'grid',
  };
}

export function patchListingParams(
  current: URLSearchParams,
  patch: Partial<ListingState>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const names = {
    keyword: 'q',
    categoryId: 'category',
    sort: 'sort',
    page: 'page',
    view: 'view',
  } as const;
  for (const name of Object.keys(patch) as Array<keyof ListingState>) {
    const value = patch[name];
    if (
      value === '' ||
      value === 0 ||
      value === 'grid' ||
      value === 'CREATED_AT:DESC'
    ) {
      next.delete(names[name]);
    } else if (value !== undefined) {
      next.set(names[name], String(value));
    }
  }
  if ('keyword' in patch || 'categoryId' in patch || 'sort' in patch)
    next.delete('page');
  return next;
}

export function listingPageItems(
  page: number,
  totalPages: number,
): Array<number | 'gap'> {
  if (!Number.isSafeInteger(totalPages) || totalPages <= 0) return [];
  const last = Math.min(totalPages - 1, LISTING_MAX_PAGE);
  const selected = Math.min(
    Math.max(Number.isSafeInteger(page) ? page : 0, 0),
    last,
  );
  const pages = [...new Set([0, selected - 1, selected, selected + 1, last])]
    .filter((value) => value >= 0 && value <= last)
    .sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) result.push('gap');
    result.push(value);
  });
  return result;
}

export function listingPrice(variants: StorefrontProductVariantResponse[]) {
  if (
    !variants.length ||
    new Set(variants.map((item) => item.currency)).size !== 1
  )
    return null;
  const prices = variants.map((item) => Number(item.price));
  if (
    prices.some((price) => !Number.isFinite(price) || price < 0) ||
    variants.some(
      (item) =>
        item.price == null ||
        String(item.price).trim() === '' ||
        !item.currency?.trim(),
    )
  )
    return null;
  const minimum = Math.min(...prices);
  const variant = variants[prices.indexOf(minimum)];
  return {
    amount: variant.price,
    currency: variant.currency,
    from: prices.some((price) => price !== minimum),
  };
}
