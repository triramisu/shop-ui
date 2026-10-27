import { useRef, useState } from 'react';
import { systemApi } from './systemApi';
import type { Refund, RefundInput } from './systemTypes';
import {
  AdminHeader,
  AdminNotice,
  ConfirmAction,
  useAdminMutation,
} from './shared';
import { formatRefundAmount } from './validation';
import { refundAmountPattern } from './systemRules';

const uuidPattern =
  '[A-Fa-f0-9]{8}\\-[A-Fa-f0-9]{4}\\-[A-Fa-f0-9]{4}\\-[A-Fa-f0-9]{4}\\-[A-Fa-f0-9]{12}';
type Request = { payment: string; key: string; body: RefundInput };
export default function RefundsPage() {
  const form = useRef<HTMLFormElement>(null);
  const [payment, setPayment] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [frozen, setFrozen] = useState<Request>();
  const [lookupPayment, setLookupPayment] = useState('');
  const [refundId, setRefundId] = useState('');
  const [found, setFound] = useState<Refund>();
  const create = useAdminMutation((r: Request) =>
    systemApi.createRefund(r.payment, r.key, r.body),
  );
  const lookup = useAdminMutation(
    (r: { payment: string; id: string }) => systemApi.refund(r.payment, r.id),
    setFound,
  );
  return (
    <>
      <AdminHeader
        eyebrow="THANH TOÁN / CÔNG CỤ VẬN HÀNH"
        title="Tra cứu & hoàn tiền."
        description="Làm việc bằng mã giao dịch và mã khoản hoàn. Mọi kết quả do backend và nhà cung cấp xác nhận."
      />
      <div className="admin-notice">
        Công cụ không bật hoàn tiền trên hệ thống. Backend có thể đang tắt chức
        năng hoặc chưa hỗ trợ provider; khi đó yêu cầu sẽ bị từ chối.
      </div>
      <div className="admin-detail-grid">
        <section className="admin-panel admin-form-panel">
          <h2>Tra cứu khoản hoàn</h2>
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFound(undefined);
              lookup.mutate({ payment: lookupPayment, id: refundId });
            }}
          >
            <label className="admin-field">
              Mã payment attempt
              <input
                required
                pattern={uuidPattern}
                value={lookupPayment}
                onChange={(e) => setLookupPayment(e.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="admin-field">
              Mã khoản hoàn
              <input
                required
                pattern={uuidPattern}
                value={refundId}
                onChange={(e) => setRefundId(e.target.value)}
                spellCheck={false}
              />
            </label>
            <button className="admin-button" disabled={lookup.busy}>
              Tra cứu trạng thái
            </button>
          </form>
          <AdminNotice error={lookup.error} />
          {found && <RefundResult result={found} />}
          <p className="admin-footnote">
            Backend chưa có API danh sách hoàn tiền; dùng mã đã lưu từ yêu cầu
            trước.
          </p>
        </section>
        <section className="admin-panel admin-form-panel">
          <h2>Tạo yêu cầu hoàn</h2>
          <form
            ref={form}
            className="admin-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <fieldset
              disabled={!!frozen || create.busy}
              className="admin-borderless"
            >
              <label className="admin-field">
                Mã payment attempt
                <input
                  required
                  pattern={uuidPattern}
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <label className="admin-field">
                Số tiền muốn hoàn
                <input
                  inputMode="decimal"
                  pattern={refundAmountPattern}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Để trống: toàn bộ phần có thể hoàn"
                />
              </label>
              <label className="admin-field">
                Tiền tệ
                <input
                  required
                  pattern="[A-Za-z]{3}"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </label>
            </fieldset>
            <label className="admin-field">
              Mã yêu cầu (idempotency)
              <input readOnly value={key} spellCheck={false} />
            </label>
            <p className="admin-footnote">
              Lưu mã này trước khi gửi. Nếu timeout hoặc chưa rõ kết quả, dùng
              lại đúng mã và nội dung; không tạo mã khác để thử lại.
            </p>
            <ConfirmAction
              label={frozen ? 'Gửi lại đúng yêu cầu này' : 'Yêu cầu hoàn tiền'}
              title="Xác nhận yêu cầu hoàn tiền?"
              description={`${frozen?.body.amount ?? (amount || 'Toàn bộ phần có thể hoàn')} ${frozen?.body.currency ?? currency}. Backend kiểm tra giao dịch và ngân sách hoàn; phản hồi có thể chưa phải kết quả cuối cùng.`}
              disabled={
                create.busy ||
                (!!create.data &&
                  ['SUCCEEDED', 'FAILED'].includes(create.data.status))
              }
              validate={() =>
                !!frozen ||
                ((form.current?.reportValidity() ?? false) &&
                  (!amount || /[1-9]/.test(amount)))
              }
              onConfirm={() => {
                const r = frozen ?? {
                  payment,
                  key,
                  body: { amount: amount || null, currency },
                };
                setFrozen(r);
                create.mutate(r);
              }}
            />
            <AdminNotice
              error={create.error}
              message={
                create.data
                  ? 'Đã nhận trạng thái từ hệ thống. Kiểm tra kết quả bên dưới.'
                  : undefined
              }
            />
            {create.data && <RefundResult result={create.data} />}
            {create.data &&
              ['CREATED', 'PENDING', 'UNKNOWN'].includes(
                create.data.status,
              ) && (
                <p role="status">
                  Chưa xác nhận hoàn thành. Giữ nguyên yêu cầu và đối soát;
                  không gửi mã mới.
                </p>
              )}
            {create.data &&
              ['SUCCEEDED', 'FAILED'].includes(create.data.status) && (
                <button
                  type="button"
                  className="admin-button is-quiet"
                  onClick={() => {
                    setFrozen(undefined);
                    setKey(crypto.randomUUID());
                    setAmount('');
                    create.reset();
                  }}
                >
                  Chuẩn bị yêu cầu khác
                </button>
              )}
          </form>
        </section>
      </div>
    </>
  );
}
function RefundResult({ result: r }: { result: Refund }) {
  const name =
    (
      {
        SUCCEEDED: 'Đã hoàn tiền',
        FAILED: 'Hoàn tiền thất bại',
        CREATED: 'Đã tạo, chờ xử lý',
        PENDING: 'Đang chờ nhà cung cấp',
        UNKNOWN: 'Chưa xác định, cần đối soát',
      } as Record<string, string>
    )[r.status] ?? r.status;
  return (
    <dl className="admin-definition-list" aria-label="Kết quả hoàn tiền">
      {[
        ['Trạng thái', name],
        ['Mã khoản hoàn', r.id],
        ['Payment attempt', r.paymentAttemptId],
        ['Đơn hàng', r.orderId],
        ['Số tiền', formatRefundAmount(r.amount, r.currency)],
        ['Mã lỗi', r.failureCode || '—'],
      ].map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
