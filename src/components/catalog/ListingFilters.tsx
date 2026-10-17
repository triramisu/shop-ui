import type { StorefrontCategoryResponse } from '@/lib/types';
import { Icon } from '@/components/Icon';

export function ListingFilters({
  categories,
  categoryId,
  onCategory,
  prefix,
  loading,
  error,
  onRetry,
}: {
  categories: StorefrontCategoryResponse[];
  categoryId: string;
  onCategory: (id: string) => void;
  prefix: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <fieldset className="plp-filter-group">
      <legend>Danh mục sản phẩm</legend>
      <label className={`plp-radio ${!categoryId ? 'is-selected' : ''}`}>
        <input
          type="radio"
          name={`${prefix}-category`}
          value=""
          checked={!categoryId}
          onChange={() => onCategory('')}
        />
        <span>Tất cả sản phẩm</span>
        <Icon name="grid" size={17} />
      </label>
      {categories.map((category) => (
        <label
          className={`plp-radio ${categoryId === category.id ? 'is-selected' : ''}`}
          key={category.id}
        >
          <input
            type="radio"
            name={`${prefix}-category`}
            value={category.id}
            checked={categoryId === category.id}
            onChange={() => onCategory(category.id)}
          />
          <span>{category.name}</span>
        </label>
      ))}
      {!!categoryId &&
        !categories.some((category) => category.id === categoryId) &&
        !loading &&
        !error && (
          <label className="plp-radio is-selected">
            <input type="radio" name={`${prefix}-category`} checked readOnly />
            <span>Danh mục đang chọn</span>
          </label>
        )}
      {loading && (
        <p className="plp-filter-hint" role="status">
          Đang tải danh mục…
        </p>
      )}
      {error && (
        <div className="plp-category-error" role="alert">
          <p>Chưa tải được danh mục.</p>
          <button type="button" onClick={onRetry}>
            <Icon name="refresh" size={15} />
            Thử lại
          </button>
        </div>
      )}
    </fieldset>
  );
}
