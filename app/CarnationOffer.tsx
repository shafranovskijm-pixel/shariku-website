import Image from "next/image";

const orderLink = `https://wa.me/79243370123?text=${encodeURIComponent(
  "Здравствуйте! Пишу с сайта shariku.ru. Хочу заказать гвоздики по 85 ₽. Подскажите, пожалуйста, ближайшее время получения.",
)}`;

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
        <a className="button button-primary" href={orderLink} data-ym-goal="flower_order_click">
          Заказать в WhatsApp <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
