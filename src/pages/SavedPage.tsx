import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useSaved } from '@/lib/saved';
import { catalogApi } from '@/api/catalog';
import { Breadcrumbs, EmptyState, Spinner } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { Icon } from '@/components/Icon';

export function SavedPage() {
  const { saved, toggle } = useSaved();
  const products = useQueries({
    queries: saved.map((id) => ({
      queryKey: ['product', id],
      queryFn: () => catalogApi.product(id),
      retry: false,
    })),
  });
  return (
    <div className="container inner-page">
      <Breadcrumbs items={[{ label: 'Sản phẩm đã lưu' }]} />
      <div className="page-heading">
        <span className="eyebrow">YOUR PERSONAL EDIT</span>
        <h1>
          Để dành một chút yêu thích<span className="accent-period">.</span>
        </h1>
        <p>Các lựa chọn được lưu trên trình duyệt này, để bạn dễ tìm lại.</p>
      </div>
      {!saved.length ? (
        <EmptyState
          icon="heart"
          title="Danh sách đang chờ món đồ đầu tiên"
          description="Chạm vào trái tim trên sản phẩm bạn thích. Mình sẽ giữ ở đây cho bạn."
        >
          <Link to="/#products" className="btn btn-dark">
            Tìm điều bạn thích <Icon name="arrow" size={17} />
          </Link>
        </EmptyState>
      ) : products.some((item) => item.isLoading) ? (
        <Spinner />
      ) : (
        <div className="product-grid">
          {products.map((item, i) =>
            item.data ? (
              <ProductCard key={saved[i]} product={item.data} />
            ) : (
              <div key={saved[i]} className="unavailable-product">
                <Icon name="box" size={28} />
                <p>Sản phẩm hiện không khả dụng.</p>
                <button
                  className="text-button"
                  onClick={() => toggle(saved[i])}
                >
                  Bỏ lưu
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
