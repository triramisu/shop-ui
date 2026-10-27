import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAdminAccess } from './useAdminAccess';
import type { Capability } from './access';

export function AdminGate({
  children,
  capability,
}: {
  children: ReactNode;
  capability?: Capability;
}) {
  const auth = useAdminAccess();
  const location = useLocation();
  if (!auth.isAuthenticated)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (auth.loadingUser)
    return (
      <div className="container inner-page brand-surface" role="status">
        Đang xác minh quyền quản trị…
      </div>
    );
  if (!auth.user)
    return (
      <div className="container inner-page brand-surface">
        <h1>Chưa xác minh được tài khoản</h1>
        <p>
          Thông tin quyền chưa tải được. Vui lòng thử lại trước khi mở dữ liệu
          quản trị.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => void auth.refreshUser()}
        >
          Thử lại
        </button>
        <Link className="btn btn-secondary" to="/">
          Về cửa hàng
        </Link>
      </div>
    );
  if (!auth.canEnter || (capability && !auth.permissions.has(capability)))
    return (
      <div className="container inner-page brand-surface">
        <span className="eyebrow">403 / QUYỀN TRUY CẬP</span>
        <h1>Bạn chưa có quyền mở mục này.</h1>
        <p>
          Chức năng này dành cho nhân sự được cấp quyền quản trị tương ứng. Vui
          lòng liên hệ quản trị viên nếu bạn cần truy cập.
        </p>
        <Link className="btn btn-primary" to={auth.canEnter ? '/admin' : '/'}>
          {auth.canEnter ? 'Về tổng quan' : 'Về cửa hàng'}
        </Link>
      </div>
    );
  return <>{children}</>;
}
