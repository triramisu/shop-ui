import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { ordersApi } from '@/api/orders';
import {
  Breadcrumbs,
  EmptyState,
  ErrorBox,
  Spinner,
} from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { formatDateTime, formatMoney } from '@/lib/format';

export function OrdersPage() {
  const { user, loadingUser, refreshUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page') ?? '0';
  const parsed = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  const page =
    Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : 0;
  const orders = useQuery({
    queryKey: ['orders', user?.id, 'history', page],
    queryFn: ({ signal }) => ordersApi.history(page, signal),
    enabled: !!user && !loadingUser,
    staleTime: 0,
    retry: false,
  });
  return (
    <div className="container inner-page orders-page">
      <Breadcrumbs
        items={[
          { label: 'Tài khoản', to: '/profile' },
          { label: 'Đơn hàng của tôi' },
        ]}
      />
      <div className="orders-heading page-heading">
        <div>
          <span className="eyebrow">YOUR AYDIBRO ORDERS</span>
          <h1>
            Những lựa chọn của bạn<span className="accent-period">.</span>
          </h1>
          <p>Xem lại đơn đã đặt và trạng thái mới nhất từ cửa hàng.</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          disabled={orders.isFetching || !user}
          onClick={() => void orders.refetch()}
        >
          <Icon name="refresh" size={16} /> Cập nhật
        </button>
      </div>
      {loadingUser ? (
        <Spinner label="Đang xác thực tài khoản…" />
      ) : !user ? (
        <ErrorBox
          message="Chưa xác minh được tài khoản. Vui lòng thử lại."
          retry={() => void refreshUser()}
        />
      ) : orders.isPending ? (
        <Spinner label="Đang mở những đơn hàng của bạn…" />
      ) : orders.isError ? (
        <ErrorBox
          message={orders.error.message}
          retry={() => void orders.refetch()}
        />
      ) : orders.data.content.length ? (
        <>
          <div className="order-list-caption">
            <span>{orders.data.totalElements} đơn hàng</span>
            <span>Mới nhất trước</span>
          </div>
          <div className="order-history-list">
            {orders.data.content.map((order) => (
              <article className="order-history-card" key={order.id}>
                <div className="order-history-meta">
                  <span>Đặt ngày {formatDateTime(order.createdAt)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="order-history-body">
                  <div className="order-history-icon">
                    <Icon name="box" size={30} />
                  </div>
                  <div className="order-history-description">
                    <h2>
                      <Link to={`/orders/${order.id}`}>
                        {order.firstProductName}
                      </Link>
                    </h2>
                    <p>
                      {order.itemCount} dòng sản phẩm · {order.totalQuantity}{' '}
                      sản phẩm
                    </p>
                    <span className="order-id">Mã đơn: {order.id}</span>
                  </div>
                  <div className="order-history-total">
                    <strong>
                      {formatMoney(order.grandTotal, order.currency)}
                    </strong>
                    <Link className="text-link" to={`/orders/${order.id}`}>
                      Xem chi tiết <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="box"
          title={
            page
              ? 'Trang này không có đơn hàng'
              : 'Câu chuyện mua sắm còn ở phía trước'
          }
          description={
            page
              ? 'Đơn hàng có thể nằm ở trang trước. Bạn có thể quay lại trang đầu.'
              : 'Những đơn hàng bạn đặt sẽ được lưu ở đây, để dễ dàng xem lại bất cứ lúc nào.'
          }
        >
          {page ? (
            <button
              className="btn btn-dark"
              onClick={() => setParams({ page: '0' })}
            >
              Về trang đầu
            </button>
          ) : (
            <Link to="/#products" className="btn btn-dark">
              Khám phá cửa hàng <Icon name="arrow" size={17} />
            </Link>
          )}
        </EmptyState>
      )}
      {orders.data &&
        orders.data.totalPages > 1 &&
        !orders.isError &&
        !!user && (
          <nav className="orders-pagination" aria-label="Phân trang đơn hàng">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 0 || orders.isFetching}
              onClick={() => setParams({ page: String(Math.max(0, page - 1)) })}
            >
              Trang trước
            </button>
            <span>
              Trang {page + 1} · {orders.data.totalPages} trang
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={orders.data.last || orders.isFetching || page >= 10_000}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              Trang sau
            </button>
          </nav>
        )}
    </div>
  );
}
