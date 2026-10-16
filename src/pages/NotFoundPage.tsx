import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';

export function NotFoundPage() {
  return (
    <div className="container not-found">
      <span>
        404<span className="accent-period">.</span>
      </span>
      <h1>Mình lạc nhau một chút rồi.</h1>
      <p>Trang bạn tìm không còn ở đây. Nhưng còn nhiều điều hay phía trước.</p>
      <Link to="/" className="btn btn-dark">
        Về trang chủ <Icon name="arrow" size={17} />
      </Link>
    </div>
  );
}
