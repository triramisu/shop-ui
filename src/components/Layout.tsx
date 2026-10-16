import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Icon } from './Icon';

export function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: 'smooth' }),
      );
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Navbar />
      <main id="main-content" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-top">
          <div className="footer-brand">
            <Link to="/" className="wordmark">
              aydibro<span>.</span>
            </Link>
            <p>
              Công nghệ vừa vặn.
              <br />
              Cuộc sống nhiều cảm hứng.
            </p>
          </div>
          <div>
            <h3>Khám phá</h3>
            <Link to="/#products">Tất cả sản phẩm</Link>
            <Link to="/saved">Sản phẩm đã lưu</Link>
            <Link to="/#collections">Không gian cảm hứng</Link>
          </div>
          <div>
            <h3>Tài khoản của bạn</h3>
            <Link to="/profile">Hồ sơ cá nhân</Link>
            <Link to="/cart">Giỏ hàng</Link>
            <Link to="/login">Đăng nhập</Link>
          </div>
          <div className="footer-note">
            <span className="eyebrow">LESS, BUT BETTER.</span>
            <p>
              Một lựa chọn nhỏ hôm nay.
              <br />
              Một trải nghiệm tốt hơn mỗi ngày.
            </p>
            <Link to="/#products" className="text-link">
              Tìm điều bạn thích <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Aydibro. Made for your everyday.
          </span>
          <span>
            Chọn có chủ đích. Dùng thật lâu. <span className="footer-dot" />
          </span>
        </div>
      </footer>
    </div>
  );
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="center-pad" role="status">
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <Icon name="info" size={26} />
      <div>
        <strong>Chưa thể tải nội dung</strong>
        <p>{message}</p>
      </div>
      {retry && (
        <button className="btn btn-secondary btn-sm" onClick={retry}>
          <Icon name="refresh" size={15} /> Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = 'bag',
  title,
  description,
  children,
}: {
  icon?: 'bag' | 'heart' | 'search' | 'box';
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={34} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; to?: string }>;
}) {
  return (
    <nav className="breadcrumbs" aria-label="Điều hướng trang">
      <Link to="/">Trang chủ</Link>
      {items.map((item, i) => (
        <span key={i}>
          <Icon name="chevron" size={12} />
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
