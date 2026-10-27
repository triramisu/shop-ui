import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { adminApi } from './api';
import { systemApi } from './systemApi';
import { roleNames, statusNames } from './systemRules';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  Badge,
  Empty,
  useAdminKey,
} from './shared';

export default function DashboardPage() {
  const { permissions } = useAdminAccess();
  const users = useQuery({
    queryKey: useAdminKey('dashboard-users'),
    queryFn: ({ signal }) => systemApi.users({ size: 5 }, signal),
    enabled: permissions.has('SYSTEM_USER_READ'),
    retry: false,
  });
  const products = useQuery({
    queryKey: useAdminKey('dashboard-products'),
    queryFn: ({ signal }) =>
      adminApi.products(
        { size: 5, sortBy: 'UPDATED_AT', direction: 'DESC' },
        signal,
      ),
    enabled: permissions.has('CATALOG_READ'),
    retry: false,
  });
  const stocks = useQuery({
    queryKey: useAdminKey('dashboard-stock'),
    queryFn: ({ signal }) => adminApi.stocks({ size: 5 }, signal),
    enabled: permissions.has('INVENTORY_READ'),
    retry: false,
  });
  const categories = useQuery({
    queryKey: useAdminKey('categories'),
    queryFn: ({ signal }) => adminApi.categories(signal),
    enabled: permissions.has('CATALOG_READ'),
    retry: false,
  });
  const metrics = [
    ...(permissions.has('SYSTEM_USER_READ')
      ? [
          {
            label: 'Người dùng',
            value: users.data?.totalElements,
            loading: users.isPending,
            to: '/admin/users',
            caption: 'Khách hàng & nhân viên',
            icon: 'user' as const,
          },
        ]
      : []),
    ...(permissions.has('CATALOG_READ')
      ? [
          {
            label: 'Sản phẩm',
            value: products.data?.totalElements,
            loading: products.isPending,
            to: '/admin/products',
            caption: 'Toàn bộ trạng thái',
            icon: 'headphones' as const,
          },
          {
            label: 'Danh mục',
            value: categories.data?.length,
            loading: categories.isPending,
            to: '/admin/categories',
            caption: 'Đang tồn tại trong Catalog',
            icon: 'list' as const,
          },
        ]
      : []),
    ...(permissions.has('INVENTORY_READ')
      ? [
          {
            label: 'Bản ghi tồn kho',
            value: stocks.data?.totalElements,
            loading: stocks.isPending,
            to: '/admin/inventory',
            caption: 'Mỗi cặp SKU × địa điểm',
            icon: 'box' as const,
          },
        ]
      : []),
  ];
  return (
    <>
      <AdminHeader
        eyebrow="01 / TỔNG QUAN"
        title="Một nhịp vận hành rõ ràng."
        description="Con người, sản phẩm và hoạt động cửa hàng. Mọi dữ liệu được đọc trực tiếp từ hệ thống."
      />
      <div className="admin-metrics">
        {metrics.map((metric) => (
          <Link className="admin-metric" to={metric.to} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <Icon name={metric.icon} size={20} />
            </div>
            <strong>
              {metric.value?.toLocaleString('vi-VN') ??
                (metric.loading ? '…' : '—')}
            </strong>
            <small>
              {metric.caption}
              <Icon name="arrow-up" size={15} />
            </small>
          </Link>
        ))}
      </div>
      {permissions.has('SYSTEM_USER_READ') && (
        <section className="admin-panel admin-dashboard-people">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">CON NGƯỜI</span>
              <h2>Tài khoản mới nhất</h2>
            </div>
            <Link className="admin-text-link" to="/admin/users">
              Quản lý người dùng & STAFF <Icon name="arrow" size={16} />
            </Link>
          </div>
          {users.isPending ? (
            <AdminLoading />
          ) : users.isError ? (
            <AdminError retry={() => void users.refetch()} />
          ) : users.data.content.length ? (
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
                    <small>{u.email}</small>
                  </span>
                  <span className="admin-role-tags">
                    {u.roles.map((r) => (
                      <span className="admin-chip" key={r}>
                        {roleNames[r] ?? r}
                      </span>
                    ))}
                  </span>
                  <span
                    className={`admin-badge state-${u.status.toLowerCase()}`}
                  >
                    {statusNames[u.status] ?? u.status}
                  </span>
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có tài khoản" />
          )}
        </section>
      )}
      <div className="admin-dashboard-grid">
        {permissions.has('CATALOG_READ') && (
          <section className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <span className="admin-eyebrow">CATALOG</span>
                <h2>Sản phẩm cập nhật gần đây</h2>
              </div>
              <Link to="/admin/products" className="admin-text-link">
                Xem tất cả <Icon name="arrow" size={16} />
              </Link>
            </div>
            {products.isPending ? (
              <AdminLoading />
            ) : products.isError ? (
              <AdminError retry={() => void products.refetch()} />
            ) : products.data.content.length ? (
              <div className="admin-product-list">
                {products.data.content.map((item) => (
                  <Link to={`/admin/products/${item.id}`} key={item.id}>
                    <span className="admin-product-symbol">
                      <Icon name="headphones" size={26} />
                    </span>
                    <span className="admin-product-list-copy">
                      <b>{item.name}</b>
                      <small>
                        {item.category?.name ?? 'Chưa có danh mục'} ·{' '}
                        {item.variants.length} SKU
                      </small>
                    </span>
                    <Badge status={item.status} />
                    <Icon name="chevron" size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="Bắt đầu bằng sản phẩm đầu tiên" />
            )}
          </section>
        )}
        <section className="admin-panel admin-guide">
          <span className="admin-eyebrow">GỢI Ý VẬN HÀNH</span>
          <h2>
            Từ bản nháp
            <br />
            đến cửa hàng.
          </h2>
          <ol>
            <li>
              <b>01</b>
              <span>
                Tạo sản phẩm và danh mục.
                <small>Thông tin rõ ràng, tên và đường dẫn nhất quán.</small>
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                Thêm SKU, giá và hình ảnh.
                <small>Ảnh được lưu qua backend vào S3.</small>
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                Kiểm tra kho rồi công bố.
                <small>Chỉ người có quyền mới thấy thao tác tương ứng.</small>
              </span>
            </li>
          </ol>
          <Link
            to={
              permissions.has('SYSTEM_USER_READ')
                ? '/admin/users'
                : permissions.has('CATALOG_READ')
                  ? '/admin/products'
                  : permissions.has('INVENTORY_READ')
                    ? '/admin/inventory'
                    : permissions.has('SYSTEM_ROLE_READ')
                      ? '/admin/roles'
                      : permissions.has('SYSTEM_PERMISSION_READ')
                        ? '/admin/permissions'
                        : '/admin/refunds'
            }
            className="admin-button"
          >
            Mở không gian làm việc <Icon name="arrow" size={17} />
          </Link>
        </section>
      </div>
      {permissions.has('INVENTORY_READ') && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">INVENTORY</span>
              <h2>Năm bản ghi kho mới nhất</h2>
            </div>
            <Link to="/admin/inventory" className="admin-text-link">
              Mở tồn kho <Icon name="arrow" size={16} />
            </Link>
          </div>
          {stocks.isPending ? (
            <AdminLoading />
          ) : stocks.isError ? (
            <AdminError retry={() => void stocks.refetch()} />
          ) : stocks.data.content.length ? (
            <div className="admin-table-wrap">
              <table>
                <caption className="admin-sr-only">
                  Năm bản ghi kho mới nhất, không phải tổng số lượng toàn kho
                </caption>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Địa điểm</th>
                    <th>Thực tế</th>
                    <th>Đang giữ</th>
                    <th>Khả dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.data.content.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="admin-text-link"
                          to={`/admin/inventory/${item.id}`}
                        >
                          {item.sku}
                        </Link>
                      </td>
                      <td>{item.locationCode}</td>
                      <td>{item.onHand}</td>
                      <td>{item.reserved}</td>
                      <td>
                        <b>{item.available}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Chưa có bản ghi kho" />
          )}
        </section>
      )}
    </>
  );
}
