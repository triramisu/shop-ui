import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { readListingState } from '@/lib/catalogListing';

/** Catalog navigation must match the same category query as the listing itself. */
export function CatalogNavLink({
  categoryId = '',
  children,
}: {
  categoryId?: string;
  children: ReactNode;
}) {
  const { pathname, search } = useLocation();
  const selected = readListingState(new URLSearchParams(search)).categoryId;
  const active =
    pathname.replace(/\/+$/, '') === '/products' &&
    selected === categoryId.toLowerCase();

  return (
    <Link
      to={
        categoryId
          ? `/products?category=${encodeURIComponent(categoryId)}`
          : '/products'
      }
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
