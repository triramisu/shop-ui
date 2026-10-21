import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders';
import { ApiError } from '@/lib/apiClient';
import type { OrderPaymentResponse, OrderSnapshotResponse } from '@/lib/types';
import {
  hasPaymentPollBudget,
  newPaymentPollBudget,
  orderPaymentView,
  paymentAllowedOrigins,
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_WINDOW_MS,
  safeVnpayHandoff,
  shouldPollPayment,
  takePaymentPollSlot,
} from '@/lib/orderPayment';
import { Icon } from './Icon';
import '@/styles/order-payment.css';

const allowedOrigins = paymentAllowedOrigins(import.meta.env.VITE_PAYMENT_ALLOWED_ORIGINS);

export function OrderPaymentPanel({ order, userId }: {
  order: OrderSnapshotResponse;
  userId: string;
}) {
  const client = useQueryClient();
  const budget = useRef(newPaymentPollBudget(Date.now()));
  const [cycle, setCycle] = useState(0);
  const [monitoring, setMonitoring] = useState(true);
  const [opened, setOpened] = useState(false);
  const payment = useQuery<OrderPaymentResponse, ApiError>({
    queryKey: ['orders', userId, 'payment', order.id],
    queryFn: ({ signal }) => {
      if (!takePaymentPollSlot(budget.current, Date.now())) {
        throw new DOMException('Đã dừng kiểm tra tự động', 'AbortError');
      }
      return ordersApi.payment(order.id, signal);
    },
    enabled: order.status === 'PENDING' && monitoring,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => monitoring && shouldPollPayment(
      order.status, query.state.data, query.state.error, budget.current, Date.now(),
    ) ? PAYMENT_POLL_INTERVAL_MS : false,
  });

  useEffect(() => {
    if (!monitoring || order.status !== 'PENDING') return;
    const timeout = window.setTimeout(() => setMonitoring(false), PAYMENT_POLL_WINDOW_MS);
    return () => window.clearTimeout(timeout);
  }, [cycle, monitoring, order.status]);

  useEffect(() => {
    if (!hasPaymentPollBudget(budget.current, Date.now())) setMonitoring(false);
  }, [payment.dataUpdatedAt, payment.errorUpdatedAt]);

  useEffect(() => {
    // Read the owning Order again; provider success alone is not confirmation.
    if (payment.dataUpdatedAt && order.status === 'PENDING') {
      void client.refetchQueries({ queryKey: ['orders', userId, 'detail', order.id], exact: true });
    }
  }, [payment.dataUpdatedAt, client, order.id, order.status, userId]);

  const safeUrl = safeVnpayHandoff(payment.data, allowedOrigins);
  const view = orderPaymentView(order.status, payment.data, payment.error, safeUrl);
  const pendingOrder = order.status === 'PENDING';
  const autoChecking = monitoring && shouldPollPayment(
    order.status, payment.data, payment.error, budget.current, Date.now(),
  );
  const refresh = () => {
    budget.current = newPaymentPollBudget(Date.now());
    setMonitoring(true);
    setCycle((value) => value + 1);
    void payment.refetch({ cancelRefetch: false });
    void client.refetchQueries({ queryKey: ['orders', userId, 'detail', order.id], exact: true });
  };

  return (
    <section className={`order-payment order-payment--${view.tone}`} aria-label="Thanh toán đơn hàng">
      <div className="order-payment__heading">
        <span className="order-payment__symbol">
          <Icon name={view.kind === 'paid' ? 'check' : view.tone === 'danger' ? 'info' : 'shield'} size={20} />
        </span>
        <div aria-live="polite" aria-atomic="true">
          <p className="order-payment__label">THANH TOÁN</p>
          <h3>{view.title}</h3>
        </div>
      </div>
      <p className="order-payment__description">{view.description}</p>
      {view.kind === 'action' && safeUrl && (
        <a className="btn btn-dark order-payment__pay" href={safeUrl}
          target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>
          Thanh toán với VNPay <Icon name="arrow-up" size={17} />
          <span className="sr-only"> (mở tab mới)</span>
        </a>
      )}
      {opened && pendingOrder && (
        <p className="order-payment__opened" role="status">
          Đã yêu cầu mở tab thanh toán. Khi quay lại, chọn “Kiểm tra thanh toán” để đọc kết quả mới nhất.
        </p>
      )}
      {pendingOrder && (
        <div className="order-payment__check">
          <button type="button" className="btn btn-secondary" disabled={payment.isFetching}
            onClick={refresh}>
            <Icon name="refresh" size={16} />
            {payment.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}
          </button>
          <p role="status" aria-live="polite">
            {autoChecking
              ? 'Tự kiểm tra tối đa 1 phút khi bạn ở trang này.'
              : 'Đã dừng tự kiểm tra. Bạn có thể kiểm tra lại bất cứ lúc nào.'}
          </p>
        </div>
      )}
      <p className="order-payment__note">
        Kết quả được xác nhận bởi cửa hàng, không phải nội dung trên URL quay về.
      </p>
    </section>
  );
}
