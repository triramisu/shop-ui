import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { cartApi } from '@/api/cart';
import { catalogApi } from '@/api/catalog';
import { useSaved } from '@/lib/saved';
import { Icon } from './Icon';
import { CatalogNavLink } from './CatalogNavLink';
import { categoryLabel } from './catalog/presentation';
import { useAdminAccess } from '@/admin/useAdminAccess';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { canEnter } = useAdminAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const { saved } = useSaved();
  const menuDialog = useRef<HTMLDialogElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.categories,
  });
  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: isAuthenticated,
  });
  const count = isAuthenticated ? (cart.data?.totalQuantity ?? 0) : 0;

  useEffect(() => {
    menuDialog.current?.close();
    searchDialog.current?.close();
    setMenu(false);
    setSearchOpen(false);
    setQuery(new URLSearchParams(location.search).get('q') ?? '');
  }, [location]);
  useEffect(() => {
    if (!menu && !searchOpen) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [menu, searchOpen]);
  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 901px)');
    function desktop(event: MediaQueryListEvent) {
      if (event.matches) {
        const focusWasInMenu = menuDialog.current?.contains(
          document.activeElement,
        );
        menuDialog.current?.close();
        if (focusWasInMenu)
          document.querySelector<HTMLAnchorElement>('.wordmark')?.focus();
      }
    }
    breakpoint.addEventListener('change', desktop);
    return () => breakpoint.removeEventListener('change', desktop);
  }, []);

  function search(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
    searchDialog.current?.close();
  }

  return (
    <>
      <div className="announcement">
        <div className="container">
          <span>AYDIBRO — EVERYDAY AUDIO</span>
          <p>Âm thanh cho khoảng trời riêng.</p>
          <Link to="/products">
            Khám phá cửa hàng <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <nav className="desktop-navigation" aria-label="Điều hướng chính">
            <CatalogNavLink>Cửa hàng</CatalogNavLink>
            {categories.data?.slice(0, 3).map((category) => (
              <CatalogNavLink key={category.id} categoryId={category.id}>
                {categoryLabel(category.name)}
              </CatalogNavLink>
            ))}
          </nav>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label="Mở menu"
            aria-haspopup="dialog"
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => {
              menuDialog.current?.showModal();
              setMenu(true);
            }}
          >
            <Icon name="menu" />
          </button>
          <Link to="/" className="wordmark" aria-label="Aydibro — trang chủ">
            aydibro<span>.</span>
          </Link>
          <div className="header-actions">
            {canEnter && (
              <Link
                to="/admin"
                className="icon-button admin-entry-link"
                aria-label="Mở quản trị cửa hàng"
              >
                <Icon name="shield" />
              </Link>
            )}
            <button
              className="icon-button"
              type="button"
              aria-label="Mở tìm kiếm"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-controls="store-search"
              onClick={() => {
                searchDialog.current?.showModal();
                setSearchOpen(true);
              }}
            >
              <Icon name="search" />
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
              className="icon-button"
              aria-label={
                isAuthenticated
                  ? `Tài khoản ${user?.firstName || user?.username || 'của bạn'}`
                  : 'Đăng nhập tài khoản'
              }
            >
              <Icon name="user" />
            </Link>
            <NavLink
              to="/cart"
              className="icon-button storefront-cart"
              aria-label={`Giỏ hàng, ${count} sản phẩm`}
            >
              <Icon name="bag" />
              <span className="storefront-cart-count">{count}</span>
            </NavLink>
          </div>
        </div>
      </header>

      <dialog
        ref={menuDialog}
        className="mobile-navigation"
        id="mobile-navigation"
        aria-labelledby="mobile-menu-title"
        onClose={() => setMenu(false)}
      >
        <div className="drawer-heading">
          <h2 id="mobile-menu-title">Khám phá Aydibro</h2>
          <button
            className="icon-button"
            aria-label="Đóng menu"
            onClick={() => menuDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Điều hướng trên điện thoại">
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          <CatalogNavLink>Tất cả sản phẩm</CatalogNavLink>
          {categories.data?.map((category) => (
            <CatalogNavLink key={category.id} categoryId={category.id}>
              {categoryLabel(category.name)}
            </CatalogNavLink>
          ))}
          <Link to="/saved">Đã lưu ({saved.length})</Link>
          {canEnter && <Link to="/admin">Quản trị cửa hàng</Link>}
          <Link to={isAuthenticated ? '/orders' : '/login'}>
            {isAuthenticated ? 'Đơn hàng của tôi' : 'Đăng nhập'}
          </Link>
        </nav>
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
        <p className="drawer-footnote">
          Một playlist hay. Một khoảng trời riêng.
        </p>
      </dialog>

      <dialog
        ref={searchDialog}
        id="store-search"
        className="store-search"
        aria-labelledby="store-search-title"
        onClose={() => setSearchOpen(false)}
      >
        <div className="drawer-heading">
          <h2 id="store-search-title">Bạn muốn nghe gì hôm nay?</h2>
          <button
            className="icon-button"
            aria-label="Đóng tìm kiếm"
            onClick={() => searchDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <form className="header-search" role="search" onSubmit={search}>
          <Icon name="search" size={21} />
          <input
            type="search"
            autoFocus
            aria-label="Tìm kiếm sản phẩm"
            placeholder="Tìm tai nghe, tìm chất riêng…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            enterKeyHint="search"
          />
          <button type="submit" aria-label="Tìm kiếm">
            <Icon name="arrow" size={21} />
          </button>
        </form>
        <p className="search-hint">Gợi ý từ cửa hàng</p>
        <div className="search-suggestions">
          <Link to="/products">
            Tất cả sản phẩm <Icon name="arrow-up" size={16} />
          </Link>
          {categories.data?.map((category) => (
            <Link key={category.id} to={`/products?category=${category.id}`}>
              {categoryLabel(category.name)} <Icon name="arrow-up" size={16} />
            </Link>
          ))}
        </div>
      </dialog>
    </>
  );
}
