import { Link } from 'react-router-dom';
import type { StorefrontProductResponse } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useSaved } from '@/lib/saved';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

export function ProductCard({
  product,
}: {
  product: StorefrontProductResponse;
}) {
  const { saved, toggle } = useSaved();
  const isSaved = saved.includes(product.id);
  const low = product.variants?.reduce<
    (typeof product.variants)[number] | null
  >(
    (min, value) =>
      !min || Number(value.price) < Number(min.price) ? value : min,
    null,
  );
  return (
    <article className="product-card">
      <div className="product-card-visual">
        <Link to={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
          <ProductImage productId={product.id} name={product.name} />
        </Link>
        <button
          className={`save-button ${isSaved ? 'is-saved' : ''}`}
          onClick={() => toggle(product.id)}
          aria-label={`${isSaved ? 'Bỏ lưu' : 'Lưu'} ${product.name}`}
          aria-pressed={isSaved}
        >
          <Icon
            name="heart"
            size={18}
            fill={isSaved ? 'currentColor' : 'none'}
          />
        </button>
        <Link className="product-card-view" to={`/products/${product.id}`}>
          Khám phá sản phẩm <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className="product-card-details">
        <span className="product-category">
          {product.category?.name ?? 'Bộ sưu tập Aydibro'}
        </span>
        <h3>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card-bottom">
          {low ? (
            <span className="price">
              {product.variants.length > 1 && <small>Từ </small>}
              {formatMoney(low.price, low.currency)}
            </span>
          ) : (
            <span className="muted">Chưa mở bán</span>
          )}
          <Link
            className="product-arrow"
            to={`/products/${product.id}`}
            aria-label={`Xem ${product.name}`}
          >
            <Icon name="arrow-up" size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
