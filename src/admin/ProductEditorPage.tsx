import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { adminApi } from './api';
import type {
  AdminProduct,
  AdminVariant,
  ProductInput,
  VariantInput,
} from './types';
import {
  pricePattern,
  skuPattern,
  slugPattern,
  validateImages,
  formatAdminPrice,
} from './validation';
import { useAdminAccess } from './useAdminAccess';
import {
  AdminHeader,
  AdminError,
  AdminLoading,
  AdminNotice,
  Badge,
  ConfirmAction,
  Empty,
  useAdminKey,
  useAdminMutation,
} from './shared';

function metadataSignature(product: AdminProduct) {
  return JSON.stringify([
    product.name,
    product.slug,
    product.description ?? '',
    product.category.id,
  ]);
}
function ProductForm({ product }: { product?: AdminProduct }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(product?.version ?? 0);
  const baseline = useRef(product ? metadataSignature(product) : '');
  useEffect(() => {
    // SKU-only changes may advance the parent version without changing this form's data.
    // A concurrent change to any metadata field keeps the old version and yields 409.
    if (product && baseline.current === metadataSignature(product))
      setVersion(product.version);
  }, [product]);
  const categories = useQuery({
    queryKey: useAdminKey('categories'),
    queryFn: ({ signal }) => adminApi.categories(signal),
    retry: false,
  });
  const save = useAdminMutation(
    (body: ProductInput) =>
      product
        ? adminApi.updateProduct(product.id, { ...body, version })
        : adminApi.createProduct(body),
    (result) => {
      baseline.current = metadataSignature(result);
      setVersion(result.version);
      if (!product) navigate(`/admin/products/${result.id}`, { replace: true });
    },
  );
  return (
    <section className="admin-panel admin-form-panel">
      <div className="admin-section-heading">
        <div>
          <span className="admin-eyebrow">01 / THÔNG TIN</span>
          <h2>{product ? 'Thông tin sản phẩm' : 'Tạo một bản nháp'}</h2>
        </div>
      </div>
      <AdminNotice error={save.error} message={save.message} />
      {categories.isPending ? (
        <AdminLoading />
      ) : categories.isError ? (
        <AdminError retry={() => void categories.refetch()} />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (save.busy) return;
            const data = new FormData(e.currentTarget);
            save.mutate({
              name: String(data.get('name')).trim(),
              slug: String(data.get('slug')).trim(),
              categoryId: String(data.get('categoryId')),
              description: String(data.get('description') ?? '').trim(),
            });
          }}
        >
          <div className="admin-form-grid">
            <label className="admin-field">
              Tên sản phẩm
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={product?.name}
              />
            </label>
            <label className="admin-field">
              Danh mục
              <select
                name="categoryId"
                required
                defaultValue={product?.category.id ?? ''}
              >
                <option value="" disabled>
                  Chọn danh mục
                </option>
                {categories.data.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={
                      item.status !== 'ACTIVE' &&
                      item.id !== product?.category.id
                    }
                  >
                    {item.name}
                    {item.status !== 'ACTIVE' ? ' (Tạm ngưng)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="admin-field">
            Đường dẫn
            <input
              name="slug"
              required
              pattern={slugPattern}
              maxLength={220}
              defaultValue={product?.slug}
              placeholder="tai-nghe-journey"
            />
            <small>
              Chữ không dấu, số và dấu gạch ngang. Đường dẫn phải duy nhất.
            </small>
          </label>
          <label className="admin-field">
            Mô tả
            <textarea
              name="description"
              rows={5}
              maxLength={5000}
              defaultValue={product?.description}
            />
          </label>
          <div className="admin-form-actions">
            <button
              className="admin-button"
              disabled={save.busy || !categories.data.length}
            >
              {save.isPending
                ? 'Đang lưu…'
                : product
                  ? 'Lưu thông tin'
                  : 'Tạo bản nháp'}
              <Icon name="arrow" size={17} />
            </button>
            <small className="admin-muted">
              {product
                ? `Bản đang chỉnh: v${version}`
                : 'Chưa xuất hiện trên cửa hàng cho đến khi công bố.'}
            </small>
          </div>
        </form>
      )}
    </section>
  );
}

function VariantsPanel({ product }: { product: AdminProduct }) {
  const { permissions } = useAdminAccess();
  const [editing, setEditing] = useState<AdminVariant | null | undefined>();
  const form = useRef<HTMLFormElement>(null);
  const save = useAdminMutation(
    (body: VariantInput) =>
      editing
        ? adminApi.updateVariant(product.id, editing.id, {
            ...body,
            version: editing.version,
          })
        : adminApi.addVariant(product, body),
    () => {
      setEditing(undefined);
      form.current?.reset();
    },
  );
  const status = useAdminMutation((item: AdminVariant) =>
    adminApi.variantStatus(
      product.id,
      item.id,
      item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      item.version,
    ),
  );
  return (
    <section className="admin-panel admin-form-panel">
      <div className="admin-section-heading">
        <div>
          <span className="admin-eyebrow">02 / PHIÊN BẢN</span>
          <h2>SKU & giá bán</h2>
        </div>
        {permissions.has('CATALOG_WRITE') && product.status !== 'ARCHIVED' && (
          <button
            className="admin-button is-quiet"
            onClick={() => {
              save.reset();
              setEditing(null);
            }}
          >
            <Icon name="plus" size={16} />
            Thêm SKU
          </button>
        )}
      </div>
      <AdminNotice
        error={save.error || status.error}
        message={save.message || status.message}
      />
      {product.variants.length ? (
        <div className="admin-table-wrap">
          <table>
            <caption className="admin-sr-only">Phiên bản của sản phẩm</caption>
            <thead>
              <tr>
                <th>Phiên bản / SKU</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <small className="admin-subline">{item.sku}</small>
                  </td>
                  <td>{formatAdminPrice(item.price, item.currency)}</td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                  <td>
                    {permissions.has('CATALOG_WRITE') &&
                    item.status !== 'ARCHIVED' &&
                    product.status !== 'ARCHIVED' ? (
                      <div className="admin-row-actions">
                        <button
                          className="admin-button is-quiet"
                          disabled={save.busy}
                          onClick={() => {
                            save.reset();
                            setEditing(item);
                          }}
                        >
                          Sửa
                        </button>
                        <ConfirmAction
                          label={
                            item.status === 'ACTIVE' ? 'Tạm ngưng' : 'Kích hoạt'
                          }
                          title="Đổi trạng thái phiên bản?"
                          description={`${item.sku}: ${item.status === 'ACTIVE' ? 'tạm ngưng bán' : 'kích hoạt bán'}. Backend sẽ kiểm tra điều kiện của sản phẩm.`}
                          disabled={status.busy}
                          onConfirm={() => status.mutate(item)}
                        />
                      </div>
                    ) : (
                      <span className="admin-muted">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Chưa có phiên bản">
          <p>Thêm ít nhất một SKU hoạt động trước khi công bố.</p>
        </Empty>
      )}
      {editing !== undefined && permissions.has('CATALOG_WRITE') && (
        <form
          ref={form}
          key={editing?.id ?? 'new'}
          className="admin-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (save.busy) return;
            const data = new FormData(e.currentTarget);
            save.mutate({
              ...(!editing ? { sku: String(data.get('sku')).trim() } : {}),
              name: String(data.get('name')).trim(),
              price: String(data.get('price')).trim(),
              currency: String(data.get('currency')).trim().toUpperCase(),
            });
          }}
        >
          <h3>{editing ? `Sửa ${editing.sku}` : 'Phiên bản mới'}</h3>
          <div className="admin-form-grid">
            {!editing && (
              <label className="admin-field">
                SKU
                <input
                  name="sku"
                  required
                  maxLength={100}
                  pattern={skuPattern}
                  placeholder="JOURNEY-SILVER"
                />
              </label>
            )}
            <label className="admin-field">
              Tên phiên bản
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={editing?.name}
              />
            </label>
            <label className="admin-field">
              Giá bán
              <input
                name="price"
                required
                inputMode="decimal"
                pattern={pricePattern}
                defaultValue={editing?.price}
                placeholder="2190000"
                title="Số không âm, tối đa 17 chữ số phần nguyên và 2 chữ số thập phân"
              />
            </label>
            <label className="admin-field">
              Tiền tệ
              <input
                name="currency"
                required
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                defaultValue={editing?.currency ?? 'VND'}
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="admin-button" disabled={save.busy}>
              {save.isPending ? 'Đang lưu…' : 'Lưu phiên bản'}
            </button>
            <button
              type="button"
              disabled={save.busy}
              className="admin-button is-quiet"
              onClick={() => setEditing(undefined)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
function ImagesPanel({ product }: { product: AdminProduct }) {
  const { permissions } = useAdminAccess();
  const [fileError, setFileError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const images = useQuery({
    queryKey: useAdminKey('images', product.id),
    queryFn: ({ signal }) => adminApi.images(product.id, signal),
    staleTime: 120000,
    retry: false,
  });
  const upload = useAdminMutation(
    (files: File[]) => adminApi.upload(product.id, files),
    () => form.current?.reset(),
  );
  const arrange = useAdminMutation(
    (input: { ids: string[]; primary: string }) =>
      adminApi.arrange(product.id, input.ids, input.primary),
  );
  const remove = useAdminMutation((id: string) =>
    adminApi.removeImage(product.id, id),
  );
  const busy = upload.busy || arrange.busy || remove.busy;
  return (
    <section className="admin-panel admin-form-panel">
      <div className="admin-section-heading">
        <div>
          <span className="admin-eyebrow">03 / HÌNH ẢNH</span>
          <h2>Ảnh của sản phẩm</h2>
        </div>
        <button
          className="admin-button is-quiet"
          disabled={busy}
          onClick={() => {
            upload.reset();
            arrange.reset();
            remove.reset();
            setFileError('');
            void images.refetch();
          }}
        >
          Tải lại ảnh
        </button>
      </div>
      <AdminNotice
        error={upload.error || arrange.error || remove.error || fileError}
        message={upload.message || arrange.message || remove.message}
      />
      {images.isPending ? (
        <AdminLoading />
      ) : images.isError ? (
        <AdminError retry={() => void images.refetch()} />
      ) : (
        <>
          {images.data.length ? (
            <div className="admin-media-grid">
              {images.data.map((item, index) => (
                <figure key={item.id}>
                  <img
                    src={item.url}
                    alt={item.originalFilename || product.name}
                    loading="lazy"
                  />
                  <figcaption>
                    <span>
                      {item.primary
                        ? 'Ảnh đại diện'
                        : `Ảnh ${item.displayOrder + 1}`}
                    </span>
                    {permissions.has('CATALOG_IMAGE_MANAGE') && (
                      <div>
                        {!item.primary && (
                          <button
                            className="admin-button is-quiet"
                            disabled={busy}
                            onClick={() =>
                              arrange.mutate({
                                ids: images.data.map((i) => i.id),
                                primary: item.id,
                              })
                            }
                          >
                            Đặt đại diện
                          </button>
                        )}
                        {(['Lên', 'Xuống'] as const).map((label, direction) => (
                          <button
                            key={label}
                            className="admin-button is-quiet"
                            disabled={
                              busy ||
                              (direction === 0
                                ? index === 0
                                : index === images.data.length - 1)
                            }
                            aria-label={`Đưa ảnh ${index + 1} ${label.toLowerCase()}`}
                            onClick={() => {
                              const ids = images.data.map((i) => i.id);
                              const target = index + (direction === 0 ? -1 : 1);
                              [ids[index], ids[target]] = [
                                ids[target],
                                ids[index],
                              ];
                              arrange.mutate({
                                ids,
                                primary:
                                  images.data.find((i) => i.primary)?.id ??
                                  images.data[0].id,
                              });
                            }}
                          >
                            {label}
                          </button>
                        ))}
                        <ConfirmAction
                          label="Xóa ảnh"
                          title="Xóa ảnh sản phẩm?"
                          description="Ảnh và metadata sẽ bị xóa khỏi sản phẩm/kho lưu trữ. Chỉ xác nhận khi bạn đã giữ bản gốc nếu cần dùng lại."
                          disabled={busy}
                          onConfirm={() => remove.mutate(item.id)}
                        />
                      </div>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có ảnh sản phẩm" />
          )}
          {permissions.has('CATALOG_IMAGE_MANAGE') && (
            <form
              className="admin-upload"
              ref={form}
              onSubmit={(e) => {
                e.preventDefault();
                if (busy) return;
                const files = (
                  new FormData(e.currentTarget).getAll('files') as File[]
                ).filter((file) => file.size > 0);
                const error = validateImages(files);
                setFileError(error ?? '');
                if (!error) upload.mutate(files);
              }}
            >
              <label className="admin-field">
                Thêm ảnh sản phẩm
                <input
                  type="file"
                  name="files"
                  accept="image/png,image/jpeg"
                  required
                  multiple
                  disabled={busy}
                  onChange={() => {
                    setFileError('');
                    upload.reset();
                  }}
                />
                <small>
                  Tối đa 5 ảnh/lượt, 5 MB/ảnh. Giới hạn cuối cùng và nội dung
                  file được server kiểm tra.
                </small>
              </label>
              <button className="admin-button" disabled={busy}>
                {upload.isPending
                  ? 'Đang tải lên…'
                  : 'Tải ảnh lên S3 qua backend'}
                <Icon name="arrow-up" size={16} />
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
export default function ProductEditorPage() {
  const { productId } = useParams();
  const isNew = !productId;
  const { permissions } = useAdminAccess();
  const [formRevision, setFormRevision] = useState(0);
  const product = useQuery({
    queryKey: useAdminKey('product', productId),
    queryFn: ({ signal }) => adminApi.product(productId!, signal),
    enabled: !isNew,
    retry: false,
  });
  const status = useAdminMutation((action: 'publish' | 'hide') =>
    adminApi.productStatus(product.data!, action),
  );
  if (!isNew && product.isPending)
    return <AdminLoading label="Đang mở sản phẩm…" />;
  if (!isNew && (product.isError || !product.data))
    return <AdminError retry={() => void product.refetch()} />;
  const item = product.data;
  return (
    <>
      <Link to="/admin/products" className="admin-back-link">
        ← Danh sách sản phẩm
      </Link>
      <AdminHeader
        eyebrow={isNew ? 'CATALOG / BẢN NHÁP MỚI' : 'CATALOG / CHI TIẾT'}
        title={item?.name ?? 'Một sản phẩm mới.'}
        description={
          isNew
            ? 'Bắt đầu bằng thông tin cơ bản, sau đó thêm SKU và hình ảnh.'
            : 'Chỉnh nội dung, quản lý phiên bản và kiểm tra trước khi công bố.'
        }
      >
        {item && (
          <>
            <Badge status={item.status} />
            <ConfirmAction
              label="Tải bản mới"
              title="Tải lại thông tin sản phẩm?"
              description="Nội dung chưa lưu trong các form sẽ bị bỏ. Dùng bước này khi cần lấy version mới sau xung đột."
              onConfirm={() => {
                void product.refetch().then((result) => {
                  if (result.data && !result.isError)
                    setFormRevision((v) => v + 1);
                });
              }}
            />
          </>
        )}
      </AdminHeader>
      <AdminNotice error={status.error} message={status.message} />
      {item &&
        permissions.has('CATALOG_PUBLISH') &&
        item.status !== 'ARCHIVED' && (
          <div className="admin-publish-bar">
            <span>
              <b>
                {item.status === 'PUBLISHED'
                  ? 'Sản phẩm đang hiển thị trên cửa hàng.'
                  : 'Sản phẩm chưa hiển thị để khách đặt mua.'}
              </b>
              <small>
                Công bố yêu cầu danh mục hoạt động và có SKU hợp lệ.
              </small>
            </span>
            <ConfirmAction
              quiet={false}
              label={
                item.status === 'PUBLISHED'
                  ? 'Ẩn khỏi cửa hàng'
                  : 'Công bố sản phẩm'
              }
              title={
                item.status === 'PUBLISHED'
                  ? 'Ẩn sản phẩm?'
                  : 'Công bố sản phẩm?'
              }
              description="Thao tác sẽ thay đổi trạng thái hiển thị thực tế trên cửa hàng. Nội dung chưa lưu trong form không được gửi cùng thao tác này."
              disabled={status.busy}
              onConfirm={() =>
                status.mutate(item.status === 'PUBLISHED' ? 'hide' : 'publish')
              }
            />
          </div>
        )}
      <div
        className="admin-product-editor"
        key={`${productId ?? 'new'}:${formRevision}`}
      >
        {permissions.has('CATALOG_WRITE') && item?.status !== 'ARCHIVED' ? (
          <ProductForm product={item} />
        ) : (
          item && (
            <section className="admin-panel admin-form-panel">
              <h2>Thông tin sản phẩm</h2>
              <p className="admin-preserve-text">
                {item.description || 'Chưa có mô tả.'}
              </p>
              <p className="admin-muted">
                /{item.slug} · {item.category?.name}
              </p>
            </section>
          )
        )}
        {item && (
          <>
            <VariantsPanel product={item} />
            <ImagesPanel product={item} />
          </>
        )}
      </div>
    </>
  );
}
