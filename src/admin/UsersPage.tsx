import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { systemApi } from './systemApi';
import { roleNames, statusNames } from './systemRules';
import {
  AdminError,
  AdminHeader,
  AdminLoading,
  Empty,
  Pager,
  useAdminKey,
} from './shared';
import { formatDateTime } from '@/lib/format';

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const keyword = (params.get('q') ?? '').slice(0, 100);
  const status = Object.keys(statusNames).includes(params.get('status') ?? '')
    ? params.get('status')!
    : '';
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0') || 0);
  const [draft, setDraft] = useState(keyword);
  useEffect(() => setDraft(keyword), [keyword]);
  const users = useQuery({
    queryKey: useAdminKey('users', keyword, status, page),
    queryFn: ({ signal }) =>
      systemApi.users({ keyword, status, page, size: 12 }, signal),
    retry: false,
  });
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  return (
    <>
      <AdminHeader
        eyebrow="QUẢN TRỊ / CON NGƯỜI"
        title="Người dùng & nhân viên."
        description="Một nơi để xem tài khoản, quản lý trạng thái và phân vai trò cho đội ngũ."
      />
      <section className="admin-panel">
        <div className="admin-toolbar">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              change('q', draft.trim());
            }}
          >
            <label className="admin-search">
              <Icon name="search" />
              <span className="admin-sr-only">Tìm người dùng</span>
              <input
                maxLength={100}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tên đăng nhập, họ tên hoặc email…"
              />
            </label>
            <button className="admin-button is-quiet">Tìm kiếm</button>
          </form>
          <label className="admin-filter">
            Trạng thái
            <select
              value={status}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="">Tất cả</option>
              {Object.entries(statusNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        {users.isPending ? (
          <AdminLoading />
        ) : users.isError ? (
          <AdminError retry={() => void users.refetch()} />
        ) : users.data.content.length ? (
          <>
            <div className="admin-people-list">
              {users.data.content.map((u) => (
                <Link
                  className="admin-person-row"
                  key={u.id}
                  to={`/admin/users/${u.id}`}
                >
                  <span className="admin-avatar">
                    {(u.firstName || u.username).charAt(0).toUpperCase()}
                  </span>
                  <span className="admin-person-details">
                    <b>
                      {[u.lastName, u.firstName].filter(Boolean).join(' ') ||
                        u.username}
                    </b>
                    <small>
                      {u.username} · {u.email}
                    </small>
                  </span>
                  <span className="admin-role-tags">
                    {u.roles.map((r) => (
                      <span key={r} className="admin-chip">
                        {roleNames[r] ?? r}
                      </span>
                    ))}
                  </span>
                  <span
                    className={`admin-badge state-${u.status.toLowerCase()}`}
                  >
                    {statusNames[u.status] ?? u.status}
                  </span>
                  <span className="admin-person-date">
                    {formatDateTime(u.createdAt)}
                  </span>
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
            </div>
            <Pager
              page={page}
              totalPages={users.data.totalPages}
              totalElements={users.data.totalElements}
              onPage={(p) => change('page', String(p))}
            />
          </>
        ) : (
          <Empty title="Chưa có tài khoản phù hợp">
            <p>Thử từ khóa hoặc trạng thái khác.</p>
          </Empty>
        )}
      </section>
      <p className="admin-footnote">
        Danh sách gồm khách hàng và nhân viên. Chọn tài khoản để xem chi tiết;
        vai trò ADMIN luôn được bảo vệ.
      </p>
    </>
  );
}
