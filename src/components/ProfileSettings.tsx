import { useState } from 'react';
import type { UserResponse } from '@/lib/types';
import { systemApi } from '@/admin/systemApi';
import { ApiError } from '@/lib/apiClient';
import { useAuth } from '@/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ProfileSettings({ user }: { user: UserResponse }) {
  const { refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user.email);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth ?? '');
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const failure = (e: unknown) =>
    setError(
      e instanceof ApiError && (e.status >= 500 || e.status === 0)
        ? 'Chưa xác nhận kết quả. Kiểm tra lại hồ sơ trước khi gửi lại.'
        : e instanceof Error
          ? e.message
          : 'Chưa lưu được thay đổi.',
    );
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const maxDate = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');
  return (
    <div className="profile-settings">
      <section>
        <h2>Cập nhật hồ sơ</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setMessage('');
            try {
              await systemApi.profile({
                email,
                firstName,
                lastName,
                dateOfBirth: dateOfBirth || null,
              });
              await refreshUser();
              setMessage(
                'Đã lưu hồ sơ. Nếu đổi email, trạng thái xác thực có thể được cập nhật.',
              );
            } catch (err) {
              failure(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Email
            <input
              className="input"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="profile-form-pair">
            <label className="field">
              Họ
              <input
                className="input"
                maxLength={100}
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
            <label className="field">
              Tên
              <input
                className="input"
                maxLength={100}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Ngày sinh
            <input
              className="input"
              type="date"
              value={dateOfBirth}
              max={maxDate}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            Lưu hồ sơ
          </button>
        </form>
      </section>
      <section>
        <h2>Đổi mật khẩu</h2>
        <p>
          Đổi thành công sẽ đăng xuất các phiên đang hoạt động. Bạn cần đăng
          nhập lại bằng mật khẩu mới.
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setMessage('');
            if (newPassword !== confirmation) {
              setError('Mật khẩu xác nhận chưa khớp.');
              return;
            }
            setBusy(true);
            try {
              await systemApi.password({ currentPassword, newPassword });
              setCurrent('');
              setNew('');
              setConfirmation('');
              await logout();
              navigate('/login', { replace: true });
            } catch (err) {
              failure(err);
              setCurrent('');
              setNew('');
              setConfirmation('');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Mật khẩu hiện tại
            <input
              className="input"
              type="password"
              required
              minLength={8}
              maxLength={64}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="field">
            Mật khẩu mới
            <input
              className="input"
              type="password"
              required
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
          </label>
          <label className="field">
            Nhập lại mật khẩu mới
            <input
              className="input"
              type="password"
              required
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button className="btn btn-secondary" disabled={busy}>
            Đổi mật khẩu & đăng xuất
          </button>
        </form>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="profile-success" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
