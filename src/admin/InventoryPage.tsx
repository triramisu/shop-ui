import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { adminApi } from './api';
import { integerInput, locationPattern, skuPattern } from './validation';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  AdminNotice,
  Empty,
  Pager,
  useAdminKey,
  useAdminMutation,
} from './shared';

function NewStock({ close }: { close: () => void }) {
  const [inputError, setInputError] = useState('');
  const save = useAdminMutation(adminApi.createStock, close);
  return (
    <section className="admin-panel admin-form-panel">
      <h2>Khởi tạo SKU tại kho</h2>
      <p className="admin-muted">
        SKU phải tồn tại trong Catalog. Không dùng thao tác này để sửa bản ghi
        kho đã có.
      </p>
      <AdminNotice error={save.error || inputError} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (save.busy) return;
          const data = new FormData(e.currentTarget);
          try {
            const initialQuantity = integerInput(String(data.get('quantity')));
            setInputError('');
            save.mutate({
              sku: String(data.get('sku')).trim(),
              locationCode: String(data.get('location')).trim(),
              initialQuantity,
              reason: String(data.get('reason') ?? '').trim(),
              referenceId: String(data.get('reference') ?? '').trim(),
            });
          } catch (error) {
            setInputError((error as Error).message);
          }
        }}
      >
        <div className="admin-form-grid">
          <label className="admin-field">
            SKU
            <input name="sku" required pattern={skuPattern} maxLength={100} />
          </label>
          <label className="admin-field">
            Mã kho
            <input
              name="location"
              required
              pattern={locationPattern}
              maxLength={64}
              placeholder="VD: DEMO-LAB"
            />
          </label>
          <label className="admin-field">
            Số lượng ban đầu
            <input
              name="quantity"
              required
              pattern="[0-9]+"
              inputMode="numeric"
              defaultValue="0"
            />
          </label>
          <label className="admin-field">
            Mã tham chiếu
            <input name="reference" maxLength={100} />
          </label>
        </div>
        <label className="admin-field">
          Lý do khởi tạo
          <textarea name="reason" maxLength={500} rows={2} />
        </label>
        <div className="admin-form-actions">
          <button className="admin-button" disabled={save.busy}>
            {save.isPending ? 'Đang lưu…' : 'Khởi tạo tồn kho'}
          </button>
          <button
            className="admin-button is-quiet"
            type="button"
            disabled={save.busy}
            onClick={close}
          >
            Hủy
          </button>
        </div>
      </form>
    </section>
  );
}
export default function InventoryPage() {
  const { permissions } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const keyword = (params.get('q') ?? '').slice(0, 100);
  const location = (params.get('location') ?? '').slice(0, 64);
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0') || 0);
  const [creating, setCreating] = useState(false);
  const stocks = useQuery({
    queryKey: useAdminKey('stocks', keyword, location, page),
    queryFn: ({ signal }) =>
      adminApi.stocks(
        { keyword, locationCode: location, page, size: 15 },
        signal,
      ),
    retry: false,
  });
  function changePage(value: number) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }
  return (
    <>
      <AdminHeader
        eyebrow="04 / INVENTORY"
        title="Tồn kho."
        description="Theo dõi từng SKU tại từng địa điểm. Khả dụng = thực tế − đang giữ."
      >
        <button
          className="admin-button is-quiet"
          onClick={() => void stocks.refetch()}
        >
          Tải lại danh sách
        </button>
        {permissions.has('INVENTORY_WRITE') && (
          <button
            className="admin-button"
            onClick={() => setCreating((v) => !v)}
          >
            <Icon name="plus" size={18} />
            Khởi tạo tồn kho
          </button>
        )}
      </AdminHeader>
      {creating && permissions.has('INVENTORY_WRITE') && (
        <NewStock close={() => setCreating(false)} />
      )}
      <section className="admin-panel">
        <form
          className="admin-toolbar"
          key={`${keyword}:${location}`}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const next = new URLSearchParams();
            const q = String(data.get('q')).trim();
            const loc = String(data.get('location')).trim();
            if (q) next.set('q', q);
            if (loc) next.set('location', loc);
            setParams(next);
          }}
        >
          <label className="admin-search">
            <Icon name="search" size={18} />
            <span className="admin-sr-only">Tìm SKU</span>
            <input
              name="q"
              maxLength={100}
              defaultValue={keyword}
              placeholder="Tìm theo SKU…"
            />
          </label>
          <label className="admin-filter">
            Mã kho
            <input
              name="location"
              maxLength={64}
              pattern={locationPattern}
              defaultValue={location}
              placeholder="Tất cả địa điểm"
            />
          </label>
          <button className="admin-button is-quiet">Áp dụng</button>
        </form>
        {stocks.isPending ? (
          <AdminLoading />
        ) : stocks.isError ? (
          <AdminError retry={() => void stocks.refetch()} />
        ) : (
          <>
            {stocks.data.content.length ? (
              <div className="admin-table-wrap">
                <table>
                  <caption className="admin-sr-only">
                    Số dư tồn kho theo SKU và địa điểm
                  </caption>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Địa điểm</th>
                      <th>Thực tế</th>
                      <th>Đang giữ</th>
                      <th>Khả dụng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.data.content.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <b>{item.sku}</b>
                        </td>
                        <td>
                          <code>{item.locationCode}</code>
                        </td>
                        <td>{item.onHand.toLocaleString('vi-VN')}</td>
                        <td>{item.reserved.toLocaleString('vi-VN')}</td>
                        <td>
                          <span
                            className={`admin-stock-number ${item.available === 0 ? 'is-zero' : ''}`}
                          >
                            {item.available.toLocaleString('vi-VN')}
                          </span>
                        </td>
                        <td>
                          <Link
                            className="admin-button is-quiet"
                            to={`/admin/inventory/${item.id}`}
                            aria-label={`Xem kho ${item.sku} tại ${item.locationCode}`}
                          >
                            Chi tiết <Icon name="chevron" size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Chưa tìm thấy bản ghi kho">
                <p>
                  Kiểm tra SKU, mã kho hoặc tạo bản ghi nếu SKU chưa được nhập
                  kho.
                </p>
              </Empty>
            )}
            <Pager {...stocks.data} onPage={changePage} />
          </>
        )}
      </section>
    </>
  );
}
