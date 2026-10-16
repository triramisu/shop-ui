import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/api/auth';
import { ApiError } from '@/lib/apiClient';
import { ErrorCode, type CaptchaResponse } from '@/lib/types';
import { AuthShell } from '@/components/AuthShell';
import { Icon } from '@/components/Icon';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const intended = location.state?.from ?? '/';
  const from =
    intended.startsWith('/') && !intended.startsWith('//') ? intended : '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaBusy, setCaptchaBusy] = useState(false);

  async function loadCaptcha() {
    setCaptchaBusy(true);
    try {
      setCaptcha(await authApi.captcha(username));
      setCaptchaAnswer('');
    } catch {
      setError('Chưa tải được mã xác thực. Vui lòng thử lại.');
    } finally {
      setCaptchaBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login({
        username,
        password,
        captchaId: captcha?.captchaId,
        captchaAnswer: captcha ? captchaAnswer : undefined,
      });
      navigate(from, { replace: true });
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === ErrorCode.CAPTCHA_REQUIRED ||
          err.code === ErrorCode.INVALID_CAPTCHA)
      ) {
        setError(
          err.code === ErrorCode.CAPTCHA_REQUIRED
            ? 'Nhập thêm mã xác thực để bảo vệ tài khoản của bạn.'
            : 'Mã xác thực chưa đúng hoặc đã hết hạn. Hãy dùng mã mới.',
        );
        await loadCaptcha();
      } else {
        setError(
          err instanceof ApiError && err.code === ErrorCode.RATE_LIMIT_EXCEEDED
            ? 'Bạn thử quá nhiều lần. Vui lòng chờ một chút rồi đăng nhập lại.'
            : err instanceof ApiError
              ? err.message
              : 'Không đăng nhập được. Vui lòng thử lại.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <span className="eyebrow">WELCOME BACK</span>
      <h1>
        Chào bạn trở lại<span className="accent-period">.</span>
      </h1>
      <p>Đăng nhập để tiếp tục những lựa chọn của riêng bạn.</p>
      <form onSubmit={submit}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            placeholder="Tên đăng nhập của bạn"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (captcha) {
                setCaptcha(null);
                setCaptchaAnswer('');
              }
            }}
            minLength={3}
            maxLength={50}
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
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={64}
              required
              disabled={busy}
            />
            <button
              className="icon-button"
              type="button"
              aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              <Icon name="eye" size={17} />
            </button>
          </div>
        </div>
        {captcha && (
          <div className="field">
            <label htmlFor="captcha">Mã xác thực</label>
            <div className="captcha-image">
              <img src={captcha.imageData} alt="Mã xác thực đăng nhập" />
              <button
                type="button"
                className="icon-button"
                aria-label="Lấy mã xác thực mới"
                onClick={() => void loadCaptcha()}
                disabled={captchaBusy || busy}
              >
                <Icon name="refresh" size={18} />
              </button>
            </div>
            <input
              id="captcha"
              className="input"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              placeholder="Nhập mã trong hình"
              autoComplete="off"
              maxLength={8}
              required
              disabled={busy}
            />
          </div>
        )}
        <button
          className="btn btn-dark btn-block"
          disabled={busy || captchaBusy}
        >
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <p className="auth-switch">
        Bạn chưa có tài khoản?{' '}
        <Link to="/register" state={{ from }}>
          Tạo tài khoản
        </Link>
      </p>
      <div className="auth-privacy">
        <Icon name="shield" size={15} />
        Một tài khoản. Những lựa chọn của riêng bạn.
      </div>
    </AuthShell>
  );
}
