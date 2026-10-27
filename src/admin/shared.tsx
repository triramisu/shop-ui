import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/apiClient';
import { Icon } from '@/components/Icon';
import { adminQueryKey } from './access';
import { useAdminAccess } from './useAdminAccess';
import { statusLabel } from './api';

export function useAdminKey(resource: string, ...parts: unknown[]) {
  const { user } = useAdminAccess();
  return adminQueryKey(user!.id, resource, ...parts);
}
export function useAdminMutation<TInput, TResult>(
  action: (input: TInput) => Promise<TResult>,
  onSaved?: (result: TResult) => void,
) {
  const client = useQueryClient();
  const { user } = useAdminAccess();
  const [message, setMessage] = useState('');
  const pendingWrites = useIsMutating({ mutationKey: ['admin', user!.id] });
  const mutation = useMutation({
    mutationKey: ['admin', user!.id],
    mutationFn: action,
    retry: false,
    onMutate: () => setMessage(''),
    onSuccess: async (result) => {
      // Public catalog and private workspace must both read the committed result.
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', user!.id] }),
        ...[
          'products',
          'product',
          'categories',
          'home-products',
          'product-images',
          'related-products',
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ]);
      setMessage('Hệ thống đã xác nhận lưu thay đổi.');
      onSaved?.(result);
    },
  });
  return {
    ...mutation,
    busy: pendingWrites > 0 || mutation.isPending,
    message,
    reset: () => {
      mutation.reset();
      setMessage('');
    },
    clearMessage: () => setMessage(''),
  };
}
export function AdminNotice({
  error,
  message,
}: {
  error?: unknown;
  message?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (error) {
    const hint =
      error instanceof ApiError
        ? error.status === 409
          ? 'Dữ liệu đã thay đổi. Tải lại bản mới, kiểm tra nội dung rồi lưu lại. Không tự ghi đè.'
          : error.status === 403
            ? 'Bạn không còn quyền thực hiện thao tác này. Không có thay đổi được xác nhận bởi giao diện.'
            : error.status === 401
              ? 'Phiên đăng nhập cần xác minh lại. Đăng nhập lại rồi kiểm tra dữ liệu trước khi thử thao tác.'
              : error.status === 429
                ? 'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.'
                : error.status === 0 || error.status >= 500
                  ? 'Chưa xác nhận được kết quả. Tải lại dữ liệu trước khi thử để tránh tạo thao tác trùng.'
                  : error.message
        : typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Không thực hiện được thao tác. Vui lòng thử lại.';
    return (
      <div
        ref={ref}
        className="admin-notice is-error"
        role="alert"
        tabIndex={-1}
      >
        <Icon name="info" />
        <span>{hint}</span>
      </div>
    );
  }
  return message ? (
    <div className="admin-notice" role="status">
      <Icon name="check" />
      <span>{message}</span>
    </div>
  ) : null;
}
export function AdminHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="admin-heading-actions">{children}</div>}
    </header>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`admin-badge state-${status.toLowerCase()}`}>
      {statusLabel(status)}
    </span>
  );
}
export function AdminLoading({
  label = 'Đang tải dữ liệu…',
}: {
  label?: string;
}) {
  return (
    <div className="admin-loading" role="status">
      <span className="admin-loading-line" />
      {label}
    </div>
  );
}
export function AdminError({ retry }: { retry: () => void }) {
  return (
    <div className="admin-empty" role="alert">
      <Icon name="info" size={28} />
      <h2>Chưa tải được dữ liệu</h2>
      <p>Kiểm tra kết nối hoặc quyền tài khoản rồi thử lại.</p>
      <button className="admin-button" onClick={retry}>
        <Icon name="refresh" size={17} />
        Thử lại
      </button>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <Icon name="box" size={30} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Pager({
  page,
  totalPages,
  totalElements,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="admin-pager" aria-label="Phân trang">
      <span>
        {totalElements.toLocaleString('vi-VN')} bản ghi · Trang {page + 1}/
        {Math.max(totalPages, 1)}
      </span>
      <div>
        <button
          className="admin-button is-quiet"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          Trang trước
        </button>
        <button
          className="admin-button is-quiet"
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Trang sau
        </button>
      </div>
    </nav>
  );
}
export function ConfirmAction({
  label,
  title,
  description,
  onConfirm,
  disabled = false,
  quiet = true,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
  quiet?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={`admin-button ${quiet ? 'is-quiet' : ''}`}
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog className="admin-dialog" ref={dialog} aria-label={title}>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="admin-form-actions">
          <button
            autoFocus
            className="admin-button is-quiet"
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Hủy
          </button>
          <button
            className="admin-button"
            type="button"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            Xác nhận
          </button>
        </div>
      </dialog>
    </>
  );
}
