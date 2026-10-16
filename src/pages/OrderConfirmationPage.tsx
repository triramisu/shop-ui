import { Link, Navigate, useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/Layout';

/** Bridge URL cũ; không hiển thị snapshot trên history khi đã đổi tài khoản. */
export function OrderConfirmationPage() {
  const location = useLocation();
  const state = location.state as {
    order?: { id?: string };
    orderId?: string;
  } | null;
  const id = state?.orderId ?? state?.order?.id;
  if (id) return <Navigate to={`/orders/${encodeURIComponent(id)}`} replace />;
  return (
    <div className="container inner-page">
      <EmptyState
        icon="box"
        title="Xem lại đơn hàng đã đặt"
        description="Lịch sử đơn được lưu trên hệ thống, không phụ thuộc thông tin xác nhận trong trình duyệt."
      >
        <Link to="/orders" className="btn btn-dark">
          Mở đơn hàng của tôi
        </Link>
      </EmptyState>
    </div>
  );
}
