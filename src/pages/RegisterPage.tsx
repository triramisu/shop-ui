import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/lib/apiClient';
import { AuthShell } from '@/components/AuthShell';
import { Icon } from '@/components/Icon';

export function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const intended = location.state?.from ?? '/';
  const from =
    intended.startsWith('/') && !intended.startsWith('//') ? intended : '/';
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((value) => ({ ...value, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
      });
      try {
        await login({ username: form.username, password: form.password });
        navigate(from, { replace: true });
      } catch {
        navigate('/login', { replace: true, state: { from } });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Chưa tạo được tài khoản. Vui lòng thử lại.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell register>
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h1>
        Rất vui được gặp bạn<span className="accent-period">.</span>
      </h1>
      <p>Tạo tài khoản và bắt đầu khám phá Aydibro.</p>
      <form onSubmit={submit}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="form-row">
          <div className="field">
            <label htmlFor="lastName">
              Họ <span className="muted">(tùy chọn)</span>
            </label>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              placeholder="Nguyễn"
              value={form.lastName}
              onChange={set('lastName')}
              maxLength={100}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="firstName">
              Tên <span className="muted">(tùy chọn)</span>
            </label>
            <input
              id="firstName"
              className="input"
              autoComplete="given-name"
              placeholder="Minh"
              value={form.firstName}
              onChange={set('firstName')}
              maxLength={100}
              disabled={busy}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            placeholder="Chọn tên đăng nhập"
            value={form.username}
            onChange={set('username')}
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9._\-]+"
            title="Từ 3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang"
            required
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="ban@email.com"
            value={form.email}
            onChange={set('email')}
            maxLength={320}
            required
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <div className="password-input">
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              className="input"
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={set('password')}
              minLength={8}
              maxLength={64}
              required
              disabled={busy}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              <Icon name="eye" size={17} />
            </button>
          </div>
          <span className="form-hint">
            Dùng 8–64 ký tự để bảo vệ tài khoản của bạn.
          </span>
        </div>
        <button className="btn btn-dark btn-block" disabled={busy}>
          {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <p className="auth-switch">
        Đã là thành viên?{' '}
        <Link to="/login" state={{ from }}>
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
