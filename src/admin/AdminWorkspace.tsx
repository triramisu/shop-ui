import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { AdminGate } from './AdminGate';
import { useAdminAccess } from './useAdminAccess';
import DashboardPage from './DashboardPage';
import ProductsPage from './ProductsPage';
import ProductEditorPage from './ProductEditorPage';
import CategoriesPage from './CategoriesPage';
import InventoryPage from './InventoryPage';
import StockPage from './StockPage';
import UsersPage from './UsersPage';
import UserDetailPage from './UserDetailPage';
import RolesPage from './RolesPage';
import PermissionsPage from './PermissionsPage';
import RefundsPage from './RefundsPage';
import { useTheme } from '@/lib/useTheme';
import '../styles/admin.css';

function AdminLayout() {
  const { user, permissions, logout } = useAdminAccess();
  const { theme, setTheme } = useTheme();
  return (
    <div className="admin-shell brand-surface">
      <a className="admin-skip" href="#admin-main">
        Đến nội dung quản trị
      </a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin">
          aydibro<span>.</span>
          <small>WORKSPACE / 01</small>
        </Link>
        <div className="admin-nav-caption">VẬN HÀNH CỬA HÀNG</div>
        <nav aria-label="Điều hướng quản trị">
          <NavLink end to="/admin">
            <Icon name="grid" />
            Tổng quan
          </NavLink>
          {permissions.has('SYSTEM_USER_READ') && (
            <NavLink to="/admin/users">
              <Icon name="user" />
              Người dùng
            </NavLink>
          )}
          {permissions.has('SYSTEM_ROLE_READ') && (
            <NavLink to="/admin/roles">
              <Icon name="shield" />
              Vai trò
            </NavLink>
          )}
          {permissions.has('SYSTEM_PERMISSION_READ') && (
            <NavLink to="/admin/permissions">
              <Icon name="sliders" />
              Quyền hệ thống
            </NavLink>
          )}
          {permissions.has('CATALOG_READ') && (
            <>
              <NavLink to="/admin/products">
                <Icon name="headphones" />
                Sản phẩm
              </NavLink>
              <NavLink to="/admin/categories">
                <Icon name="list" />
                Danh mục
              </NavLink>
            </>
          )}
          {permissions.has('INVENTORY_READ') && (
            <NavLink to="/admin/inventory">
              <Icon name="box" />
              Tồn kho
            </NavLink>
          )}
          {permissions.has('PAYMENT_REFUND') && (
            <NavLink to="/admin/refunds">
              <Icon name="refresh" />
              Hoàn tiền
            </NavLink>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">
            <Icon name="arrow-up" />
            Xem cửa hàng
          </Link>
          <span>
            <Icon name="shield" size={17} />
            Không gian nội bộ
          </span>
        </div>
      </aside>
      <div className="admin-stage">
        <header className="admin-topbar">
          <span className="admin-workspace-label">
            AYDIBRO <span>/</span> QUẢN TRỊ
          </span>
          <div>
            <button
              className="admin-icon-button"
              aria-label="Đổi giao diện sáng tối"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <Link
              className="admin-icon-button"
              to="/profile"
              aria-label="Hồ sơ cá nhân"
            >
              <Icon name="user" />
            </Link>
            <span className="admin-person">
              <b>{user!.firstName || user!.username}</b>
              <small>
                {user!.roles.includes('ADMIN') ? 'Quản trị viên' : 'Nhân viên'}
              </small>
            </span>
            <Link
              className="admin-icon-button admin-mobile-storefront"
              to="/"
              aria-label="Xem cửa hàng"
            >
              <Icon name="arrow-up" />
            </Link>
            <button
              type="button"
              className="admin-icon-button"
              title="Đăng xuất"
              aria-label="Đăng xuất quản trị"
              onClick={() => void logout()}
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          <Outlet />
        </main>
        <footer className="admin-footer">
          <span>AYDIBRO / OPERATIONS</span>
          <span>Mọi thay đổi được xác nhận bởi hệ thống.</span>
        </footer>
      </div>
    </div>
  );
}
export default function AdminWorkspace() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="users"
          element={
            <AdminGate capability="SYSTEM_USER_READ">
              <UsersPage />
            </AdminGate>
          }
        />
        <Route
          path="users/:userId"
          element={
            <AdminGate capability="SYSTEM_USER_READ">
              <UserDetailPage />
            </AdminGate>
          }
        />
        <Route
          path="roles"
          element={
            <AdminGate capability="SYSTEM_ROLE_READ">
              <RolesPage />
            </AdminGate>
          }
        />
        <Route
          path="permissions"
          element={
            <AdminGate capability="SYSTEM_PERMISSION_READ">
              <PermissionsPage />
            </AdminGate>
          }
        />
        <Route
          path="refunds"
          element={
            <AdminGate capability="PAYMENT_REFUND">
              <RefundsPage />
            </AdminGate>
          }
        />
        <Route
          path="products"
          element={
            <AdminGate capability="CATALOG_READ">
              <ProductsPage />
            </AdminGate>
          }
        />
        <Route
          path="products/new"
          element={
            <AdminGate capability="CATALOG_READ">
              <AdminGate capability="CATALOG_WRITE">
                <ProductEditorPage />
              </AdminGate>
            </AdminGate>
          }
        />
        <Route
          path="products/:productId"
          element={
            <AdminGate capability="CATALOG_READ">
              <ProductEditorPage />
            </AdminGate>
          }
        />
        <Route
          path="categories"
          element={
            <AdminGate capability="CATALOG_READ">
              <CategoriesPage />
            </AdminGate>
          }
        />
        <Route
          path="inventory"
          element={
            <AdminGate capability="INVENTORY_READ">
              <InventoryPage />
            </AdminGate>
          }
        />
        <Route
          path="inventory/:stockId"
          element={
            <AdminGate capability="INVENTORY_READ">
              <StockPage />
            </AdminGate>
          }
        />
        <Route
          path="*"
          element={
            <div className="admin-empty">
              <h1>Không tìm thấy trang quản trị</h1>
              <Link to="/admin">Về tổng quan</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
