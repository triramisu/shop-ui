import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { ordersApi } from '@/api/orders';
import { ApiError } from '@/lib/apiClient';
import { formatMoney, formatDateTime } from '@/lib/format';
import {
  Breadcrumbs,
  EmptyState,
  ErrorBox,
  Spinner,
} from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderPaymentPanel } from '@/components/OrderPaymentPanel';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const { user, loadingUser, refreshUser } = useAuth();
  const location = useLocation();
  const detail = useQuery({
    queryKey: ['orders', user?.id, 'detail', orderId],
    queryFn: ({ signal }) => ordersApi.detail(orderId, signal),
    enabled: !!user && !loadingUser,
    staleTime: 0,
    retry: false,
  });
  const order = detail.data;
  return (
    <div className="container inner-page order-detail-page">
      <Breadcrumbs
        items={[
          { label: 'Đơn hàng của tôi', to: '/orders' },
          { label: 'Chi tiết đơn hàng' },
        ]}
      />
      {loadingUser ? (
        <Spinner label="Đang xác thực tài khoản…" />
      ) : !user ? (
        <ErrorBox
          message="Chưa xác minh được tài khoản."
          retry={() => void refreshUser()}
        />
      ) : detail.isPending ? (
        <Spinner label="Đang đọc đơn hàng từ cửa hàng…" />
      ) : detail.isError ? (
        detail.error instanceof ApiError &&
        [400, 404].includes(detail.error.status) ? (
          <EmptyState
            icon="box"
            title="Không tìm thấy đơn hàng"
            description="Đơn hàng không tồn tại hoặc không thuộc tài khoản đang đăng nhập."
          >
            <Link className="btn btn-dark" to="/orders">
              Về đơn hàng của tôi <Icon name="arrow" size={17} />
            </Link>
          </EmptyState>
        ) : (
          <ErrorBox
            message={detail.error.message}
            retry={() => void detail.refetch()}
          />
        )
      ) : (
        order && (
          <>
            <div className="orders-heading page-heading">
              <div>
                <span className="eyebrow">
                  A LITTLE SOMETHING, CHOSEN BY YOU
                </span>
                <h1>
                  Đơn hàng của bạn<span className="accent-period">.</span>
                </h1>
                <p>Đặt ngày {formatDateTime(order.createdAt)}</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                disabled={detail.isFetching}
                onClick={() => void detail.refetch()}
              >
                <Icon name="refresh" size={16} /> Cập nhật trạng thái
              </button>
            </div>
            {(location.state as { orderCreated?: boolean } | null)
              ?.orderCreated && (
              <div className="alert alert-info">
                <strong>Đã ghi nhận đơn hàng.</strong> Cảm ơn bạn đã chọn
                Aydibro. Thông tin dưới đây được đọc lại từ hệ thống.
              </div>
            )}
            <div className="order-detail-grid">
              <section
                className="order-detail-items"
                aria-label="Sản phẩm trong đơn"
              >
                <div className="order-detail-topline">
                  <span className="order-id">Mã đơn: {order.id}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                {order.items.map((item) => (
                  <div className="order-detail-line" key={item.id}>
                    <div className="order-history-icon">
                      <Icon name="box" size={25} />
                    </div>
                    <div>
                      <h2>{item.productName}</h2>
                      <p>{item.sku}</p>
                      <p>
                        {formatMoney(item.unitPrice, item.currency)} ×{' '}
                        {item.quantity}
                      </p>
                    </div>
                    <strong>{formatMoney(item.total, item.currency)}</strong>
                  </div>
                ))}
                <p className="order-snapshot-note">
                  <Icon name="shield" size={17} /> Tên và giá sản phẩm được lưu
                  tại lúc đặt hàng, không thay đổi theo danh mục hiện tại.
                </p>
              </section>
              <aside className="summary-panel order-payment-summary">
                <span className="eyebrow">ORDER SUMMARY</span>
                <h2>Chi tiết thanh toán</h2>
                <dl>
                  <div>
                    <dt>Tiền sản phẩm</dt>
                    <dd>{formatMoney(order.subtotal, order.currency)}</dd>
                  </div>
                  <div>
                    <dt>Giảm giá</dt>
                    <dd>−{formatMoney(order.discount, order.currency)}</dd>
                  </div>
                  <div>
                    <dt>Thuế</dt>
                    <dd>{formatMoney(order.tax, order.currency)}</dd>
                  </div>
                </dl>
                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <strong>
                    {formatMoney(order.grandTotal, order.currency)}
                  </strong>
                </div>
                <OrderPaymentPanel key={`${user.id}:${order.id}`} order={order} userId={user.id} />
              </aside>
            </div>
            <div className="confirmation-actions">
              <Link to="/orders" className="btn btn-secondary">
                Tất cả đơn hàng
              </Link>
              <Link to="/#products" className={`btn ${order.status === 'PENDING' ? 'btn-secondary' : 'btn-dark'}`}>
                Tiếp tục khám phá <Icon name="arrow" size={17} />
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
}
