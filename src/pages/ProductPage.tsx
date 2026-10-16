import { useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { cartApi } from '@/api/cart';
import { useAuth } from '@/auth/AuthContext';
import { Breadcrumbs, ErrorBox, Spinner } from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { formatMoney } from '@/lib/format';
import { useSaved } from '@/lib/saved';
import { ApiError } from '@/lib/apiClient';

export function ProductPage() {
  const { productId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { saved, toggle } = useSaved();
  const variantId = params.get('variant') ?? '';
  const [imageId, setImageId] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  const qty = Math.min(
    999,
    Math.max(1, Math.floor(Number(params.get('qty'))) || 1),
  );
  function selectOption(key: string, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }
  const [notice, setNotice] = useState<{
    kind: 'success' | 'danger';
    text: string;
  } | null>(null);
  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => catalogApi.product(productId),
    enabled: !!productId,
  });
  const images = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => catalogApi.productImages(productId),
    enabled: !!productId,
    staleTime: 4 * 60_000,
  });
  const selected = useMemo(() => {
    const variants = product.data?.variants ?? [];
    return variants.find((item) => item.id === variantId) ?? variants[0];
  }, [product.data, variantId]);
  const image =
    images.data?.find((item) => item.id === imageId) ??
    images.data?.find((item) => item.primary) ??
    images.data?.[0];
  const addToCart = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Chưa chọn phiên bản');
      return cartApi.addItem(selected.sku, qty);
    },
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      void qc.invalidateQueries({ queryKey: ['quote'] });
      setNotice({ kind: 'success', text: 'Đã thêm vào giỏ hàng của bạn.' });
    },
    onError: (error) =>
      setNotice({
        kind: 'danger',
        text:
          error instanceof ApiError
            ? error.message
            : 'Không thêm được vào giỏ. Vui lòng thử lại.',
      }),
  });

  if (product.isLoading) return <Spinner label="Đang mở sản phẩm…" />;
  if (product.isError || !product.data)
    return (
      <div className="container inner-page">
        <Breadcrumbs items={[{ label: 'Sản phẩm' }]} />
        <ErrorBox
          message="Sản phẩm có thể đã ngừng bán hoặc kết nối bị gián đoạn."
          retry={() => void product.refetch()}
        />
        <Link to="/" className="text-link">
          Quay về cửa hàng <Icon name="arrow" size={16} />
        </Link>
      </div>
    );
  const p = product.data;
  const isSaved = saved.includes(productId);

  return (
    <div className="container inner-page">
      <Breadcrumbs
        items={[
          ...(p.category
            ? [
                {
                  label: p.category.name,
                  to: `/?category=${p.category.id}#products`,
                },
              ]
            : []),
          { label: p.name },
        ]}
      />
      <div className="product-detail-grid">
        <div className="product-gallery">
          <div className="gallery-main">
            {image && image.url !== failedUrl ? (
              <img
                src={image.url}
                alt={p.name}
                onError={() => setFailedUrl(image.url)}
              />
            ) : (
              <div className="image-placeholder">
                <Icon name="box" size={64} />
                <span>
                  {images.isLoading
                    ? 'Đang tải ảnh…'
                    : 'Hình ảnh đang được cập nhật'}
                </span>
              </div>
            )}
            <span className="gallery-index">
              {p.category?.name ?? 'AYDIBRO / SELECTED'}
            </span>
            <button
              className={`save-button ${isSaved ? 'is-saved' : ''}`}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Bỏ lưu sản phẩm' : 'Lưu sản phẩm'}
              onClick={() => toggle(productId)}
            >
              <Icon name="heart" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
          {images.data && images.data.length > 1 && (
            <div className="gallery-thumbnails">
              {images.data.map((item, i) => (
                <button
                  key={item.id}
                  className={image?.id === item.id ? 'selected' : ''}
                  onClick={() => setImageId(item.id)}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-pressed={image?.id === item.id}
                >
                  <img src={item.url} alt={`${p.name}, góc ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <span className="eyebrow">
            {p.category?.name ?? 'THE AYDIBRO EDIT'}
          </span>
          <h1>{p.name}</h1>
          {p.description && (
            <p className="product-description">{p.description}</p>
          )}
          <div className="detail-price">
            {selected
              ? formatMoney(selected.price, selected.currency)
              : 'Sản phẩm chưa mở bán'}
            <small>
              {selected
                ? `Mã sản phẩm: ${selected.sku}`
                : 'Hãy quay lại khi có phiên bản mới.'}
            </small>
          </div>
          {p.variants.length > 0 && (
            <fieldset className="variant-field">
              <legend>
                Chọn phiên bản <span>{selected?.name}</span>
              </legend>
              <div className="variant-options">
                {p.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={selected?.id === variant.id ? 'selected' : ''}
                    aria-pressed={selected?.id === variant.id}
                    onClick={() => {
                      selectOption('variant', variant.id);
                      setNotice(null);
                    }}
                  >
                    {variant.name}
                    {selected?.id === variant.id && (
                      <Icon name="check" size={15} />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <label className="quantity-label" htmlFor="product-quantity">
            Số lượng
          </label>
          <div className="purchase-row">
            <div className="quantity-control">
              <button
                aria-label="Giảm số lượng"
                disabled={qty <= 1}
                onClick={() => selectOption('qty', String(qty - 1))}
              >
                <Icon name="minus" size={16} />
              </button>
              <input
                id="product-quantity"
                type="number"
                min={1}
                max={999}
                value={qty}
                onChange={(e) =>
                  selectOption(
                    'qty',
                    String(
                      Math.min(
                        999,
                        Math.max(1, Math.floor(Number(e.target.value)) || 1),
                      ),
                    ),
                  )
                }
              />
              <button
                aria-label="Tăng số lượng"
                disabled={qty >= 999}
                onClick={() => selectOption('qty', String(qty + 1))}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <button
              className="btn btn-dark"
              disabled={!selected || addToCart.isPending}
              onClick={() =>
                isAuthenticated
                  ? addToCart.mutate()
                  : navigate('/login', {
                      state: {
                        from: `/products/${productId}?${new URLSearchParams({ variant: selected?.id ?? '', qty: String(qty) })}`,
                      },
                    })
              }
            >
              <Icon name="bag" size={18} />
              {addToCart.isPending
                ? 'Đang thêm…'
                : isAuthenticated
                  ? 'Thêm vào giỏ hàng'
                  : 'Đăng nhập để mua'}
            </button>
          </div>
          {notice && (
            <div role="status" className={`alert alert-${notice.kind}`}>
              {notice.text}
              {notice.kind === 'success' && (
                <Link to="/cart">
                  Xem giỏ hàng <Icon name="arrow" size={14} />
                </Link>
              )}
            </div>
          )}
          <div className="product-reassurance">
            <span>
              <Icon name="shield" size={19} />
              Thanh toán được xác nhận bởi hệ thống
            </span>
            <span>
              <Icon name="box" size={19} />
              Kiểm tra phiên bản trước khi đặt hàng
            </span>
          </div>
          <details className="product-accordion" open>
            <summary>
              Thông tin sản phẩm <Icon name="plus" size={16} />
            </summary>
            <p>
              {p.description ||
                'Thông tin chi tiết đang được cập nhật. Bạn có thể chọn phiên bản và xem báo giá đầy đủ trước khi đặt hàng.'}
            </p>
            <dl>
              <div>
                <dt>Danh mục</dt>
                <dd>{p.category?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Phiên bản đang chọn</dt>
                <dd>{selected?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Mã SKU</dt>
                <dd>{selected?.sku ?? '—'}</dd>
              </div>
            </dl>
          </details>
        </div>
      </div>
      <div className="detail-bottom">
        <span className="eyebrow">FIND YOUR NEXT EVERYDAY FAVORITE</span>
        <Link to="/#products" className="text-link">
          Tiếp tục khám phá <Icon name="arrow" />
        </Link>
      </div>
    </div>
  );
}
