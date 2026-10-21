import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { StorefrontProductResponse } from '@/lib/types';
import { listingPrice } from '@/lib/catalogListing';
import { formatMoney } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { createSaveFeedback } from '@/lib/saveFeedback';

export function ListingProductCard({
  product,
  saved,
  onToggle,
}: {
  product: StorefrontProductResponse;
  saved: boolean;
  onToggle: (product: StorefrontProductResponse) => void;
}) {
  const price = listingPrice(product.variants ?? []);
  const saveGlyph = useRef<HTMLSpanElement>(null);
  const saveFeedback = useRef<ReturnType<typeof createSaveFeedback>>();
  useEffect(() => {
    if (!saveGlyph.current || typeof window.matchMedia !== 'function') return;
    const feedback = createSaveFeedback(
      saveGlyph.current,
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    );
    saveFeedback.current = feedback;
    return () => {
      feedback.dispose();
      saveFeedback.current = undefined;
    };
  }, []);
  return (
    <li className="plp-product">
      <article aria-labelledby={`listing-product-${product.id}`}>
        <div className="plp-product-media">
          <Link to={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
            <ProductImage productId={product.id} name={product.name} />
          </Link>
          <button
            className={`plp-save ${saved ? 'is-saved' : ''}`}
            type="button"
            aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} ${product.name}`}
            aria-pressed={saved}
            onClick={() => {
              onToggle(product);
              saveFeedback.current?.play(!saved);
            }}
          >
            <span className="plp-save-glyph" ref={saveGlyph} aria-hidden="true">
              <Icon
                name="heart"
                size={19}
                fill={saved ? 'currentColor' : 'none'}
              />
            </span>
          </button>
        </div>
        <div className="plp-product-body">
          <p className="plp-product-category">
            {product.category?.name ?? 'Bộ sưu tập'}
          </p>
          <h3 id={`listing-product-${product.id}`}>
            <Link to={`/products/${product.id}`}>{product.name}</Link>
          </h3>
          {product.description && (
            <p className="plp-product-description">{product.description}</p>
          )}
          <div className="plp-product-price">
            {price ? (
              <p>
                {price.from && <span>Từ </span>}
                {formatMoney(price.amount, price.currency)}
              </p>
            ) : (
              <p className="plp-price-note">
                {product.variants?.length
                  ? 'Xem giá từng phiên bản'
                  : 'Chưa mở bán'}
              </p>
            )}
            <span>{product.variants?.length ?? 0} phiên bản</span>
          </div>
          <Link className="plp-product-action" to={`/products/${product.id}`}>
            {product.variants?.length ? 'Chọn phiên bản' : 'Xem sản phẩm'}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </article>
    </li>
  );
}
