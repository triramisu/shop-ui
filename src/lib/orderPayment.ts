import type { OrderPaymentResponse, OrderStatus } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDOFF_PATH = '/api/payments/checkout/vnpay/start';
export const PAYMENT_POLL_INTERVAL_MS = 5_000;
export const PAYMENT_POLL_WINDOW_MS = 60_000;
export const PAYMENT_POLL_MAX_REQUESTS = 12;

/** Explicit, public build-time origins, never a wildcard or a URL from location. */
export function paymentAllowedOrigins(value: string | undefined): string[] {
  return [...new Set((value ?? '').split(',').flatMap((entry) => {
    try {
      const url = new URL(entry.trim());
      return !/[?#]/.test(entry) && !url.hostname.includes('*') && url.protocol === 'https:' && !url.port && !url.username &&
        !url.password && url.pathname === '/' && !url.search && !url.hash
        ? [url.origin] : [];
    } catch {
      return [];
    }
  }))];
}

/** Fail closed even when a compromised/misconfigured API supplies an action URL. */
export function safeVnpayHandoff(
  payment: OrderPaymentResponse | undefined,
  allowedOrigins: readonly string[],
): string | null {
  if (payment?.providerCode !== 'VNPAY' || payment.status !== 'REQUIRES_ACTION' ||
      typeof payment.actionUrl !== 'string' || !UUID.test(payment.paymentAttemptId) ||
      payment.actionUrl.length > 2048 || payment.actionUrl !== payment.actionUrl.trim()) return null;
  try {
    const url = new URL(payment.actionUrl);
    const params = [...url.searchParams.keys()];
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash ||
        payment.actionUrl.includes('#') || !allowedOrigins.includes(url.origin) || url.pathname !== HANDOFF_PATH ||
        params.length !== 2 || !params.includes('attempt') || !params.includes('token') ||
        url.searchParams.get('attempt')?.toLowerCase() !== payment.paymentAttemptId.toLowerCase() ||
        !/^[0-9a-f]{128}$/i.test(url.searchParams.get('token') ?? '')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export interface PaymentReadError { status?: number; code?: number }
export function isMissingPayment(error: PaymentReadError | null | undefined): boolean {
  return error?.status === 404 && error.code === 1407;
}

export interface PaymentView {
  kind: 'paid' | 'cancelled' | 'waiting' | 'action' | 'confirming' | 'failed' |
    'expired' | 'unavailable' | 'error';
  tone: 'neutral' | 'info' | 'success' | 'danger';
  title: string;
  description: string;
}

export function orderPaymentView(
  orderStatus: OrderStatus,
  payment?: OrderPaymentResponse,
  error?: PaymentReadError | null,
  safeUrl?: string | null,
): PaymentView {
  if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(orderStatus)) {
    return { kind: 'paid', tone: 'success', title: 'Thanh toán đã được xác nhận',
      description: 'Cửa hàng đã ghi nhận thanh toán cho đơn hàng này.' };
  }
  if (orderStatus === 'CANCELLED') {
    return { kind: 'cancelled', tone: 'neutral', title: 'Đơn hàng đã hủy',
      description: 'Không tiếp tục thanh toán đơn này. Nếu tài khoản đã bị trừ tiền, hãy giữ mã đơn để đối soát với cửa hàng.' };
  }
  if (orderStatus !== 'PENDING') return { kind: 'unavailable', tone: 'neutral',
    title: 'Chưa thể xác định trạng thái đơn', description: 'Hãy tải lại thông tin đơn trước khi thanh toán.' };
  if (error && !isMissingPayment(error)) {
    return { kind: 'error', tone: 'danger', title: 'Chưa kiểm tra được thanh toán',
      description: error.status === 401 || error.status === 403
        ? 'Phiên truy cập không còn hợp lệ. Hãy đăng nhập lại trước khi kiểm tra.'
        : 'Không thể đọc trạng thái mới nhất. Kiểm tra kết nối rồi thử lại; không cần đặt thêm đơn.' };
  }
  if (!payment || isMissingPayment(error)) return { kind: 'waiting', tone: 'info',
    title: 'Đang chuẩn bị thanh toán', description: 'Đơn đã được ghi nhận. Cửa hàng đang chuẩn bị thông tin thanh toán, bạn chưa cần đặt lại đơn.' };
  // Unknown providers and future enum values must never enable a handoff.
  if (payment.providerCode !== 'VNPAY') return { kind: 'unavailable', tone: 'neutral',
    title: 'Chưa có cổng thanh toán trực tuyến', description: 'Đơn này chưa có link VNPay khả dụng. Hãy kiểm tra lại sau hoặc liên hệ cửa hàng kèm mã đơn.' };
  switch (payment.status) {
    case 'REQUIRES_ACTION':
      return safeUrl ? { kind: 'action', tone: 'info', title: 'Sẵn sàng thanh toán',
        description: 'Mở VNPay ở tab mới để thanh toán. Giữ trang này để kiểm tra kết quả từ cửa hàng.' }
        : { kind: 'unavailable', tone: 'neutral', title: 'Link thanh toán chưa khả dụng',
          description: 'Không thể xác minh địa chỉ thanh toán an toàn. Hãy kiểm tra lại hoặc liên hệ cửa hàng kèm mã đơn; không dùng link từ nguồn khác.' };
    case 'SUCCEEDED':
      return { kind: 'confirming', tone: 'info', title: 'Đang xác nhận đơn hàng',
        description: 'Cổng thanh toán đã phản hồi. Đơn chỉ hoàn tất thanh toán khi cửa hàng xác nhận; đừng thanh toán thêm lần nữa.' };
    case 'FAILED':
      return { kind: 'failed', tone: 'danger', title: 'Giao dịch chưa thành công',
        description: 'Chưa có xác nhận thanh toán cho đơn này. Nếu đã bị trừ tiền, giữ mã đơn và liên hệ cửa hàng; không thanh toán lặp lại.' };
    case 'CANCELLED':
      return { kind: 'cancelled', tone: 'neutral', title: 'Lượt thanh toán đã hủy',
        description: 'Đơn hàng chưa được xác nhận thanh toán. Hãy giữ mã đơn nếu cần cửa hàng hỗ trợ, không tạo thêm đơn để thử lại.' };
    case 'EXPIRED':
      return { kind: 'expired', tone: 'neutral', title: 'Lượt thanh toán đã hết hạn',
        description: 'Không tiếp tục dùng link cũ. Liên hệ cửa hàng kèm mã đơn để được hướng dẫn; trang này không tự tạo lượt thanh toán mới.' };
    case 'CREATED':
    case 'PENDING':
    case 'UNKNOWN':
      return { kind: 'waiting', tone: 'info', title: 'Đang chờ kết quả thanh toán',
        description: 'Chưa có kết quả cuối cùng từ cửa hàng. Nếu vừa thanh toán, vui lòng chờ xác nhận và không thanh toán lại.' };
    default:
      return { kind: 'unavailable', tone: 'neutral', title: 'Chưa đọc được trạng thái thanh toán',
        description: 'Trạng thái này chưa được hỗ trợ. Hãy kiểm tra lại hoặc liên hệ cửa hàng kèm mã đơn.' };
  }
}

export interface PaymentPollBudget { startedAt: number; requests: number }
export function newPaymentPollBudget(now: number): PaymentPollBudget {
  return { startedAt: now, requests: 0 };
}
export function hasPaymentPollBudget(budget: PaymentPollBudget, now: number): boolean {
  return budget.requests < PAYMENT_POLL_MAX_REQUESTS && now >= budget.startedAt &&
    now - budget.startedAt < PAYMENT_POLL_WINDOW_MS;
}
export function takePaymentPollSlot(budget: PaymentPollBudget, now: number): boolean {
  if (!hasPaymentPollBudget(budget, now)) return false;
  budget.requests += 1;
  return true;
}
export function shouldPollPayment(
  orderStatus: OrderStatus,
  payment: OrderPaymentResponse | undefined,
  error: PaymentReadError | null,
  budget: PaymentPollBudget,
  now: number,
): boolean {
  if (orderStatus !== 'PENDING' || !hasPaymentPollBudget(budget, now) ||
      (error && !isMissingPayment(error))) return false;
  if (!payment || isMissingPayment(error)) return true;
  return payment.providerCode === 'VNPAY' &&
    ['CREATED', 'PENDING', 'REQUIRES_ACTION', 'UNKNOWN', 'SUCCEEDED'].includes(payment.status);
}
