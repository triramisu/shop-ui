import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from './systemApi';
import { useAdminAccess } from './useAdminAccess';
import { canManageRoles, roleNames } from './systemRules';
import type { RoleInput, SystemPermission, SystemRole } from './systemTypes';
import { PermissionList } from './PermissionsPage';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  AdminNotice,
  ConfirmAction,
  Empty,
  useAdminKey,
  useAdminMutation,
} from './shared';
import { Icon } from '@/components/Icon';

export default function RolesPage() {
  const { user, permissions } = useAdminAccess();
  const roles = useQuery({
    queryKey: useAdminKey('roles'),
    queryFn: ({ signal }) => systemApi.roles(signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const codes = useQuery({
    queryKey: useAdminKey('permissions'),
    queryFn: ({ signal }) => systemApi.permissions(signal),
    enabled: permissions.has('SYSTEM_PERMISSION_READ'),
    retry: false,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const editing = roles.data?.find((r) => r.code === selected);
  const canManage = canManageRoles(user!, permissions);
  return (
    <>
      <AdminHeader
        eyebrow="HỆ THỐNG / PHÂN QUYỀN"
        title="Vai trò & trách nhiệm."
        description="Xem vai trò hiện có và cấu hình quyền cho từng nhóm công việc."
      >
        {canManage && (
          <button className="admin-button" onClick={() => setSelected('__new')}>
            <Icon name="plus" size={17} />
            Tạo vai trò
          </button>
        )}
      </AdminHeader>
      {roles.isPending ? (
        <AdminLoading />
      ) : roles.isError ? (
        <AdminError retry={() => void roles.refetch()} />
      ) : (
        <div className="admin-role-layout">
          <section
            className="admin-panel admin-role-directory"
            aria-label="Danh sách vai trò"
          >
            {roles.data.map((role) => (
              <button
                key={role.code}
                aria-pressed={selected === role.code}
                onClick={() => setSelected(role.code)}
              >
                <span>
                  <b>{roleNames[role.code] ?? role.code}</b>
                  <small>{role.code}</small>
                </span>
                <span className="admin-chip">
                  {role.permissions.length} quyền
                </span>
                <small>
                  {role.systemRole
                    ? 'Vai trò hệ thống'
                    : role.description || 'Vai trò tùy chỉnh'}
                </small>
              </button>
            ))}
          </section>
          <section className="admin-panel admin-form-panel">
            {selected === null ? (
              <Empty title="Chọn một vai trò">
                <p>Xem phạm vi quyền hoặc tạo nhóm công việc mới.</p>
              </Empty>
            ) : selected === '__new' && !canManage ? (
              <p>Bạn chưa có quyền tạo vai trò.</p>
            ) : editing || selected === '__new' ? (
              <RoleEditor
                key={`${selected}-${revision}`}
                role={editing}
                permissions={codes.data}
                canEdit={canManage && !editing?.systemRole}
                onDeleted={() => setSelected(null)}
                onSaved={(r) => {
                  if (selected === '__new') setSelected(r.code);
                }}
              />
            ) : (
              <Empty title="Vai trò không còn tồn tại" />
            )}
            {selected && (
              <ConfirmAction
                label="Tải lại dữ liệu vai trò"
                title="Bỏ chỉnh sửa chưa lưu?"
                description="Đọc lại vai trò và danh mục quyền mới nhất trước khi tiếp tục."
                onConfirm={() =>
                  void Promise.all([
                    roles.refetch(),
                    ...(permissions.has('SYSTEM_PERMISSION_READ')
                      ? [codes.refetch()]
                      : []),
                  ]).then(([r]) => {
                    if (r.isSuccess) setRevision((v) => v + 1);
                  })
                }
              />
            )}
            {permissions.has('SYSTEM_PERMISSION_READ') && codes.isError && (
              <AdminError retry={() => void codes.refetch()} />
            )}
          </section>
        </div>
      )}
    </>
  );
}
function RoleEditor({
  role,
  permissions,
  canEdit,
  onDeleted,
  onSaved,
}: {
  role?: SystemRole;
  permissions?: SystemPermission[];
  canEdit: boolean;
  onDeleted: () => void;
  onSaved: (r: SystemRole) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState(role?.code ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState(role?.permissions ?? []);
  const save = useAdminMutation(
    (body: RoleInput) =>
      role
        ? systemApi.updateRole(role.code, body)
        : systemApi.createRole({ code, ...body }),
    onSaved,
  );
  const remove = useAdminMutation(
    () => systemApi.deleteRole(role!.code),
    onDeleted,
  );
  const editable = canEdit && !!permissions;
  const known =
    !!permissions &&
    selected.every(
      (p) =>
        p !== 'SYSTEM_ROLE_MANAGE' && permissions.some((x) => x.code === p),
    ) &&
    selected.length <= 100;
  return (
    <>
      <span className="admin-eyebrow">
        {role?.systemRole
          ? 'VAI TRÒ HỆ THỐNG'
          : role
            ? 'VAI TRÒ TÙY CHỈNH'
            : 'NHÓM CÔNG VIỆC MỚI'}
      </span>
      <h2>{roleNames[role?.code ?? ''] ?? role?.code ?? 'Tạo vai trò.'}</h2>
      {role?.systemRole && (
        <p className="admin-notice">
          Vai trò hệ thống chỉ đọc. Không thể sửa hoặc xóa ADMIN, STAFF, USER
          qua API quản trị.
        </p>
      )}
      <form
        ref={form}
        className="admin-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="admin-field">
          Mã vai trò
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            pattern="[A-Z][A-Z0-9_]{2,49}"
            minLength={3}
            maxLength={50}
            disabled={!!role || !editable || save.busy}
            placeholder="VD: CATALOG_EDITOR"
          />
        </label>
        <label className="admin-field">
          Mô tả
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            disabled={!editable || save.busy}
            rows={3}
          />
        </label>
        <h3>Phạm vi quyền</h3>
        {permissions ? (
          <PermissionList
            items={permissions.filter(
              (p) => canEdit || role?.permissions.includes(p.code),
            )}
            selected={selected}
            onChange={editable ? setSelected : undefined}
            disabled={save.busy}
          />
        ) : (
          <>
            <div className="admin-role-tags">
              {role?.permissions.map((p) => (
                <span className="admin-chip" key={p}>
                  {p}
                </span>
              ))}
            </div>
            <p className="admin-footnote">
              Cần quyền xem danh mục capability để chỉnh sửa vai trò.
            </p>
          </>
        )}
        {editable && (
          <>
            <p className="admin-footnote">
              Cập nhật quyền sẽ thu hồi phiên của các tài khoản đang dùng vai
              trò này. Quyền quản lý vai trò hệ thống không được cấp lại.
            </p>
            <div className="admin-form-actions">
              <ConfirmAction
                label={role ? 'Lưu vai trò' : 'Tạo vai trò'}
                title={
                  role ? `Cập nhật ${role.code}?` : 'Tạo vai trò tùy chỉnh?'
                }
                description={`${code} sẽ có ${selected.length} quyền đã chọn.${role ? ' Phiên của người dùng vai trò này sẽ bị thu hồi.' : ''}`}
                disabled={save.busy || !known}
                validate={() => form.current?.reportValidity() ?? false}
                onConfirm={() =>
                  save.mutate({
                    description: description.trim(),
                    permissionCodes: selected,
                  })
                }
              />
              {role && (
                <ConfirmAction
                  label="Xóa vai trò"
                  title={`Xóa ${role.code}?`}
                  description="Chỉ vai trò tùy chỉnh chưa được gán cho tài khoản nào mới xóa được. Xác nhận sau khi kiểm tra danh sách người dùng."
                  disabled={remove.busy}
                  onConfirm={() => remove.mutate(undefined)}
                />
              )}
            </div>
          </>
        )}
      </form>
      <AdminNotice error={save.error || remove.error} message={save.message} />
    </>
  );
}
