import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { Breadcrumbs, EmptyState, ErrorBox } from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { ListingFilters } from '@/components/catalog/ListingFilters';
import { ListingProductCard } from '@/components/catalog/ListingProductCard';
import {
  LISTING_MAX_PAGE,
  LISTING_PAGE_SIZE,
  LISTING_SORTS,
  listingPageItems,
  patchListingParams,
  readListingState,
  type ListingSort,
  type ListingState,
} from '@/lib/catalogListing';
import { useSaved } from '@/lib/saved';
import type {
  CatalogSortDirection,
  ProductSortField,
  StorefrontProductResponse,
} from '@/lib/types';
import '@/styles/product-listing.css';

export default function ProductListingPage() {
  const [params, setParams] = useSearchParams();
  const state = readListingState(params);
  const { keyword, categoryId, sort, page, view } = state;
  const [sortBy, direction] = sort.split(':') as [
    ProductSortField,
    CatalogSortDirection,
  ];
  const [searchDraft, setSearchDraft] = useState(keyword);
  const [filterDraft, setFilterDraft] = useState({ keyword, categoryId });
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const paginationFocus = useRef(false);
  const { saved, toggle } = useSaved();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.categories,
  });
  const products = useQuery({
    queryKey: ['products', keyword, categoryId, sortBy, direction, page],
    queryFn: ({ signal }) =>
      catalogApi.searchProducts(
        {
          keyword: keyword || undefined,
          categoryId: categoryId || undefined,
          sortBy,
          direction,
          page,
          size: LISTING_PAGE_SIZE,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
  const data = products.data;
  const allCategories = categories.data ?? [];
  const category = allCategories.find((item) => item.id === categoryId);
  const categoryName = category?.name ?? 'Danh mục đang chọn';
  const filterCount = Number(Boolean(keyword)) + Number(Boolean(categoryId));
  const pending = products.isFetching;
  const currentData = data && !products.isPlaceholderData && !products.isError;
  const firstItem =
    currentData && data.content.length ? page * LISTING_PAGE_SIZE + 1 : 0;
  const lastItem = currentData
    ? page * LISTING_PAGE_SIZE + data.content.length
    : 0;
  const beyondLastPage = Boolean(
    currentData && !data.content.length && data.totalElements > 0,
  );

  // This draft intentionally differs from the URL until the search form is submitted.
  useEffect(() => {
    setSearchDraft(keyword);
  }, [keyword]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Sản phẩm | Aydibro — Shop UI';
    return () => {
      document.title = previousTitle;
    };
  }, []);
  useEffect(() => {
    if (!filterOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filterOpen]);
  useEffect(() => {
    if (!paginationFocus.current) return;
    paginationFocus.current = false;
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [page]);
  useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  function update(patch: Partial<ListingState>) {
    setParams((previous) => patchListingParams(previous, patch), {
      preventScrollReset: true,
    });
  }
  function resetFilters() {
    update({ keyword: '', categoryId: '' });
  }
  function goToPage(next: number) {
    if (next === page) return;
    paginationFocus.current = true;
    update({ page: next });
  }
  function openFilters() {
    setFilterDraft({ keyword, categoryId });
    setFilterOpen(true);
    dialog.current?.showModal();
  }
  function closeFilters() {
    dialog.current?.close();
    setFilterOpen(false);
  }
  function toggleSaved(product: StorefrontProductResponse) {
    const wasSaved = saved.includes(product.id);
    toggle(product.id);
    setSavedMessage(`${wasSaved ? 'Đã bỏ lưu' : 'Đã lưu'} ${product.name}.`);
  }

  const filterProps = {
    categories: allCategories,
    loading: categories.isLoading,
    error: categories.isError,
    onRetry: () => {
      void categories.refetch();
    },
  };

  return (
    <div className="plp-page">
      <section className="container plp-intro" aria-labelledby="plp-title">
        <Breadcrumbs items={[{ label: 'Cửa hàng' }]} />
        <div className="plp-hero">
          <div className="plp-hero-copy">
            <p className="plp-kicker">
              <span /> THE CONSIDERED EDIT
            </p>
            <h1 id="plp-title">
              Cho mỗi ngày,
              <br />
              <em>đáng tận hưởng.</em>
            </h1>
            <p>
              Những món đồ công nghệ cho công việc, khoảng nghỉ và những điều
              bạn yêu thích. Chọn vừa đủ, dùng thật lâu.
            </p>
            <a className="plp-hero-link" href="#listing-results">
              Khám phá sản phẩm{' '}
              <span>
                <Icon name="arrow" size={19} />
              </span>
            </a>
          </div>
          <figure className="plp-editorial">
            <div className="plp-editorial-image">
              <img
                src="/images/hero-audio.png"
                alt="Ảnh biên tập: tai nghe bạc trên khối đá đất nung"
                width="1536"
                height="1024"
                decoding="async"
              />
              <span className="plp-image-index" aria-hidden="true">
                01 / EVERYDAY OBJECTS
              </span>
            </div>
            <figcaption>
              <span>Một chút yên tĩnh. Nhiều hơn cảm hứng.</span>
              <span>AYDIBRO EDIT</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className="container plp-shop"
        id="listing-results"
        aria-label="Danh sách sản phẩm và bộ lọc"
      >
        <aside className="plp-sidebar" aria-label="Bộ lọc sản phẩm">
          <div className="plp-sidebar-title">
            <h2>
              <Icon name="sliders" size={18} />
              Bộ lọc
            </h2>
            {filterCount > 0 && (
              <button type="button" onClick={resetFilters}>
                Xóa lọc
              </button>
            )}
          </div>
          <ListingFilters
            {...filterProps}
            categoryId={categoryId}
            onCategory={(id) => update({ categoryId: id })}
            prefix="desktop"
          />
          <div className="plp-sidebar-note">
            <p className="plp-kicker">A LITTLE REMINDER</p>
            <h3>Để dành điều bạn thích.</h3>
            <p>
              Lưu những món hợp gu để dễ tìm lại. Danh sách được giữ trên thiết
              bị này.
            </p>
            <Link to="/saved">
              Xem món đã lưu <Icon name="arrow" size={16} />
            </Link>
          </div>
          <p className="plp-sidebar-footnote">
            <Icon name="info" size={16} />
            Chọn sản phẩm để xem ảnh, giá và các phiên bản trước khi thêm vào
            giỏ.
          </p>
        </aside>

        <div className="plp-results">
          <div className="plp-results-title">
            <div>
              <p className="plp-kicker">THE COLLECTION</p>
              <h2 ref={resultsHeading} tabIndex={-1}>
                {keyword
                  ? `Kết quả cho “${keyword}”`
                  : categoryId
                    ? categoryName
                    : 'Tất cả sản phẩm'}
                {currentData && (
                  <span className="plp-total">{data.totalElements}</span>
                )}
              </h2>
              <p className="plp-range">
                {pending ? (
                  <>
                    <span className="plp-busy" />
                    Đang cập nhật…
                  </>
                ) : currentData ? (
                  data.content.length ? (
                    <>
                      <strong>
                        {firstItem}–{lastItem}
                      </strong>{' '}
                      trên {data.totalElements} sản phẩm
                    </>
                  ) : (
                    'Chưa có sản phẩm phù hợp'
                  )
                ) : (
                  'Danh sách sản phẩm'
                )}
              </p>
            </div>
            <Link to="/saved" className="plp-saved-link">
              <Icon name="heart" size={17} />
              Đã lưu <span>{saved.length}</span>
            </Link>
          </div>

          <div className="plp-controls">
            <form
              className="plp-search"
              role="search"
              aria-label="Tìm trong cửa hàng"
              onSubmit={(event) => {
                event.preventDefault();
                update({ keyword: searchDraft.trim().slice(0, 100) });
              }}
            >
              <label htmlFor="listing-search" className="sr-only">
                Tìm tên sản phẩm hoặc từ khóa
              </label>
              <Icon name="search" size={20} />
              <input
                id="listing-search"
                type="search"
                placeholder="Tìm một điều bạn thích…"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                maxLength={100}
                enterKeyHint="search"
              />
              <button type="submit">
                Tìm kiếm
                <Icon name="arrow" size={17} />
              </button>
            </form>

            <div className="plp-toolbar">
              <button
                className="plp-open-filters"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                aria-controls="listing-filter-dialog"
                onClick={openFilters}
              >
                <Icon name="sliders" size={18} />
                Bộ lọc{filterCount > 0 && <span>{filterCount}</span>}
              </button>
              <div className="plp-toolbar-options">
                <label className="plp-sort">
                  <span>Sắp xếp:</span>
                  <select
                    aria-label="Sắp xếp danh sách sản phẩm"
                    value={sort}
                    onChange={(event) =>
                      update({ sort: event.target.value as ListingSort })
                    }
                  >
                    {LISTING_SORTS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="plp-view"
                  role="group"
                  aria-label="Kiểu hiển thị sản phẩm"
                >
                  <button
                    type="button"
                    aria-label="Hiển thị dạng lưới"
                    aria-pressed={view === 'grid'}
                    onClick={() => update({ view: 'grid' })}
                  >
                    <Icon name="grid" size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Hiển thị dạng danh sách"
                    aria-pressed={view === 'list'}
                    onClick={() => update({ view: 'list' })}
                  >
                    <Icon name="list" size={19} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {filterCount > 0 && (
            <div
              className="plp-active-filters"
              aria-label="Bộ lọc đang áp dụng"
            >
              {categoryId && (
                <button
                  type="button"
                  onClick={() => update({ categoryId: '' })}
                  aria-label={`Bỏ lọc danh mục ${categoryName}`}
                >
                  <span>{categoryName}</span>
                  <Icon name="close" size={14} />
                </button>
              )}
              {keyword && (
                <button
                  type="button"
                  onClick={() => update({ keyword: '' })}
                  aria-label={`Bỏ từ khóa ${keyword}`}
                >
                  <span>“{keyword}”</span>
                  <Icon name="close" size={14} />
                </button>
              )}
              <button
                type="button"
                className="plp-reset"
                onClick={resetFilters}
              >
                Xóa tất cả
              </button>
            </div>
          )}

          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {pending
              ? 'Đang tải danh sách sản phẩm.'
              : products.isError
                ? 'Không tải được sản phẩm. Bạn có thể thử lại.'
                : currentData
                  ? `${data.totalElements} sản phẩm phù hợp. ${firstItem ? `Đang hiển thị từ ${firstItem} đến ${lastItem}.` : 'Trang hiện tại không có sản phẩm.'}`
                  : ''}
          </p>

          <div className="plp-product-area" aria-busy={pending}>
            {products.isLoading && (
              <div
                className={`plp-product-grid plp-skeletons plp-${view}`}
                aria-hidden="true"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <div className="plp-card-skeleton" key={index}>
                    <div />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            )}
            {products.isError && (
              <ErrorBox
                message="Kết nối tới cửa hàng đang gián đoạn. Lựa chọn của bạn vẫn được giữ nguyên; hãy thử tải lại."
                retry={() => {
                  void products.refetch();
                }}
              />
            )}
            {!products.isError && data && data.content.length > 0 && (
              <ul
                className={`plp-product-grid plp-${view} ${products.isPlaceholderData ? 'plp-refreshing' : ''}`}
                aria-label="Sản phẩm"
              >
                {data.content.map((product) => (
                  <ListingProductCard
                    product={product}
                    saved={saved.includes(product.id)}
                    onToggle={toggleSaved}
                    key={product.id}
                  />
                ))}
              </ul>
            )}
            {currentData && !data.content.length && (
              <EmptyState
                icon="search"
                title={
                  beyondLastPage
                    ? 'Bạn đã đi quá trang cuối'
                    : filterCount
                      ? 'Chưa tìm thấy món phù hợp'
                      : 'Bộ sưu tập đang được chuẩn bị'
                }
                description={
                  beyondLastPage
                    ? 'Quay lại trang đầu để tiếp tục khám phá với bộ lọc hiện tại.'
                    : filterCount
                      ? 'Thử một từ khóa ngắn hơn hoặc bỏ bớt bộ lọc để xem thêm lựa chọn.'
                      : 'Sản phẩm sẽ xuất hiện tại đây khi được cửa hàng công bố. Bạn có thể tải lại sau.'
                }
              >
                <button
                  className="plp-button"
                  type="button"
                  onClick={
                    beyondLastPage
                      ? () => goToPage(0)
                      : filterCount
                        ? resetFilters
                        : () => {
                            void products.refetch();
                          }
                  }
                >
                  {beyondLastPage
                    ? 'Về trang đầu'
                    : filterCount
                      ? 'Xem tất cả sản phẩm'
                      : 'Tải lại danh sách'}
                  <Icon name="arrow" size={18} />
                </button>
              </EmptyState>
            )}
          </div>

          {currentData && data.content.length > 0 && (
            <div className="plp-bottom">
              <p>
                Bạn đang xem{' '}
                <strong>
                  {firstItem}–{lastItem}
                </strong>{' '}
                trong {data.totalElements} sản phẩm.
              </p>
              {data.totalPages > 1 && (
                <nav
                  className="plp-pagination"
                  aria-label="Phân trang sản phẩm"
                >
                  <button
                    type="button"
                    disabled={data.first || products.isPlaceholderData}
                    aria-label="Trang sản phẩm trước"
                    onClick={() => goToPage(page - 1)}
                  >
                    <Icon name="chevron" className="plp-previous" size={17} />
                  </button>
                  {listingPageItems(page, data.totalPages).map((item, index) =>
                    item === 'gap' ? (
                      <span key={`gap-${index}`} aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={item}
                        aria-label={`Trang sản phẩm ${item + 1}`}
                        aria-current={page === item ? 'page' : undefined}
                        disabled={products.isPlaceholderData}
                        onClick={() => goToPage(item)}
                      >
                        {item + 1}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={
                      data.last ||
                      page >= LISTING_MAX_PAGE ||
                      products.isPlaceholderData
                    }
                    aria-label="Trang sản phẩm tiếp theo"
                    onClick={() => goToPage(page + 1)}
                  >
                    <Icon name="chevron" size={17} />
                  </button>
                </nav>
              )}
            </div>
          )}
          <div className="plp-endnote">
            <Icon name="check" size={17} />
            <p>
              Giá theo từng phiên bản. Bạn luôn được xem lại báo giá trước khi
              đặt hàng.
            </p>
          </div>
        </div>
      </section>

      <dialog
        ref={dialog}
        id="listing-filter-dialog"
        className="plp-filter-dialog"
        aria-labelledby="listing-filter-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeFilters();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeFilters();
        }}
        onClose={() => {
          // A queued close from the last opening must not dismiss a reopened dialog.
          if (!dialog.current?.open) setFilterOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeFilters();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update({
              keyword: filterDraft.keyword.trim().slice(0, 100),
              categoryId: filterDraft.categoryId,
            });
            closeFilters();
          }}
        >
          <div className="plp-dialog-heading">
            <div>
              <p className="plp-kicker">MAKE IT YOURS</p>
              <h2 id="listing-filter-title">Lọc sản phẩm</h2>
            </div>
            <button
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={closeFilters}
            >
              <Icon name="close" size={22} />
            </button>
          </div>
          <p className="plp-dialog-description">
            Chọn điều bạn cần. Chỉ áp dụng khi bạn xác nhận.
          </p>
          <label className="plp-draft-label" htmlFor="listing-mobile-keyword">
            Từ khóa
          </label>
          <input
            id="listing-mobile-keyword"
            className="plp-draft-input"
            type="search"
            value={filterDraft.keyword}
            maxLength={100}
            placeholder="Tên sản phẩm…"
            onChange={(event) =>
              setFilterDraft((previous) => ({
                ...previous,
                keyword: event.target.value,
              }))
            }
          />
          <ListingFilters
            {...filterProps}
            prefix="mobile"
            categoryId={filterDraft.categoryId}
            onCategory={(id) =>
              setFilterDraft((previous) => ({ ...previous, categoryId: id }))
            }
          />
          <div className="plp-dialog-actions">
            <button
              type="button"
              className="plp-clear-draft"
              onClick={() => setFilterDraft({ keyword: '', categoryId: '' })}
            >
              Xóa lựa chọn
            </button>
            <button type="submit" className="plp-button">
              Áp dụng bộ lọc
              <Icon name="check" size={18} />
            </button>
          </div>
        </form>
      </dialog>
      <div
        className="plp-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {savedMessage && (
          <p>
            <Icon name="check" size={18} />
            <span>{savedMessage}</span>
            <Link to="/saved">Xem</Link>
          </p>
        )}
      </div>
    </div>
  );
}
