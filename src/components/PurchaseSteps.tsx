import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Navigation progress only; never claims that an order/payment is confirmed. */
export function PurchaseSteps({ current }: { current: 0 | 1 }) {
  const labels = ['Giỏ hàng', 'Xác nhận đơn', 'Thanh toán'];
  return (
    <nav className="purchase-progress" aria-label="Tiến trình mua hàng">
      <ol>
        {labels.map((label, index) => (
          <li key={label} aria-current={index === current ? 'step' : undefined}>
            <span className="purchase-progress-index" aria-hidden="true">
              {index < current ? (
                <Icon name="check" size={15} />
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            {index < current ? (
              <Link to="/cart">{label}</Link>
            ) : (
              <span>{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
