import { Link } from 'react-router-dom';
import type { StorefrontProductResponse } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useSaved } from '@/lib/saved';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';
import { listingPrice } from '@/lib/catalogListing';

export function ProductCard({
  product,
}: {
  product: StorefrontProductResponse;
}) {
  const { saved, toggle } = useSaved();
  const isSaved = saved.includes(product.id);
  const price = listingPrice(product.variants ?? []);
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
          {product.variants?.length ? 'Chọn phiên bản' : 'Xem sản phẩm'}{' '}
          <Icon name="arrow" size={17} />
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
          {price ? (
            <span className="price">
              {price.from && <small>Từ </small>}
              {formatMoney(price.amount, price.currency)}
            </span>
          ) : (
            <span className="muted">
              {product.variants?.length ? 'Xem giá từng phiên bản' : 'Chưa mở bán'}
            </span>
          )}
          <Link
            className="product-arrow"
            to={`/products/${product.id}`}
            aria-label={`Xem ${product.name}`}
          >
            <Icon name="arrow-up" size={19} />
          </Link>
        </div>
        <p className="retail-variants">
          {product.variants?.length ?? 0} phiên bản · Chọn theo gu của bạn
        </p>
      </div>
    </article>
  );
}
