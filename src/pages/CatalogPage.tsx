import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState, ErrorBox } from '@/components/Layout';
import { Icon, categoryIcon } from '@/components/Icon';
import type { CatalogSortDirection, ProductSortField } from '@/lib/types';

const PAGE_SIZE = 12;
const sorts = ['CREATED_AT:DESC', 'CREATED_AT:ASC', 'NAME:ASC', 'NAME:DESC'];

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const keyword = (params.get('q') ?? '').slice(0, 100);
  const categoryId = params.get('category') ?? '';
  const requestedPage = Number(params.get('page') ?? 0);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage >= 0
      ? requestedPage
      : 0;
  const sort = sorts.includes(params.get('sort') ?? '')
    ? params.get('sort')!
    : sorts[0];
  const [sortBy, direction] = sort.split(':') as [
    ProductSortField,
    CatalogSortDirection,
  ];
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.categories,
  });
  const products = useQuery({
    queryKey: ['products', keyword, categoryId, sortBy, direction, page],
    queryFn: () =>
      catalogApi.searchProducts({
        keyword: keyword || undefined,
        categoryId: categoryId || undefined,
        sortBy,
        direction,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const data = products.data;
  const category = categories.data?.find((item) => item.id === categoryId);
  const filtered = !!keyword || !!categoryId;

  function update(key: string, value: string) {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { preventScrollReset: true },
    );
  }

  return (
    <>
      {!filtered && page === 0 && (
        <section
          className="container hero-section"
          aria-labelledby="hero-heading"
        >
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> THE EVERYDAY EDIT / 2026
            </span>
            <h1 id="hero-heading">
              Công nghệ tốt.
              <br />
              Ngày <em>thật khác.</em>
            </h1>
            <p>
              Những món đồ bạn yêu thích.
              <br />
              Cho công việc, khoảng nghỉ và mọi điều ở giữa.
            </p>
            <a href="#products" className="btn btn-dark">
              Khám phá ngay <Icon name="arrow" size={19} />
            </a>
            <div className="hero-footnote">
              <span>Chọn có chủ đích.</span>
              <span>Dùng theo cách của bạn.</span>
            </div>
          </div>
          <div className="hero-art">
            <img
              src="/images/hero-audio.png"
              alt="Tai nghe bạc trong không gian studio đất nung — hình biên tập"
              fetchPriority="high"
              width="1536"
              height="1024"
            />
            <div className="hero-art-top">
              <span>OBJECTS FOR A BETTER EVERYDAY</span>
              <Icon name="arrow-up" size={23} />
            </div>
            <span className="hero-art-label">
              Một chút yên tĩnh.
              <br />
              <strong>Nhiều hơn cảm hứng.</strong>
            </span>
            <span className="hero-art-index">01 — AUDIO</span>
          </div>
        </section>
      )}

      <section
        className="container category-strip"
        aria-label="Duyệt theo danh mục"
      >
        <div className="category-intro">
          <span className="eyebrow">TÌM THEO</span>
          <strong>Điều bạn cần.</strong>
        </div>
        <div className="category-list">
          <button
            className={`category-item ${!categoryId ? 'selected' : ''}`}
            onClick={() => update('category', '')}
          >
            <span>
              <Icon name="grid" size={25} />
            </span>
            Tất cả
          </button>
          {categories.data?.slice(0, 7).map((item) => (
            <button
              key={item.id}
              className={`category-item ${categoryId === item.id ? 'selected' : ''}`}
              onClick={() => update('category', item.id)}
            >
              <span>
                <Icon name={categoryIcon(item.name)} size={25} />
              </span>
              {item.name}
            </button>
          ))}
          {categories.isLoading &&
            Array.from({ length: 5 }, (_, i) => (
              <div className="category-skeleton skeleton" key={i} />
            ))}
        </div>
      </section>

      <section
        className="container catalog-section"
        id="products"
        aria-labelledby="catalog-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURATED FOR YOUR EVERYDAY</span>
            <h2 id="catalog-heading">
              {keyword
                ? `Kết quả cho “${keyword}”`
                : (category?.name ?? 'Gặp món đồ tiếp theo của bạn')}
              <span className="accent-period">.</span>
            </h2>
          </div>
          {data && (
            <span className="result-count" aria-live="polite">
              {products.isPlaceholderData
                ? 'Đang cập nhật lựa chọn…'
                : `${data.totalElements} lựa chọn đang chờ bạn`}
            </span>
          )}
        </div>
        <div className="catalog-toolbar">
          <div className="catalog-tabs">
            <button
              className={
                sort === 'CREATED_AT:DESC' && !categoryId ? 'active' : ''
              }
              onClick={() => {
                setParams(keyword ? { q: keyword } : {}, {
                  preventScrollReset: true,
                });
              }}
            >
              Mới lên kệ
            </button>
            <button
              className={categoryId ? 'active' : ''}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              Theo danh mục <Icon name="down" size={13} />
            </button>
            <Link to="/saved">
              Đã lưu <Icon name="heart" size={13} />
            </Link>
          </div>
          <div className="sort-control">
            <button
              className={`filter-button ${filterOpen ? 'selected' : ''}`}
              aria-expanded={filterOpen}
              aria-controls="catalog-filters"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Icon name="sliders" size={16} /> Bộ lọc
            </button>
            <label>
              <span className="sr-only">Sắp xếp sản phẩm</span>
              <select
                value={sort}
                onChange={(e) => update('sort', e.target.value)}
              >
                <option value="CREATED_AT:DESC">Mới nhất</option>
                <option value="CREATED_AT:ASC">Cũ nhất</option>
                <option value="NAME:ASC">Tên A – Z</option>
                <option value="NAME:DESC">Tên Z – A</option>
              </select>
            </label>
          </div>
        </div>
        {filterOpen && (
          <div className="filter-panel" id="catalog-filters">
            <label htmlFor="category-filter">Danh mục sản phẩm</label>
            <select
              id="category-filter"
              className="select"
              value={categoryId}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {categories.isError && (
              <span className="field-error">
                Không tải được danh mục.{' '}
                <button
                  className="text-button"
                  onClick={() => void categories.refetch()}
                >
                  Thử lại
                </button>
              </span>
            )}
            <button
              className="text-button"
              onClick={() => {
                setParams({}, { preventScrollReset: true });
                setFilterOpen(false);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
        {filtered && (
          <div className="active-filters">
            {keyword && (
              <button onClick={() => update('q', '')}>
                Tìm: {keyword}
                <Icon name="close" size={13} />
              </button>
            )}
            {categoryId && (
              <button onClick={() => update('category', '')}>
                {category?.name ?? 'Danh mục đã chọn'}
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
        )}
        {products.isLoading ? (
          <div
            className="product-grid"
            aria-label="Đang tải sản phẩm"
            role="status"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div className="product-skeleton" key={i}>
                <div className="skeleton" />
                <span className="skeleton" />
                <span className="skeleton" />
              </div>
            ))}
          </div>
        ) : products.isError ? (
          <ErrorBox
            message="Kết nối tới cửa hàng đang gián đoạn. Bạn có thể thử tải lại sau ít phút."
            retry={() => void products.refetch()}
          />
        ) : !data?.content.length ? (
          <EmptyState
            icon="search"
            title="Chưa tìm thấy món đồ phù hợp"
            description="Thử một từ khóa khác hoặc xem tất cả sản phẩm của cửa hàng."
          >
            <button className="btn btn-dark" onClick={() => setParams({})}>
              Xem tất cả sản phẩm <Icon name="arrow" size={16} />
            </button>
          </EmptyState>
        ) : (
          <>
            <div
              className={`product-grid ${products.isPlaceholderData ? 'is-updating' : ''}`}
              aria-busy={products.isFetching}
            >
              {data.content.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <nav className="pagination" aria-label="Phân trang">
                <span>
                  Đang xem {data.page * data.size + 1}–
                  {Math.min((data.page + 1) * data.size, data.totalElements)} /{' '}
                  {data.totalElements} sản phẩm
                </span>
                <div className="row">
                  <button
                    className="page-button"
                    aria-label="Trang trước"
                    disabled={data.first || products.isPlaceholderData}
                    onClick={() => update('page', String(page - 1))}
                  >
                    <Icon
                      name="arrow"
                      style={{ transform: 'rotate(180deg)' }}
                      size={17}
                    />
                  </button>
                  <span>
                    Trang {data.page + 1} / {data.totalPages}
                  </span>
                  <button
                    className="page-button"
                    aria-label="Trang sau"
                    disabled={data.last || products.isPlaceholderData}
                    onClick={() => update('page', String(page + 1))}
                  >
                    <Icon name="arrow" size={17} />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
      {!filtered && (
        <section className="container collections-section" id="collections">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A LITTLE INSPIRATION</span>
              <h2>
                Cho từng nhịp sống<span className="accent-period">.</span>
              </h2>
            </div>
            <span className="muted section-caption">
              Có những thứ nhỏ, làm nên một ngày tốt hơn.
            </span>
          </div>
          <div className="collection-grid">
            <Link
              to="/?q=laptop#products"
              className="collection-card collection-desk"
            >
              <img
                src="/images/desk-editorial.jpg"
                alt="Góc làm việc sáng thoáng với máy tính và thiết bị tối giản"
                loading="lazy"
              />
              <div>
                <span className="eyebrow">01 / WORK BETTER</span>
                <h3>
                  Một góc riêng.
                  <br />
                  Vạn ý tưởng.
                </h3>
                <span className="collection-cta">
                  Cho góc làm việc <Icon name="arrow" />
                </span>
              </div>
            </Link>
            <Link
              to="/?q=tai+nghe#products"
              className="collection-card collection-audio"
            >
              <img
                src="/images/audio-editorial.png"
                alt="Tai nghe chụp tai màu đen — hình minh họa bộ sưu tập âm thanh"
                loading="lazy"
              />
              <div>
                <span className="eyebrow">02 / FEEL MORE</span>
                <h3>
                  Bật âm nhạc.
                  <br />
                  Tắt ồn ào.
                </h3>
                <span className="collection-cta">
                  Thế giới âm thanh <Icon name="arrow" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}
      <div className="container values-strip">
        <span>
          <Icon name="shield" size={22} />
          <strong>Mua sắm có tài khoản</strong>
          <small>Quản lý lựa chọn của riêng bạn</small>
        </span>
        <span>
          <Icon name="box" size={22} />
          <strong>Chọn đúng phiên bản</strong>
          <small>Thông tin sản phẩm rõ ràng</small>
        </span>
        <span>
          <Icon name="check" size={22} />
          <strong>Giá trước khi đặt hàng</strong>
          <small>Kiểm tra đầy đủ tổng thanh toán</small>
        </span>
      </div>
    </>
  );
}
