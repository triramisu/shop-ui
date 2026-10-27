import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  children,
  register = false,
}: {
  children: ReactNode;
  register?: boolean;
}) {
  return (
    <div className="container auth-page">
      <aside className="auth-story">
        <div>
          <span className="eyebrow">THE AYDIBRO WAY</span>
          <h2>
            Một khoảng trời riêng.
            <br />
            Bắt đầu từ đây.
          </h2>
        </div>
        <img
          src="/images/everyday-listening.webp"
          alt="Ảnh biên tập: một người nghe nhạc trong nắng chiều bên bờ biển"
        />
        <div className="auth-story-bottom">
          {register ? 'A NEW CHAPTER STARTS HERE.' : 'GOOD TO HAVE YOU BACK.'}
        </div>
      </aside>
      <section className="auth-panel">
        <nav className="auth-tabs" aria-label="Truy cập tài khoản">
          <Link to="/login" aria-current={!register ? 'page' : undefined}>
            Đăng nhập
          </Link>
          <Link to="/register" aria-current={register ? 'page' : undefined}>
            Tạo tài khoản
          </Link>
        </nav>
        {children}
      </section>
    </div>
  );
}
