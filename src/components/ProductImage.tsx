import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { Icon } from './Icon';

export function ProductImage({
  productId,
  name,
  className = '',
}: {
  productId: string;
  name: string;
  className?: string;
}) {
  const images = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => catalogApi.productImages(productId),
    staleTime: 4 * 60_000,
  });
  const [failedUrl, setFailedUrl] = useState('');
  const image = images.data?.find((item) => item.primary) ?? images.data?.[0];
  return image && image.url !== failedUrl ? (
    <img
      className={className}
      src={image.url}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(image.url)}
    />
  ) : (
    <div className={`image-placeholder ${className}`}>
      <Icon name="box" size={40} />
      <span>
        {images.isLoading ? 'Đang tải ảnh…' : 'Hình ảnh đang được cập nhật'}
      </span>
    </div>
  );
}
