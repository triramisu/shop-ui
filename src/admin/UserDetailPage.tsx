import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from './systemApi';
import { useAdminAccess } from './useAdminAccess';
import {
  assignableRoles,
  canChangeUser,
  roleNames,
  statusNames,
} from './systemRules';
import type { SystemUser, UserStatus } from './systemTypes';
import {
  AdminError,
  AdminHeader,
  AdminLoading,
  AdminNotice,
  ConfirmAction,
  useAdminKey,
  useAdminMutation,
} from './shared';
import { formatDateTime } from '@/lib/format';

export default function UserDetailPage() {
  const { userId = '' } = useParams();
  const [generation, setGeneration] = useState(0);
  const target = useQuery({
    queryKey: useAdminKey('user', userId),
    queryFn: ({ signal }) => systemApi.user(userId, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <AdminHeader
        eyebrow="CON NGƯỜI / CHI TIẾT"
        title="Hồ sơ tài khoản."
        description="Xem thông tin và xác nhận thay đổi quyền truy cập."
      >
        <Link className="admin-button is-quiet" to="/admin/users">
          Về danh sách
        </Link>
      </AdminHeader>
      {target.isPending ? (
        <AdminLoading />
      ) : target.isError ? (
        <AdminError retry={() => void target.refetch()} />
      ) : (
        <>
          <UserEditor key={`${userId}-${generation}`} target={target.data} />
          <ConfirmAction
            label="Tải lại bản hiện tại"
            title="Bỏ thay đổi chưa lưu?"
            description="Thông tin và lựa chọn chưa lưu sẽ được thay bằng bản mới nhất từ hệ thống."
            onConfirm={() =>
              void target.refetch().then((r) => {
                if (r.isSuccess) setGeneration((g) => g + 1);
              })
            }
          />
        </>
      )}
    </>
  );
}
function UserEditor({ target }: { target: SystemUser }) {
  const { user: actor, permissions } = useAdminAccess();
  const [status, setStatus] = useState<UserStatus>(target.status as UserStatus);
  const [roles, setRoles] = useState(target.roles);
  const canEdit = canChangeUser(actor!, target);
  const roleQuery = useQuery({
    queryKey: useAdminKey('roles'),
    queryFn: ({ signal }) => systemApi.roles(signal),
    enabled:
      canEdit &&
      permissions.has('SYSTEM_ROLE_READ') &&
      permissions.has('SYSTEM_USER_ROLE_ASSIGN'),
    retry: false,
  });
  const allowed = assignableRoles(
    actor!,
    permissions,
    roleQuery.data ?? [],
    target,
  );
  const statusMutation = useAdminMutation((next: UserStatus) =>
    systemApi.status(target.id, next),
  );
  const rolesMutation = useAdminMutation((next: string[]) =>
    systemApi.userRoles(target.id, next),
  );
  const blocked = !canEdit || target.id === actor!.id;
  const validRoles =
    roles.length > 0 &&
    roles.length <= 20 &&
    roles.every((code) => allowed.some((r) => r.code === code));
  return (
    <div className="admin-detail-grid">
      <section className="admin-panel admin-form-panel">
        <span className="admin-eyebrow">THÔNG TIN TÀI KHOẢN</span>
        <h2>
          {[target.lastName, target.firstName].filter(Boolean).join(' ') ||
            target.username}
        </h2>
        <dl className="admin-definition-list">
          {[
            ['Tên đăng nhập', target.username],
            ['Email', target.email],
            ['Ngày sinh', target.dateOfBirth || 'Chưa cập nhật'],
            [
              'Xác thực email',
              target.emailVerified ? 'Đã xác thực' : 'Chưa xác thực',
            ],
            ['Ngày tạo', formatDateTime(target.createdAt)],
            ['Cập nhật', formatDateTime(target.updatedAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="admin-footnote">
          Thay đổi trạng thái hoặc vai trò sẽ thu hồi phiên đăng nhập của tài
          khoản này. Tài khoản phải đăng nhập lại.
        </p>
        {!canEdit && (
          <p className="admin-notice">
            Tài khoản được bảo vệ. ADMIN không thể bị đổi vai trò hoặc trạng
            thái; chỉ ADMIN được quản lý STAFF.
          </p>
        )}
      </section>
      <div className="admin-stack">
        <section className="admin-panel admin-form-panel">
          <h2>Trạng thái truy cập</h2>
          <p>{statusNames[target.status] ?? target.status}</p>
          {permissions.has('SYSTEM_USER_STATUS_UPDATE') && !blocked ? (
            <>
              <label className="admin-field">
                Trạng thái mới
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  disabled={statusMutation.busy}
                >
                  {Object.entries(statusNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-form-actions">
                <ConfirmAction
                  label="Đổi trạng thái"
                  title={`Đổi trạng thái ${target.username}?`}
                  description={`Chuyển sang “${statusNames[status]}”. Các phiên đang hoạt động sẽ bị thu hồi.`}
                  disabled={status === target.status || statusMutation.busy}
                  onConfirm={() => statusMutation.mutate(status)}
                />
              </div>
              <AdminNotice
                error={statusMutation.error}
                message={statusMutation.message}
              />
            </>
          ) : (
            <p className="admin-footnote">
              Bạn không có quyền thay đổi trạng thái tài khoản này.
            </p>
          )}
        </section>
        <section className="admin-panel admin-form-panel">
          <h2>Vai trò được gán</h2>
          <div className="admin-role-tags">
            {target.roles.map((r) => (
              <span className="admin-chip" key={r}>
                {roleNames[r] ?? r}
              </span>
            ))}
          </div>
          {permissions.has('SYSTEM_USER_ROLE_ASSIGN') && !blocked ? (
            <>
              {!permissions.has('SYSTEM_ROLE_READ') ? (
                <p>Cần quyền xem danh mục vai trò để phân vai trò chính xác.</p>
              ) : roleQuery.isPending ? (
                <AdminLoading />
              ) : roleQuery.isError ? (
                <AdminError retry={() => void roleQuery.refetch()} />
              ) : (
                <>
                  <fieldset
                    className="admin-check-list"
                    disabled={rolesMutation.busy}
                  >
                    <legend>Thay thế toàn bộ vai trò</legend>
                    {(roleQuery.data ?? [])
                      .filter((r) => r.code !== 'ADMIN')
                      .map((r) => (
                        <label key={r.code}>
                          <input
                            type="checkbox"
                            checked={roles.includes(r.code)}
                            disabled={!allowed.some((a) => a.code === r.code)}
                            onChange={(e) =>
                              setRoles((prev) =>
                                e.target.checked
                                  ? [...prev, r.code]
                                  : prev.filter((c) => c !== r.code),
                              )
                            }
                          />
                          <span>
                            <b>{roleNames[r.code] ?? r.code}</b>
                            <small>{r.description}</small>
                          </span>
                        </label>
                      ))}
                  </fieldset>
                  <p className="admin-footnote">
                    Chọn ít nhất một vai trò. STAFF chỉ được gán các quyền mình
                    đang có, không được gán STAFF/ADMIN.
                  </p>
                  <ConfirmAction
                    label="Lưu vai trò"
                    title={`Phân lại vai trò cho ${target.username}?`}
                    description={`Danh sách mới: ${roles.join(', ')}. Danh sách này thay thế toàn bộ vai trò hiện tại và thu hồi phiên đăng nhập.`}
                    disabled={
                      !validRoles ||
                      rolesMutation.busy ||
                      [...roles].sort().join() ===
                        [...target.roles].sort().join()
                    }
                    onConfirm={() => rolesMutation.mutate(roles)}
                  />
                </>
              )}
              <AdminNotice
                error={rolesMutation.error}
                message={rolesMutation.message}
              />
            </>
          ) : (
            <p className="admin-footnote">
              Vai trò chỉ hiển thị để tra cứu với tài khoản này.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
