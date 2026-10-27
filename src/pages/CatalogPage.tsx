import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState, ErrorBox } from '@/components/Layout';
import { Icon } from '@/components/Icon';
import { RetailHero } from '@/components/RetailHero';
import { categoryLabel } from '@/components/catalog/presentation';

export function CatalogPage() {
  const [params] = useSearchParams();
  const legacySearch = ['q', 'category', 'sort', 'page', 'view'].some((key) =>
    params.has(key),
  );
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.categories,
  });
  const products = useQuery({
    queryKey: ['home-products', 'CREATED_AT', 'DESC', 8],
    queryFn: ({ signal }) =>
      catalogApi.searchProducts(
        { sortBy: 'CREATED_AT', direction: 'DESC', page: 0, size: 8 },
        signal,
      ),
    enabled: !legacySearch,
  });
  // Preserve old bookmarks while keeping collection controls on one canonical page.
  if (legacySearch)
    return <Navigate to={`/products?${params.toString()}`} replace />;
  const allCategories = categories.data ?? [];
  const categoryHref = (index: number) =>
    allCategories[index]
      ? `/products?category=${allCategories[index].id}`
      : '/products';

  return (
    <>
      <RetailHero />
      <nav className="collection-shortcuts" aria-label="Duyệt theo danh mục">
        <Link to="/products">
          <span>Khám phá tất cả</span>
          <Icon name="arrow-up" size={19} />
        </Link>
        {allCategories.slice(0, 3).map((category) => (
          <Link key={category.id} to={`/products?category=${category.id}`}>
            <span>{categoryLabel(category.name)}</span>
            <Icon name="arrow-up" size={19} />
          </Link>
        ))}
      </nav>

      <section
        className="container catalog-section"
        id="products"
        aria-labelledby="catalog-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / THE SOUND SELECTION</p>
            <h2 id="catalog-heading">Tìm thấy nhịp của bạn.</h2>
          </div>
          <Link to="/products" className="editorial-link">
            Xem tất cả sản phẩm <Icon name="arrow-up" size={17} />
          </Link>
        </div>
        {products.isLoading ? (
          <div
            className="product-grid"
            aria-label="Đang tải sản phẩm"
            role="status"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <div className="product-skeleton" key={index}>
                <div className="skeleton" />
                <span className="skeleton" />
                <span className="skeleton" />
              </div>
            ))}
          </div>
        ) : products.isError ? (
          <ErrorBox
            message="Chưa kết nối được với cửa hàng. Bạn vui lòng thử lại sau ít phút."
            retry={() => void products.refetch()}
          />
        ) : !products.data?.content.length ? (
          <EmptyState
            icon="box"
            title="Bộ sưu tập đang được chuẩn bị"
            description="Những sản phẩm mới sẽ xuất hiện tại đây khi cửa hàng mở bán."
          />
        ) : (
          <div className="product-grid">
            {products.data.content.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
        <div className="collection-browse">
          <Link to="/products" className="btn btn-dark">
            Khám phá toàn bộ <Icon name="arrow-up" size={17} />
          </Link>
        </div>
      </section>

      <section
        className="editorial-collections"
        id="collections"
        aria-label="Không gian cảm hứng"
      >
        <Link
          to={categoryHref(0)}
          className="editorial-collection editorial-collection--still"
        >
          <img
            src="/images/audio-still-life-v1.webp"
            alt="Ảnh biên tập tai nghe bạc, minh họa bộ sưu tập âm thanh"
            loading="lazy"
            width="1536"
            height="1024"
          />
          <div>
            <p className="eyebrow">02 / LISTEN CLOSELY</p>
            <h2>
              Một thế giới.
              <br />
              Chỉ riêng bạn.
            </h2>
            <span className="editorial-link">
              {allCategories[0]
                ? `Khám phá ${categoryLabel(allCategories[0].name).toLocaleLowerCase('vi')}`
                : 'Khám phá bộ sưu tập'}{' '}
              <Icon name="arrow-up" size={18} />
            </span>
          </div>
        </Link>
        <Link
          to={categoryHref(1)}
          className="editorial-collection editorial-collection--lifestyle"
        >
          <img
            src="/images/everyday-listening.webp"
            alt="Ảnh biên tập một khoảng nghỉ nghe nhạc ngoài trời"
            loading="lazy"
            width="1536"
            height="1024"
          />
          <div>
            <p className="eyebrow">03 / TAKE YOUR TIME</p>
            <h2>
              Chậm một nhịp.
              <br />
              Nghe nhiều hơn.
            </h2>
            <span className="editorial-link">
              {allCategories[1]
                ? `Khám phá ${categoryLabel(allCategories[1].name).toLocaleLowerCase('vi')}`
                : 'Tìm chiếc tai nghe của bạn'}{' '}
              <Icon name="arrow-up" size={18} />
            </span>
          </div>
        </Link>
      </section>

      <section
        className="container brand-editorial"
        aria-labelledby="brand-heading"
      >
        <p className="eyebrow">THE AYDIBRO WAY</p>
        <h2 id="brand-heading">
          Âm thanh đi cùng
          <br />
          những điều thường ngày.
        </h2>
        <div>
          <p>
            Chuyến xe đầu ngày. Một giờ tập trung. Hay bản nhạc nghe mãi vẫn
            thích. Mỗi khoảnh khắc đều có một âm thanh của riêng nó.
          </p>
          <p>
            Tìm chiếc tai nghe hợp với bạn, chọn phiên bản yêu thích và để âm
            nhạc làm phần còn lại.
          </p>
          <Link to="/products" className="editorial-link">
            Tìm chất riêng của bạn <Icon name="arrow-up" size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
