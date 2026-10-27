import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Campaign imagery never replaces an API-owned product photograph. */
export function RetailHero() {
  return (
    <section className="retail-hero" aria-labelledby="hero-heading">
      <img
        className="retail-hero-photo"
        src="/images/everyday-listening.webp"
        alt="Ảnh biên tập: một người đang nghe nhạc bên bờ biển, không phải ảnh sản phẩm đang bán"
        fetchPriority="high"
        width="1536"
        height="1024"
      />
      <div className="container retail-hero-inner">
        <div className="retail-hero-copy">
          <p className="retail-overline">THE EVERYDAY EDIT — 01</p>
          <h1 id="hero-heading">
            Du dương.
            <br />
            Theo cách bạn.
          </h1>
          <p>
            Một chút nhạc. Một chút yên tĩnh.
            <br />
            Tai nghe cho những khoảnh khắc của riêng mình.
          </p>
          <Link to="/products" className="retail-hero-cta">
            Khám phá bộ sưu tập <Icon name="arrow-up" size={19} />
          </Link>
        </div>
        <span className="retail-hero-caption">AYDIBRO / EVERYDAY AUDIO</span>
        <a
          className="hero-scroll"
          href="#products"
          aria-label="Xem sản phẩm bên dưới"
        >
          <Icon name="down" size={20} />
        </a>
      </div>
    </section>
  );
}
