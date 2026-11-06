import Image from "next/image";
import { orderLink } from "./order-link";

export default function CarnationOffer() {
  return (
    <section className="carnation-offer" aria-labelledby="carnation-offer-title">
      <figure className="carnation-offer-image">
        <Image
          src="/images/flowers/carnations-red-white-yellow.webp"
          alt="Красная, белая и жёлтая гвоздики"
          fill
          priority
          sizes="(max-width: 700px) calc(100vw - 36px), 34vw"
        />
      </figure>
      <div className="carnation-offer-copy">
        <span className="carnation-availability"><i aria-hidden="true" />В наличии</span>
        <h2 id="carnation-offer-title">Гвоздика</h2>
        <p>Красная · Белая · Жёлтая</p>
      </div>
      <div className="carnation-offer-order">
        <strong className="carnation-offer-price">85 ₽</strong>
        <a className="button button-primary" href={orderLink("flowers", "гвоздики по 85 ₽")}>
          Оставить заявку <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
