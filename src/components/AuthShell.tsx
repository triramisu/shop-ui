import type { ReactNode } from 'react';

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
            Những điều tốt đẹp.
            <br />
            Bắt đầu từ bạn.
          </h2>
        </div>
        <img
          src="/images/hero-audio.png"
          alt="Không gian công nghệ mang sắc đất nung ấm áp"
        />
        <div className="auth-story-bottom">
          {register ? 'A NEW CHAPTER STARTS HERE.' : 'GOOD TO HAVE YOU BACK.'}
        </div>
      </aside>
      <section className="auth-panel">{children}</section>
    </div>
  );
}
