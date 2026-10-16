import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Breadcrumbs, ErrorBox, Spinner } from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { formatDateTime } from '@/lib/format';

export function ProfilePage() {
  const { user, loadingUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  if (loadingUser && !user)
    return <Spinner label="Đang mở tài khoản của bạn…" />;
  if (!user)
    return (
      <div className="container inner-page">
        <ErrorBox
          message="Chưa tải được thông tin cá nhân của bạn."
          retry={() => void refreshUser()}
        />
      </div>
    );
  const name =
    [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username;
  const rows: Array<[string, string]> = [
    ['Tên đăng nhập', user.username],
    ['Họ và tên', name],
    ['Email', user.email],
    [
      'Ngày sinh',
      user.dateOfBirth
        ? new Date(`${user.dateOfBirth}T00:00:00`).toLocaleDateString('vi-VN')
        : 'Chưa cập nhật',
    ],
    ['Trạng thái', user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status],
    ['Xác thực email', user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'],
    ['Thành viên từ', formatDateTime(user.createdAt)],
  ];
  return (
    <div className="container inner-page">
      <Breadcrumbs items={[{ label: 'Tài khoản' }]} />
      <div className="page-heading">
        <span className="eyebrow">YOUR AYDIBRO SPACE</span>
        <h1>
          Chào {user.firstName || user.username}
          <span className="accent-period">.</span>
        </h1>
        <p>Một góc riêng cho bạn và những điều bạn yêu thích.</p>
      </div>
      <div className="profile-grid">
        <aside className="profile-sidebar">
          <div className="profile-avatar">{name.charAt(0).toUpperCase()}</div>
          <h2>{name}</h2>
          <p>{user.email}</p>
          <nav aria-label="Menu tài khoản">
            <Link to="/profile">
              <Icon name="user" size={17} />
              Thông tin cá nhân
            </Link>
            <Link to="/saved">
              <Icon name="heart" size={17} />
              Sản phẩm đã lưu
            </Link>
            <Link to="/cart">
              <Icon name="bag" size={17} />
              Giỏ hàng của bạn
            </Link>
            <Link to="/orders">
              <Icon name="box" size={17} />
              Đơn hàng của tôi
            </Link>
            <button
              onClick={() => {
                void logout();
                navigate('/');
              }}
            >
              <Icon name="logout" size={17} />
              Đăng xuất
            </button>
          </nav>
        </aside>
        <section className="profile-data">
          <h2>Thông tin cá nhân</h2>
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
