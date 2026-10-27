import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Icon } from './Icon';
import { useTheme } from '@/lib/useTheme';
import '@/styles/retail.css';

export function Layout() {
  const { pathname, hash } = useLocation();
  const { theme, setTheme } = useTheme();
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const previousPath = useRef<string>();
  useEffect(() => {
    const changedPage = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (hash) {
      const frame = requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth',
        }),
      );
      return () => cancelAnimationFrame(frame);
    } else if (changedPage) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return (
    <div className="site-shell site-shell--retail">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Navbar />
      <main id="main-content" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-invitation">
          <div>
            <p className="eyebrow">YOUR NEXT GOOD LISTEN</p>
            <h2>Tìm một chút yên tĩnh.</h2>
          </div>
          <Link to="/products" className="retail-hero-cta">
            Ghé cửa hàng <Icon name="arrow-up" size={18} />
          </Link>
        </div>
        <div className="container footer-top">
          <div className="footer-brand">
            <Link to="/" className="wordmark">
              aydibro<span>.</span>
            </Link>
            <p>
              Âm thanh hay.
              <br />
              Cho những ngày rất riêng.
            </p>
          </div>
          <div>
            <h3>Khám phá</h3>
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/saved">Sản phẩm đã lưu</Link>
            <Link to="/#collections">Không gian cảm hứng</Link>
          </div>
          <div>
            <h3>Tài khoản của bạn</h3>
            <Link to="/profile">Hồ sơ cá nhân</Link>
            <Link to="/cart">Giỏ hàng</Link>
            <Link to="/orders">Đơn hàng của tôi</Link>
          </div>
          <div className="footer-note">
            <span className="eyebrow">MAKE ROOM FOR MUSIC.</span>
            <p>
              Dành một khoảng nhỏ cho bản thân.
              <br />
              Bắt đầu bằng một bản nhạc yêu thích.
            </p>
            <Link to="/products" className="text-link">
              Tìm điều bạn thích <Icon name="arrow-up" size={17} />
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Aydibro. Made for your everyday.
          </span>
          <button
            className="footer-theme"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={16} />
            {dark ? 'Giao diện sáng' : 'Giao diện tối'}
          </button>
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
