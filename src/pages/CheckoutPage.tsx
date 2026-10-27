import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { PurchaseSteps } from '@/components/PurchaseSteps';
import { formatMoney, newIdempotencyKey } from '@/lib/format';
import { ApiError } from '@/lib/apiClient';

export function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const attempt = useRef({ version: -1, key: '' });
  const cart = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });
  const version = cart.data?.version;
  const quote = useQuery({
    queryKey: ['quote', version],
    queryFn: () => checkoutApi.quote(version!),
    enabled: version !== undefined && !!cart.data?.items.length,
  });
  const placeOrder = useMutation({
    mutationFn: () => {
      if (!quote.data) throw new Error('Báo giá chưa sẵn sàng.');
      if (attempt.current.version !== quote.data.cartVersion)
        attempt.current = {
          version: quote.data.cartVersion,
          key: newIdempotencyKey(),
        };
      return checkoutApi.createOrder(
        quote.data.cartVersion,
        attempt.current.key,
      );
    },
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: ['cart'] });
      qc.removeQueries({ queryKey: ['quote'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`, {
        replace: true,
        state: { orderCreated: true },
      });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Đặt hàng chưa thành công. Vui lòng thử lại.',
      );
      if (err instanceof ApiError && err.status === 409)
        void qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
  if (cart.isLoading || quote.isLoading)
    return <Spinner label="Đang chuẩn bị báo giá của bạn…" />;
  if (cart.isError)
    return (
      <div className="container inner-page">
        <ErrorBox
          message="Chưa kết nối được giỏ hàng."
          retry={() => void cart.refetch()}
        />
      </div>
    );
  if (!cart.data?.items.length)
    return (
      <div className="container inner-page">
        <EmptyState
          title="Chưa có sản phẩm để đặt hàng"
          description="Hãy chọn một món đồ yêu thích trước khi tiếp tục."
        >
          <Link to="/#products" className="btn btn-dark">
            Khám phá cửa hàng <Icon name="arrow" size={17} />
          </Link>
        </EmptyState>
      </div>
    );
  if (quote.isError || !quote.data)
    return (
      <div className="container inner-page">
        <ErrorBox
          message="Chưa tạo được báo giá. Hãy kiểm tra lại các sản phẩm trong giỏ."
          retry={() => {
            void cart.refetch();
            void quote.refetch();
          }}
        />
        <Link to="/cart" className="text-link cart-back">
          Quay lại giỏ hàng <Icon name="arrow" size={16} />
        </Link>
      </div>
    );
  const q = quote.data;
  return (
    <div className="container inner-page">
      <Breadcrumbs
        items={[
          { label: 'Giỏ hàng', to: '/cart' },
          { label: 'Xác nhận đặt hàng' },
        ]}
      />
      <div className="page-heading">
        <span className="eyebrow">ONE STEP CLOSER</span>
        <h1>
          Sắp là của bạn rồi<span className="accent-period">.</span>
        </h1>
        <p>Kiểm tra lại một lần nữa, rồi cùng hoàn tất đơn hàng nhé.</p>
      </div>
      <PurchaseSteps current={1} />
      <div className="checkout-layout">
        <section>
          <div className="checkout-lines">
            {q.lines.map((line) => (
              <article className="checkout-line" key={line.cartItemId}>
                <div>
                  <h3>{line.name}</h3>
                  <p>
                    {line.sku} · {line.quantity} ×{' '}
                    {formatMoney(line.unitPrice, q.currency)}
                  </p>
                </div>
                <span className="price">
                  {formatMoney(line.total, q.currency)}
                </span>
              </article>
            ))}
          </div>
          <div className="checkout-explainer">
            <Icon name="info" size={22} />
            <div>
              <h3>Điều gì diễn ra tiếp theo?</h3>
              <p>
                Hệ thống sẽ kiểm tra giá và tồn kho, sau đó tạo đơn hàng. Thanh
                toán chỉ được ghi nhận khi có xác nhận hợp lệ; việc tạo đơn chưa
                đồng nghĩa bạn đã thanh toán.
              </p>
            </div>
          </div>
          <Link to="/cart" className="text-link cart-back">
            <Icon
              name="arrow"
              size={16}
              style={{ transform: 'rotate(180deg)' }}
            />
            Chỉnh sửa giỏ hàng
          </Link>
        </section>
        <aside className="summary-panel">
          <h2>Tóm tắt đơn hàng</h2>
          <div className="summary-row">
            <span>Tạm tính</span>
            <span>{formatMoney(q.subtotal, q.currency)}</span>
          </div>
          <div className="summary-row">
            <span>Giảm giá</span>
            <span>−{formatMoney(q.discount, q.currency)}</span>
          </div>
          <div className="summary-row">
            <span>Thuế ({Number(q.taxRate) * 100}%)</span>
            <span>{formatMoney(q.tax, q.currency)}</span>
          </div>
          <div className="summary-total">
            <span>Tổng thanh toán</span>
            <strong>{formatMoney(q.grandTotal, q.currency)}</strong>
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn btn-dark btn-block"
            disabled={placeOrder.isPending || quote.isFetching}
            onClick={() => {
              setError('');
              placeOrder.mutate();
            }}
          >
            {placeOrder.isPending ? 'Đang tạo đơn hàng…' : 'Xác nhận đặt hàng'}
            <Icon name="arrow" size={17} />
          </button>
          <p className="form-hint">
            Giá và số lượng được kiểm tra lại khi bạn xác nhận.
          </p>
          <div className="summary-note">
            <Icon name="shield" size={18} />
            <span>
              Chúng tôi bảo vệ thao tác đặt hàng khỏi việc tạo trùng khi bạn thử
              lại.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
