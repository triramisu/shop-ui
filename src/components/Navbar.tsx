import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { cartApi } from '@/api/cart';
import { catalogApi } from '@/api/catalog';
import { useTheme } from '@/lib/useTheme';
import { useSaved } from '@/lib/saved';
import { Icon } from './Icon';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { saved } = useSaved();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: isAuthenticated,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.categories,
  });
  const count = isAuthenticated ? (cart.data?.totalQuantity ?? 0) : 0;
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setMenu(false);
    setQuery(new URLSearchParams(location.search).get('q') ?? '');
  }, [location]);

  function search(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
  }

  return (
    <>
      <div className="announcement">
        <div className="container">
          <span>Chọn điều bạn thích. Nâng tầm mỗi ngày.</span>
          <Link to="/products">
            Khám phá bộ sưu tập <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <button
            className="icon-button mobile-menu-button"
            aria-label={menu ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
          <Link to="/" className="wordmark" aria-label="Aydibro — trang chủ">
            aydibro<span>.</span>
          </Link>
          <form className="header-search" role="search" onSubmit={search}>
            <Icon name="search" size={18} />
            <input
              aria-label="Tìm kiếm sản phẩm"
              placeholder="Bạn đang tìm điều gì?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
            />
            <button type="submit" aria-label="Tìm kiếm">
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="header-actions">
            <button
              className="icon-button theme-button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              aria-label={
                dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'
              }
            >
              <Icon name={dark ? 'sun' : 'moon'} size={19} />
            </button>
            <NavLink
              to="/saved"
              className="icon-button saved-nav"
              aria-label={`Đã lưu ${saved.length} sản phẩm`}
            >
              <Icon name="heart" />
              {saved.length > 0 && (
                <span className="count-dot">{saved.length}</span>
              )}
            </NavLink>
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="account-link"
              aria-label={
                isAuthenticated
                  ? `Tài khoản ${user?.firstName || user?.username || 'của bạn'}`
                  : 'Đăng nhập tài khoản'
              }
            >
              <Icon name="user" />
              <span>
                <small>{isAuthenticated ? 'Xin chào,' : 'Chào bạn,'}</small>
                <strong>
                  {isAuthenticated
                    ? user?.firstName || user?.username || 'Tài khoản'
                    : 'Đăng nhập'}
                </strong>
              </span>
            </Link>
            <NavLink
              to="/cart"
              className="cart-link"
              aria-label={`Giỏ hàng, ${count} sản phẩm`}
            >
              <Icon name="bag" />
              <span className="cart-word">Giỏ hàng</span>
              <span className="cart-count">{count}</span>
            </NavLink>
          </div>
        </div>
        <div className="header-divider">
          <div className="container header-nav">
            <nav aria-label="Điều hướng chính">
              <NavLink to="/" end>
                Khám phá
              </NavLink>
              <NavLink to="/products">Tất cả sản phẩm</NavLink>
              {categories.data?.slice(0, 4).map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            <Link
              className="nav-story"
              to={isAuthenticated ? '/orders' : '/#collections'}
            >
              {isAuthenticated ? 'Đơn hàng của tôi' : 'Góc cảm hứng'}{' '}
              <Icon name={isAuthenticated ? 'box' : 'arrow-up'} size={14} />
            </Link>
          </div>
        </div>
        {menu && (
          <div className="mobile-navigation" id="mobile-navigation">
            <form className="header-search" role="search" onSubmit={search}>
              <Icon name="search" size={18} />
              <input
                aria-label="Tìm kiếm trên điện thoại"
                placeholder="Tìm sản phẩm…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
              />
              <button type="submit" aria-label="Tìm">
                <Icon name="arrow" size={18} />
              </button>
            </form>
            <Link to="/">Trang chủ</Link>
            <Link to="/products">Tất cả sản phẩm</Link>
            {categories.data?.map((category) => (
              <Link key={category.id} to={`/products?category=${category.id}`}>
                {category.name}
              </Link>
            ))}
            <Link to="/saved">Sản phẩm đã lưu ({saved.length})</Link>
            {isAuthenticated && <Link to="/orders">Đơn hàng của tôi</Link>}
            <button
              className="text-button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
            >
              {dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
            </button>
            {isAuthenticated && (
              <button
                className="text-button"
                onClick={() => {
                  void logout();
                  navigate('/');
                }}
              >
                Đăng xuất
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}
