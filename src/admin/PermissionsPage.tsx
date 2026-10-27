import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from './systemApi';
import {
  AdminHeader,
  AdminLoading,
  AdminError,
  Empty,
  useAdminKey,
} from './shared';
import type { SystemPermission } from './systemTypes';

export const permissionGroup = (code: string) =>
  (
    ({
      SYSTEM: 'Hệ thống & con người',
      CATALOG: 'Sản phẩm & hình ảnh',
      INVENTORY: 'Tồn kho',
      PAYMENT: 'Thanh toán',
    }) as Record<string, string>
  )[code.split('_')[0]] ?? 'Quyền nghiệp vụ';
export function PermissionList({
  items,
  selected,
  onChange,
  disabled = false,
}: {
  items: SystemPermission[];
  selected?: string[];
  onChange?: (codes: string[]) => void;
  disabled?: boolean;
}) {
  const groups = new Map<string, SystemPermission[]>();
  items.forEach((p) => {
    const name = permissionGroup(p.code);
    groups.set(name, [...(groups.get(name) ?? []), p]);
  });
  return (
    <div className="admin-permission-groups">
      {[...groups].map(([name, list]) => (
        <fieldset key={name} className="admin-check-list" disabled={disabled}>
          <legend>{name}</legend>
          {list.map((p) => (
            <label key={p.code} className={!onChange ? 'is-readonly' : ''}>
              {onChange && (
                <input
                  type="checkbox"
                  checked={selected?.includes(p.code) ?? false}
                  disabled={p.code === 'SYSTEM_ROLE_MANAGE'}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...(selected ?? []), p.code]
                        : (selected ?? []).filter((c) => c !== p.code),
                    )
                  }
                />
              )}
              <span>
                <b>{p.description || p.code}</b>
                <small>
                  {p.code}
                  {p.code === 'SYSTEM_ROLE_MANAGE'
                    ? ' · Quyền hệ thống được bảo vệ'
                    : ''}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
export default function PermissionsPage() {
  const [query, setQuery] = useState('');
  const permissions = useQuery({
    queryKey: useAdminKey('permissions'),
    queryFn: ({ signal }) => systemApi.permissions(signal),
    retry: false,
  });
  const visible = (permissions.data ?? []).filter((p) =>
    `${p.code} ${p.description ?? ''}`
      .toLocaleLowerCase('vi')
      .includes(query.toLocaleLowerCase('vi')),
  );
  return (
    <>
      <AdminHeader
        eyebrow="HỆ THỐNG / DANH MỤC QUYỀN"
        title="Quyền truy cập."
        description="Danh mục capability do backend định nghĩa. Dùng các quyền này để cấu hình vai trò tùy chỉnh."
      />
      <section className="admin-panel admin-form-panel">
        <label className="admin-field">
          Tìm quyền
          <input
            type="search"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tên quyền hoặc mã capability…"
          />
        </label>
        {permissions.isPending ? (
          <AdminLoading />
        ) : permissions.isError ? (
          <AdminError retry={() => void permissions.refetch()} />
        ) : visible.length ? (
          <PermissionList items={visible} />
        ) : (
          <Empty title="Không có quyền phù hợp" />
        )}
      </section>
      <p className="admin-footnote">
        Không tạo hoặc xóa capability ở giao diện. Thay đổi danh mục quyền cần
        triển khai backend tương ứng.
      </p>
    </>
  );
}
