import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/format';
import { adminApi } from './api';
import type { StockItem } from './types';
import { integerInput } from './validation';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  AdminNotice,
  ConfirmAction,
  Empty,
  Pager,
  useAdminKey,
  useAdminMutation,
} from './shared';

function AdjustmentForm({ stock }: { stock: StockItem }) {
  const [snapshot, setSnapshot] = useState(stock);
  const [inputError, setInputError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const adjust = useAdminMutation(
    (body: { quantityDelta: number; reason: string; referenceId: string }) =>
      adminApi.adjustStock(stock.id, { ...body, version: snapshot.version }),
    (result) => {
      setSnapshot(result);
      form.current?.reset();
    },
  );
  return (
    <section className="admin-panel admin-form-panel">
      <span className="admin-eyebrow">ĐIỀU CHỈNH CÓ LÝ DO</span>
      <h2>Nhập / xuất điều chỉnh</h2>
      <p className="admin-muted">
        Nhập số dương để tăng, số âm để giảm tồn thực tế. Không thể giảm thấp
        hơn số đang giữ cho đơn hàng.
      </p>
      <AdminNotice
        error={adjust.error || inputError}
        message={adjust.message}
      />
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          if (adjust.busy) return;
          const data = new FormData(e.currentTarget);
          try {
            const quantityDelta = integerInput(String(data.get('delta')), true);
            const next = snapshot.onHand + quantityDelta;
            if (!Number.isSafeInteger(next) || next < snapshot.reserved)
              throw new Error(
                'Số dư sau điều chỉnh phải hợp lệ và không thấp hơn số lượng đang giữ.',
              );
            setInputError('');
            adjust.mutate({
              quantityDelta,
              reason: String(data.get('reason')).trim(),
              referenceId: String(data.get('reference') ?? '').trim(),
            });
          } catch (error) {
            setInputError((error as Error).message);
          }
        }}
      >
        <label className="admin-field">
          Mức tăng / giảm
          <input
            name="delta"
            required
            pattern="-?[0-9]+"
            inputMode="text"
            placeholder="VD: 10 hoặc -3"
          />
          <small>
            Đang chỉnh bản v{snapshot.version}: thực tế {snapshot.onHand}, đang
            giữ {snapshot.reserved}.
          </small>
        </label>
        <label className="admin-field">
          Lý do điều chỉnh
          <textarea
            name="reason"
            required
            maxLength={500}
            rows={3}
            placeholder="VD: Nhập bổ sung hoặc kiểm kê chênh lệch"
          />
        </label>
        <label className="admin-field">
          Mã tham chiếu
          <input
            name="reference"
            maxLength={100}
            placeholder="Mã phiếu / chứng từ nếu có"
          />
        </label>
        <button className="admin-button" disabled={adjust.busy}>
          {adjust.isPending ? 'Đang lưu…' : 'Ghi nhận điều chỉnh'}
        </button>
      </form>
    </section>
  );
}
const movementNames: Record<string, string> = {
  INITIAL: 'Khởi tạo',
  ADJUSTMENT: 'Điều chỉnh',
  RESERVATION: 'Giữ hàng',
  CONFIRMATION: 'Xác nhận xuất',
  RELEASE: 'Giải phóng',
  EXPIRATION: 'Hết hạn giữ',
};
export default function StockPage() {
  const { stockId = '' } = useParams();
  const { permissions } = useAdminAccess();
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const stock = useQuery({
    queryKey: useAdminKey('stock', stockId),
    queryFn: ({ signal }) => adminApi.stock(stockId, signal),
    retry: false,
  });
  const movements = useQuery({
    queryKey: useAdminKey('movements', stockId, page),
    queryFn: ({ signal }) => adminApi.movements(stockId, page, signal),
    retry: false,
  });
  if (stock.isPending) return <AdminLoading />;
  if (stock.isError || !stock.data)
    return <AdminError retry={() => void stock.refetch()} />;
  const item = stock.data;
  return (
    <>
      <Link className="admin-back-link" to="/admin/inventory">
        ← Danh sách tồn kho
      </Link>
      <AdminHeader
        eyebrow="INVENTORY / CHI TIẾT"
        title={item.sku}
        description={`Địa điểm ${item.locationCode} · Số dư theo bản ghi của hệ thống.`}
      >
        <ConfirmAction
          label="Tải bản mới"
          title="Tải lại số dư kho?"
          description="Mức điều chỉnh/lý do chưa lưu sẽ bị bỏ. Hệ thống lấy version mới nhất để bạn kiểm tra lại."
          onConfirm={() => {
            void Promise.all([stock.refetch(), movements.refetch()]).then(
              ([result]) => {
                if (result.data && !result.isError) setRevision((v) => v + 1);
              },
            );
          }}
        />
      </AdminHeader>
      <div className="admin-metrics">
        {[
          ['Tồn thực tế', item.onHand],
          ['Đang giữ cho đơn', item.reserved],
          ['Có thể bán', item.available],
        ].map(([label, value]) => (
          <div className="admin-metric" key={label}>
            <div>{label}</div>
            <strong>{Number(value).toLocaleString('vi-VN')}</strong>
            <small>{item.locationCode}</small>
          </div>
        ))}
      </div>
      <div
        className={
          permissions.has('INVENTORY_WRITE') ? 'admin-stock-detail-grid' : ''
        }
      >
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">LỊCH SỬ KHO</span>
              <h2>Biến động đã ghi nhận</h2>
            </div>
          </div>
          {movements.isPending ? (
            <AdminLoading />
          ) : movements.isError ? (
            <AdminError retry={() => void movements.refetch()} />
          ) : (
            <>
              {movements.data.content.length ? (
                <div className="admin-table-wrap">
                  <table>
                    <caption className="admin-sr-only">
                      Lịch sử biến động tồn kho, chỉ đọc
                    </caption>
                    <thead>
                      <tr>
                        <th>Thời gian / loại</th>
                        <th>Thực tế ±</th>
                        <th>Đang giữ ±</th>
                        <th>Lý do / tham chiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.data.content.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <b>
                              {movementNames[row.movementType] ??
                                row.movementType}
                            </b>
                            <small className="admin-subline">
                              {formatDateTime(row.occurredAt)}
                            </small>
                          </td>
                          <td>
                            {row.onHandDelta > 0 ? '+' : ''}
                            {row.onHandDelta}
                            <small className="admin-subline">
                              Sau: {row.onHandAfter}
                            </small>
                          </td>
                          <td>
                            {row.reservedDelta > 0 ? '+' : ''}
                            {row.reservedDelta}
                            <small className="admin-subline">
                              Sau: {row.reservedAfter}
                            </small>
                          </td>
                          <td>
                            {row.reason || '—'}
                            <small className="admin-subline">
                              {row.referenceId || 'Không có tham chiếu'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Chưa có biến động" />
              )}
              <Pager {...movements.data} onPage={setPage} />
            </>
          )}
        </section>
        {permissions.has('INVENTORY_WRITE') && (
          <AdjustmentForm key={`${stockId}:${revision}`} stock={item} />
        )}
      </div>
    </>
  );
}
