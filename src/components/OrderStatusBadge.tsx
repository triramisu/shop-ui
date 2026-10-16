import type { OrderStatus } from '@/lib/types';

const labels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPED: 'Đã gửi hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge order-status order-status-${status.toLowerCase()}`}>
      {labels[status] ?? 'Đang cập nhật'}
    </span>
  );
}
