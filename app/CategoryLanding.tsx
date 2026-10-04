import Image from "next/image";
import Link from "next/link";
import { YANDEX_MAPS_URL } from "./business-location";

export type CategoryOffer = {
  title: string;
  price: string;
  note: string;
  image: string;
  alt: string;
};

export type CategoryFaq = {
  question: string;
  answer: string;
};

export type CategoryLandingData = {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  heroImage: string;
  heroAlt: string;
  ctaSubject: string;
  trackingGoal?: string;
  offersTitle: string;
  offersLead: string;
  offers: CategoryOffer[];
  faq: CategoryFaq[];
};

const contacts = [
  { name: "Екатерина", phoneDisplay: "+7 924 337-01-23", phone: "79243370123" },
  { name: "Наталья", phoneDisplay: "+7 924 336-30-07", phone: "79243363007" },
];

function whatsappLink(subject: string) {
  const message = `Здравствуйте! Пишу с сайта shariku.ru. Интересует: ${subject}. Подскажите, пожалуйста, стоимость и ближайший срок.`;
  return `https://wa.me/${contacts[0].phone}?text=${encodeURIComponent(message)}`;
}

export default function CategoryLanding({ data }: { data: CategoryLandingData }) {
  const orderLink = whatsappLink(data.ctaSubject);
  const pageUrl = `https://shariku.ru/${data.slug}/`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: data.title,
        description: data.lead,
        url: pageUrl,
        provider: { "@id": "https://shariku.ru/#business" },
        areaServed: {
          "@type": "City",
          name: "Уссурийск",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: data.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Главная",
            item: "https://shariku.ru/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: data.title,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="category-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Шарик — на главную">
          <span className="brand-mark">Ш</span>
          <span>
            <strong>Шарик</strong>
            <small>цветы, шары и оформление</small>
          </span>
        </Link>
        <nav aria-label="Категории услуг">
          <Link href="/flowers/">Цветы</Link>
          <Link href="/balloons/">Шары</Link>
          <Link href="/event-decoration/">Оформление</Link>
          <Link href="/works/">Работы</Link>
        </nav>
        <a
          className="header-phone"
          href={`tel:+${contacts[0].phone}`}
          aria-label={`Позвонить Екатерине по номеру ${contacts[0].phoneDisplay}`}
        >
          Позвонить Екатерине
        </a>
      </header>

      <nav className="category-breadcrumb" aria-label="Хлебные крошки">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>{data.title}</span>
      </nav>

      <section className="category-hero">
        <div className="category-hero-copy">
          <p className="eyebrow">{data.eyebrow} · Уссурийск</p>
          <h1>{data.title}</h1>
          <p>{data.lead}</p>
          <div className="category-actions">
            <a
              className="button button-primary"
              href={orderLink}
              data-ym-goal={data.trackingGoal}
            >
              Узнать стоимость в WhatsApp <span>↗</span>
            </a>
            <a className="button button-ghost" href={`tel:+${contacts[0].phone}`}>
              Позвонить
            </a>
          </div>
          <div className="category-facts" aria-label="Условия заказа">
            <span><b>7 дней</b> в неделю</span>
            <span><b>Уссурийск</b> доставка по договорённости</span>
            <span><b>Под бюджет</b> согласуем состав заранее</span>
          </div>
        </div>
        <figure className="category-hero-image">
          <Image
            src={data.heroImage}
            alt={data.heroAlt}
            fill
            priority
            sizes="(max-width: 1000px) 90vw, 38vw"
          />
        </figure>
      </section>

      <section className="category-offers section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Варианты заказа</p>
            <h2>{data.offersTitle}</h2>
          </div>
          <p>{data.offersLead}</p>
        </div>
        <div className="category-offer-grid">
          {data.offers.map((offer) => (
            <article key={offer.title}>
              <figure className="category-offer-image">
                <Image
                  src={offer.image}
                  alt={offer.alt}
                  fill
                  sizes="(max-width: 700px) calc(100vw - 36px), (max-width: 1000px) 45vw, 22vw"
                />
              </figure>
              <div>
                <h3>{offer.title}</h3>
                <p>{offer.note}</p>
                <div>
                  <strong>{offer.price}</strong>
                  <a href={whatsappLink(offer.title)} data-ym-goal={data.trackingGoal}>
                    Уточнить <span>↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="category-process">
        <div>
          <p className="eyebrow">Как оформить заказ</p>
          <h2>Понятно согласуем детали до оплаты</h2>
        </div>
        <ol>
          <li><span>01</span><div><b>Напишите дату и повод</b><p>Добавьте пример, пожелания по цвету и ориентир по бюджету.</p></div></li>
          <li><span>02</span><div><b>Получите подходящие варианты</b><p>Уточним наличие, состав, размер, доставку и итоговую стоимость.</p></div></li>
          <li><span>03</span><div><b>Подтвердите заказ</b><p>Соберём всё по согласованным деталям и времени.</p></div></li>
        </ol>
      </section>

      <section className="category-faq section" id="faq">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Перед заказом</p>
            <h2>Ответы на частые вопросы</h2>
          </div>
          <p>Если вашего вопроса здесь нет, напишите Екатерине — уточним детали именно для вашего события.</p>
        </div>
        <div className="category-faq-list">
          {data.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="category-final-cta">
        <div>
          <p className="eyebrow">Подберём вариант</p>
          <h2>Пришлите дату, повод и пример — начнём с расчёта</h2>
        </div>
        <a
          className="button button-primary"
          href={orderLink}
          data-ym-goal={data.trackingGoal}
        >
          Написать в WhatsApp <span>↗</span>
        </a>
      </section>

      <footer>
        <div className="footer-main">
          <Link className="brand brand-footer" href="/">
            <span className="brand-mark">Ш</span>
            <span><strong>Шарик</strong><small>цветы, шары и оформление</small></span>
          </Link>
          <p>Создаём атмосферу вашего праздника в Приморском крае</p>
          <div className="footer-details">
            <a href={YANDEX_MAPS_URL} target="_blank" rel="noopener noreferrer">Садовая, 3г · Открыть в Яндекс Картах ↗</a>
            <span>Пн–Сб 10:00–19:00 · Вс 10:00–18:00</span>
            <span>Екатерина {contacts[0].phoneDisplay} · Наталья {contacts[1].phoneDisplay}</span>
          </div>
        </div>
        <a className="footer-credit" href="https://24zxc.ru" target="_blank" rel="noopener noreferrer">
          Сделано с <span className="pulse-heart" aria-label="любовью">♥</span> <strong>24zxc.ru</strong>
        </a>
      </footer>
    </main>
  );
}
