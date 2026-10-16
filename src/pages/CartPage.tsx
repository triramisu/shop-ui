import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/api/cart';
import { checkoutApi } from '@/api/checkout';
import {
  Breadcrumbs,
  EmptyState,
  ErrorBox,
  Spinner,
} from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { formatMoney } from '@/lib/format';
import type { CartResponse } from '@/lib/types';
import { ApiError } from '@/lib/apiClient';

export function CartPage() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const cart = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });
  const version = cart.data?.version;
  const quote = useQuery({
    queryKey: ['quote', version],
    queryFn: () => checkoutApi.quote(version!),
    enabled: version !== undefined && !!cart.data?.items.length,
  });
  function onCart(value: CartResponse) {
    qc.setQueryData(['cart'], value);
    setError('');
  }
  function onError(err: Error) {
    setError(
      err instanceof ApiError
        ? err.message
        : 'Chưa cập nhật được giỏ hàng. Vui lòng thử lại.',
    );
  }
  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      cartApi.updateItem(id, quantity),
    onSuccess: onCart,
    onError,
  });
  const remove = useMutation({
    mutationFn: cartApi.removeItem,
    onSuccess: onCart,
    onError,
  });
  const clear = useMutation({
    mutationFn: cartApi.clear,
    onSuccess: onCart,
    onError,
  });
  const busy = update.isPending || remove.isPending || clear.isPending;

  if (cart.isLoading) return <Spinner label="Đang mở giỏ hàng của bạn…" />;
  if (cart.isError || !cart.data)
    return (
      <div className="container inner-page">
        <ErrorBox
          message="Chưa kết nối được giỏ hàng của bạn."
          retry={() => void cart.refetch()}
        />
      </div>
    );
  const c = cart.data;

  return (
    <div className="container inner-page">
      <Breadcrumbs items={[{ label: 'Giỏ hàng' }]} />
      <div className="page-heading">
        <span className="eyebrow">YOUR EVERYDAY PICKS</span>
        <h1>
          Những lựa chọn của bạn<span className="accent-period">.</span>
        </h1>
        <p>
          {c.totalQuantity
            ? `${c.distinctItemCount} mặt hàng · ${c.totalQuantity} sản phẩm trong giỏ`
            : 'Dành chỗ cho những món đồ bạn yêu thích.'}
        </p>
      </div>
      {!c.items.length ? (
        <EmptyState
          title="Giỏ hàng còn đang trống"
          description="Một món đồ nhỏ, một cảm hứng mới. Cùng tìm thứ phù hợp với bạn nhé."
        >
          <Link to="/#products" className="btn btn-dark">
            Khám phá cửa hàng <Icon name="arrow" size={17} />
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="cart-layout">
            <section className="cart-table">
              <div className="cart-table-heading">
                <span>Sản phẩm của bạn</span>
                <button
                  className="text-button"
                  onClick={() => clear.mutate()}
                  disabled={busy}
                >
                  Xóa tất cả
                </button>
              </div>
              {c.items.map((item) => {
                const line = quote.data?.lines.find(
                  (value) => value.cartItemId === item.id,
                );
                return (
                  <article className="cart-item" key={item.id}>
                    <div className="cart-item-image">
                      <Icon name="box" size={30} />
                    </div>
                    <div>
                      <h3>{line?.name ?? item.sku}</h3>
                      <p>
                        {item.sku}
                        {line
                          ? ` · ${formatMoney(line.unitPrice, quote.data!.currency)}`
                          : ''}
                      </p>
                      <CartQuantity
                        key={`${item.id}-${item.quantity}-${busy}`}
                        quantity={item.quantity}
                        disabled={busy}
                        name={line?.name ?? item.sku}
                        onCommit={(quantity) =>
                          update.mutate({ id: item.id, quantity })
                        }
                      />
                    </div>
                    <button
                      className="remove-button"
                      disabled={busy}
                      aria-label={`Xóa ${line?.name ?? item.sku}`}
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Icon name="trash" size={16} />
                      Xóa
                    </button>
                  </article>
                );
              })}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <Link to="/#products" className="text-link cart-back">
                <Icon
                  name="arrow"
                  size={16}
                  style={{ transform: 'rotate(180deg)' }}
                />
                Tiếp tục chọn sản phẩm
              </Link>
            </section>
            <aside className="summary-panel">
              <h2>Giỏ hàng của bạn</h2>
              <div className="summary-row">
                <span>Sản phẩm</span>
                <span>{c.totalQuantity}</span>
              </div>
              {quote.data ? (
                <>
                  <div className="summary-row">
                    <span>Tạm tính</span>
                    <span>
                      {formatMoney(quote.data.subtotal, quote.data.currency)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Giảm giá</span>
                    <span>
                      −{formatMoney(quote.data.discount, quote.data.currency)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Thuế</span>
                    <span>
                      {formatMoney(quote.data.tax, quote.data.currency)}
                    </span>
                  </div>
                  <div className="summary-total">
                    <span>Tổng cộng</span>
                    <strong>
                      {formatMoney(quote.data.grandTotal, quote.data.currency)}
                    </strong>
                  </div>
                </>
              ) : (
                <p className="form-hint">
                  {quote.isLoading
                    ? 'Đang cập nhật tổng tiền…'
                    : 'Báo giá chưa khả dụng. Bạn có thể thử lại ở bước thanh toán.'}
                </p>
              )}
              <Link
                className={`btn btn-dark btn-block ${busy ? 'link-disabled' : ''}`}
                to="/checkout"
                aria-disabled={busy}
                onClick={(event) => {
                  if (busy) event.preventDefault();
                }}
              >
                Tiếp tục đặt hàng <Icon name="arrow" size={17} />
              </Link>
              <div className="summary-note">
                <Icon name="shield" size={18} />
                <span>
                  Bạn có thể kiểm tra lại toàn bộ giá và số lượng trước khi xác
                  nhận đơn hàng.
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function CartQuantity({
  quantity,
  disabled,
  name,
  onCommit,
}: {
  quantity: number;
  disabled: boolean;
  name: string;
  onCommit: (value: number) => void;
}) {
  const [value, setValue] = useState(String(quantity));
  useEffect(() => setValue(String(quantity)), [quantity]);
  function commit() {
    const next = Math.min(999, Math.max(1, Math.floor(Number(value)) || 1));
    setValue(String(next));
    if (next !== quantity) onCommit(next);
  }
  return (
    <div className="quantity-control">
      <button
        type="button"
        aria-label={`Giảm số lượng ${name}`}
        disabled={disabled || quantity <= 1}
        onClick={() => onCommit(quantity - 1)}
      >
        <Icon name="minus" size={13} />
      </button>
      <input
        aria-label={`Số lượng ${name}`}
        type="number"
        min={1}
        max={999}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        aria-label={`Tăng số lượng ${name}`}
        disabled={disabled || quantity >= 999}
        onClick={() => onCommit(quantity + 1)}
      >
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}
