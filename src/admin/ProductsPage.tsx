import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { adminApi } from './api';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  Badge,
  Empty,
  Pager,
  useAdminKey,
} from './shared';

export default function ProductsPage() {
  const { permissions } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0') || 0);
  const keyword = (params.get('q') ?? '').slice(0, 100);
  const status = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'].includes(
    params.get('status') ?? '',
  )
    ? params.get('status')!
    : '';
  const [draft, setDraft] = useState(keyword);
  useEffect(() => setDraft(keyword), [keyword]);
  const products = useQuery({
    queryKey: useAdminKey('products', page, keyword, status),
    queryFn: ({ signal }) =>
      adminApi.products(
        {
          page,
          size: 12,
          keyword,
          status,
          sortBy: 'UPDATED_AT',
          direction: 'DESC',
        },
        signal,
      ),
    retry: false,
  });
  function change(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      value ? next.set(key, value) : next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }
  return (
    <>
      <AdminHeader
        eyebrow="02 / CATALOG"
        title="Sản phẩm."
        description="Quản lý nội dung, phiên bản và trạng thái xuất hiện trên cửa hàng."
      >
        {permissions.has('CATALOG_WRITE') && (
          <Link className="admin-button" to="/admin/products/new">
            <Icon name="plus" size={18} />
            Tạo sản phẩm
          </Link>
        )}
      </AdminHeader>
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
              <Icon name="search" size={18} />
              <span className="admin-sr-only">Tìm sản phẩm quản trị</span>
              <input
                value={draft}
                maxLength={100}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tìm theo tên hoặc nội dung…"
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
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đang bán</option>
              <option value="HIDDEN">Đã ẩn</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </label>
        </div>
        {products.isPending ? (
          <AdminLoading />
        ) : products.isError ? (
          <AdminError retry={() => void products.refetch()} />
        ) : (
          <>
            {products.data.content.length ? (
              <>
                <ul
                  className="admin-mobile-products"
                  aria-label="Danh sách sản phẩm quản trị trên mobile"
                >
                  {products.data.content.map((item) => (
                    <li key={item.id}>
                      <Link to={`/admin/products/${item.id}`}>
                        <span>
                          <b>{item.name}</b>
                          <small>{item.category?.name ?? '—'}</small>
                          <small>
                            {item.variants.length} SKU · /{item.slug}
                          </small>
                        </span>
                        <span>
                          <Badge status={item.status} />
                          <Icon name="chevron" size={17} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="admin-table-wrap admin-products-table">
                  <table>
                    <caption className="admin-sr-only">
                      Danh sách sản phẩm quản trị
                    </caption>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Danh mục</th>
                        <th>Phiên bản</th>
                        <th>Trạng thái</th>
                        <th>
                          <span className="admin-sr-only">Thao tác</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.data.content.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link
                              className="admin-item-title"
                              to={`/admin/products/${item.id}`}
                            >
                              {item.name}
                            </Link>
                            <small className="admin-subline">
                              /{item.slug}
                            </small>
                          </td>
                          <td>{item.category?.name ?? '—'}</td>
                          <td>{item.variants.length} SKU</td>
                          <td>
                            <Badge status={item.status} />
                          </td>
                          <td>
                            <Link
                              className="admin-button is-quiet"
                              aria-label={`Mở ${item.name}`}
                              to={`/admin/products/${item.id}`}
                            >
                              Chi tiết <Icon name="chevron" size={15} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Empty title="Không có sản phẩm phù hợp">
                <p>Đổi từ khóa hoặc trạng thái để tìm lại.</p>
              </Empty>
            )}
            <Pager
              {...products.data}
              onPage={(value) => change('page', String(value))}
            />
          </>
        )}
      </section>
    </>
  );
}
