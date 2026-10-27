import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { adminApi } from './api';
import type { AdminCategory } from './types';
import { codePattern, slugPattern } from './validation';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  AdminNotice,
  Badge,
  ConfirmAction,
  Empty,
  useAdminKey,
  useAdminMutation,
} from './shared';

function CategoryForm({
  item,
  onSaved,
  onCancel,
}: {
  item: AdminCategory | null;
  onSaved: (item: AdminCategory) => void;
  onCancel: () => void;
}) {
  const save = useAdminMutation(
    (body: { code: string; name: string; slug: string }) =>
      item
        ? adminApi.updateCategory(item.id, {
            name: body.name,
            slug: body.slug,
            version: item.version,
          })
        : adminApi.createCategory(body),
    onSaved,
  );
  return (
    <section className="admin-panel admin-form-panel">
      <span className="admin-eyebrow">THÔNG TIN DANH MỤC</span>
      <h2>{item ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h2>
      <AdminNotice error={save.error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (save.busy) return;
          const data = new FormData(e.currentTarget);
          save.mutate({
            code: String(data.get('code') ?? '').trim(),
            name: String(data.get('name')).trim(),
            slug: String(data.get('slug')).trim(),
          });
        }}
      >
        <label className="admin-field">
          Mã danh mục
          <input
            name="code"
            defaultValue={item?.code}
            disabled={!!item}
            required={!item}
            maxLength={50}
            pattern={codePattern}
            placeholder="VD: TRAVEL"
          />
          <small>Mã giữ cố định sau khi tạo.</small>
        </label>
        <label className="admin-field">
          Tên danh mục
          <input
            name="name"
            defaultValue={item?.name}
            required
            maxLength={150}
          />
        </label>
        <label className="admin-field">
          Đường dẫn
          <input
            name="slug"
            defaultValue={item?.slug}
            required
            maxLength={180}
            pattern={slugPattern}
            placeholder="tai-nghe-du-lich"
          />
          <small>Chữ không dấu, số và dấu gạch ngang.</small>
        </label>
        <div className="admin-form-actions">
          <button className="admin-button" disabled={save.busy}>
            {save.isPending ? 'Đang lưu…' : 'Lưu danh mục'}
          </button>
          <button
            type="button"
            className="admin-button is-quiet"
            disabled={save.busy}
            onClick={onCancel}
          >
            Đóng
          </button>
        </div>
      </form>
    </section>
  );
}
export default function CategoriesPage() {
  const { permissions } = useAdminAccess();
  const [editor, setEditor] = useState<AdminCategory | null | undefined>(
    undefined,
  );
  const [notice, setNotice] = useState('');
  const categories = useQuery({
    queryKey: useAdminKey('categories'),
    queryFn: ({ signal }) => adminApi.categories(signal),
    retry: false,
  });
  const status = useAdminMutation(adminApi.categoryStatus);
  return (
    <>
      <AdminHeader
        eyebrow="03 / CATALOG"
        title="Danh mục."
        description="Sắp xếp bộ sưu tập để khách dễ tìm đúng sản phẩm."
      >
        <button
          className="admin-button is-quiet"
          onClick={() => void categories.refetch()}
        >
          Tải lại danh sách
        </button>
        {permissions.has('CATALOG_WRITE') && (
          <button
            className="admin-button"
            onClick={() => {
              setNotice('');
              setEditor(null);
            }}
          >
            <Icon name="plus" size={18} />
            Tạo danh mục
          </button>
        )}
      </AdminHeader>
      <AdminNotice error={status.error} message={status.message || notice} />
      <div className={editor !== undefined ? 'admin-editor-grid' : ''}>
        <section className="admin-panel">
          {categories.isPending ? (
            <AdminLoading />
          ) : categories.isError ? (
            <AdminError retry={() => void categories.refetch()} />
          ) : categories.data.length ? (
            <div className="admin-table-wrap">
              <table>
                <caption className="admin-sr-only">Danh mục quản trị</caption>
                <thead>
                  <tr>
                    <th>Danh mục</th>
                    <th>Mã</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <b>{item.name}</b>
                        <small className="admin-subline">/{item.slug}</small>
                      </td>
                      <td>
                        <code>{item.code}</code>
                      </td>
                      <td>
                        <Badge status={item.status} />
                      </td>
                      <td>
                        {permissions.has('CATALOG_WRITE') ? (
                          <div className="admin-row-actions">
                            <button
                              className="admin-button is-quiet"
                              onClick={() => {
                                setNotice('');
                                setEditor(item);
                              }}
                            >
                              Sửa
                            </button>
                            <ConfirmAction
                              label={
                                item.status === 'ACTIVE'
                                  ? 'Tạm ngưng'
                                  : 'Kích hoạt'
                              }
                              title="Đổi trạng thái danh mục?"
                              description={`Danh mục “${item.name}” sẽ được ${item.status === 'ACTIVE' ? 'tạm ngưng' : 'kích hoạt'}. Kiểm tra sản phẩm liên quan trước khi xác nhận.`}
                              disabled={status.busy}
                              onConfirm={() => status.mutate(item)}
                            />
                          </div>
                        ) : (
                          <span className="admin-muted">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Chưa có danh mục" />
          )}
        </section>
        {editor !== undefined && permissions.has('CATALOG_WRITE') && (
          <CategoryForm
            key={editor ? `${editor.id}:${editor.version}` : 'new'}
            item={editor}
            onCancel={() => setEditor(undefined)}
            onSaved={() => {
              setEditor(undefined);
              setNotice('Đã lưu danh mục.');
            }}
          />
        )}
      </div>
    </>
  );
}
