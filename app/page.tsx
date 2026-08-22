const contacts = [
  { name: "Екатерина", phoneDisplay: "+7 924 337-01-23", phone: "79243370123" },
  { name: "Наталья", phoneDisplay: "+7 924 336-30-07", phone: "79243363007" },
];

const orderMessage = "Здравствуйте! Хочу заказать воздушные шары или оформление праздника.";
const getWhatsappLink = (phone: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(orderMessage)}`;
const primaryWhatsappLink = getWhatsappLink(contacts[0].phone);
const telegramLink =
  `https://t.me/+${contacts[0].phone}?text=${encodeURIComponent(orderMessage)}&profile`;

const services = [
  { title: "Воздушные шары", price: "от 150 ₽", note: "Латексные, фольгированные, с надписями", image: "/images/works/work-090.jpeg", alt: "Голубая персональная композиция из воздушных шаров на первый день рождения" },
  { title: "Букеты из шаров", price: "от 700 ₽", note: "Композиции под повод, возраст и бюджет", image: "/images/works/work-004.jpeg", alt: "Серебряно-белый букет из воздушных шаров" },
  { title: "Гендер-пати", price: "от 1 500 ₽", note: "Большие шары, коробки и тематический декор", image: "/images/works/work-108.jpeg", alt: "Большая композиция для гендер-пати" },
  { title: "День рождения", price: "от 1 500 ₽", note: "Цифры, фонтаны, коробки-сюрпризы", image: "/images/works/work-069.jpeg", alt: "Розово-золотая фотозона на день рождения" },
  { title: "Выпускные, школы и детские сады", price: "от 1 800 ₽", note: "Оформление групп, классов, сцен и залов", image: "/images/works/work-120.jpeg", alt: "Фиолетовая фотозона на выпускной" },
  { title: "Авто на выписку", price: "от 2 500 ₽", note: "Готовый комплект с монтажом", image: "/images/works/work-103.jpeg", alt: "Голубая композиция для новорождённого" },
  { title: "Выписка из роддома", price: "от 3 000 ₽", note: "Нежные композиции для мамы и малыша", image: "/images/newborn.jpeg", alt: "Нежная композиция из шаров на выписку" },
  { title: "Юбилей", price: "от 3 500 ₽", note: "Стильное оформление для взрослых", image: "/images/works/work-058.jpeg", alt: "Золотая фотозона на юбилей" },
  { title: "Арки и гирлянды", price: "от 4 000 ₽", note: "Органические гирлянды любой палитры", image: "/images/works/work-055.jpeg", alt: "Воздушная бело-золотая арка из шаров" },
  { title: "Корпоратив", price: "от 6 000 ₽", note: "Открытия, презентации и бренд-зоны", image: "/images/works/work-066.jpeg", alt: "Большая синяя фотозона для праздничной сцены" },
  { title: "Пресс-воллы и бренд-зоны", price: "по расчёту", note: "Фон, печать, декор, доставка и монтаж", image: "/images/works/work-066.jpeg", alt: "Синяя бренд-зона для оформления события" },
  { title: "Фотозоны", price: "от 6 500 ₽", note: "Фон, декор, надпись и монтаж", image: "/images/works/work-056.jpeg", alt: "Нежная розовая фотозона" },
  { title: "Свадебное оформление", price: "от 10 000 ₽", note: "Декор площадки, церемонии и фотозоны", image: "/images/works/work-077.jpeg", alt: "Свадебное оформление на природе" },
  { title: "Свадебный президиум", price: "по расчёту", note: "Декор стола молодожёнов, фон и цветочные акценты", image: "/images/wedding.jpeg", alt: "Свадебное оформление в розовых тонах" },
];

const gallery = [
  { src: "/images/hero.jpeg", alt: "Розово-серебряная фотозона из воздушных шаров", className: "gallery-tall" },
  { src: "/images/birthday.jpeg", alt: "Композиция с золотыми цифрами и коробкой-сюрпризом", className: "" },
  { src: "/images/newborn.jpeg", alt: "Композиция из шаров на рождение ребёнка", className: "" },
  { src: "/images/wedding.jpeg", alt: "Свадебная фотозона в розовых тонах", className: "gallery-wide" },
  { src: "/images/gender-party.jpeg", alt: "Шары для гендер-пати", className: "" },
  { src: "/images/party.jpeg", alt: "Яркая фотозона для вечеринки", className: "" },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Шарик — на главную">
          <span className="brand-mark">Ш</span>
          <span>
            <strong>Шарик</strong>
            <small>воздушные шары и оформление</small>
          </span>
        </a>
        <nav aria-label="Основная навигация">
          <a href="#services">Услуги</a>
          <a href="/works">Работы</a>
          <a href="#about">О нас</a>
          <a href="#contacts">Контакты</a>
        </nav>
        <a className="header-phone" href="#contacts">Екатерина · Наталья</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Уссурийск · Приморский край · 7 дней в неделю</p>
          <h1>Воздушные шары и студия оформления праздников</h1>
          <p className="hero-lead">
            Воздушные шары, фотозоны, пресс-воллы, свадебные президиумы и
            оформление выпускных в школах и детских садах — подберём решение
            под ваш повод и бюджет.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={primaryWhatsappLink}>Заказать в WhatsApp <span>↗</span></a>
            <a className="button button-ghost" href="#services">Посмотреть цены</a>
          </div>
          <div className="hero-facts">
            <span><b>24/7</b> доставка по договорённости</span>
            <span><b>0 ₽</b> выезд на замер</span>
            <span><b>Любая</b> форма оплаты</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            <img src="/images/hero.jpeg?v=2" alt="Нежная розово-серебряная фотозона студии Шарик" fetchPriority="high" />
          </div>
          <div className="floating-card floating-card-top">
            <span className="spark">✦</span>
            <div><b>Соберём под ваш бюджет</b><small>от простого букета до декора площадки</small></div>
          </div>
          <div className="floating-card floating-card-bottom">
            <b>150 ₽</b><small>шары от</small>
          </div>
        </div>
      </section>

      <section className="occasions" aria-label="Популярные поводы">
        <span>Фотозоны</span><i>•</i><span>Пресс-воллы</span><i>•</i>
        <span>Свадебный президиум</span><i>•</i><span>Выпускные</span><i>•</i>
        <span>Школы</span><i>•</i><span>Детские сады</span>
      </section>

      <section className="section services-section" id="services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Меню услуг</p>
            <h2>Выберите формат праздника</h2>
          </div>
          <p>Каждый заказ рассчитывается индивидуально. Пока указаны ориентировочные цены — итог зависит от размера, состава, доставки и монтажа.</p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.title}>
              <div className="service-image">
                <img src={service.image} alt={service.alt} loading="lazy" />
                <span className="service-number">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="service-content">
                <h3>{service.title}</h3>
                <p>{service.note}</p>
                <div className="service-meta">
                  <strong>{service.price}</strong>
                  <a href={primaryWhatsappLink} aria-label={`Узнать стоимость: ${service.title}`}>Уточнить <span>↗</span></a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section gallery-section" id="gallery">
        <div className="section-heading gallery-heading">
          <div>
            <p className="eyebrow">Наши работы</p>
            <h2>Идеи, которые становятся атмосферой</h2>
          </div>
          <a className="text-link" href={primaryWhatsappLink}>Хочу похожее <span>↗</span></a>
        </div>
        <div className="gallery-grid">
          {gallery.map((image) => (
            <figure className={image.className} key={image.src}>
              <img src={image.src} alt={image.alt} />
            </figure>
          ))}
        </div>
        <div className="gallery-more">
          <a className="button button-ghost" href="/works">
            Смотреть все работы <span>→</span>
          </a>
        </div>
      </section>

      <section className="section studio-section" id="studio">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Всё делаем сами</p>
            <h2>От личной надписи до готового оформления</h2>
          </div>
          <p>Подбираем шары и ленты, создаём макет, печатаем персональный текст или фотографию и собираем заказ в нашей студии.</p>
        </div>
        <div className="studio-grid">
          <article className="studio-card">
            <img src="/images/custom-printing.jpeg" alt="Рабочее место студии Шарик для печати надписей и фотографий на воздушных шарах" loading="lazy" />
            <div>
              <p className="eyebrow">Печать на шарах</p>
              <h3>Надписи и фотографии</h3>
              <p>Напечатаем имя, дату, поздравление, логотип или фотографию — всё, что можно аккуратно нанести на шар.</p>
            </div>
          </article>
          <article className="studio-card storefront-card">
            <img src="/images/storefront.jpeg" alt="Вход в студию воздушных шаров Шарик на улице Садовой, 3г в Уссурийске" loading="lazy" />
            <div>
              <p className="eyebrow">Наша студия</p>
              <h3>Садовая, 3г</h3>
              <p>Здесь можно посмотреть материалы, выбрать оттенки и оформить заказ. Работаем ежедневно: Пн–Сб 10:00–19:00, Вс 10:00–18:00.</p>
              <a className="text-link" href="#contacts">Связаться перед визитом <span>↓</span></a>
            </div>
          </article>
        </div>
      </section>

      <section className="section about-section" id="about">
        <div className="about-intro">
          <p className="eyebrow">Почему «Шарик»</p>
          <h2>Не просто привозим шары. Собираем цельный образ праздника.</h2>
          <p>Вы рассказываете о событии и настроении — мы предлагаем решение, согласовываем детали и берём оформление на себя.</p>
        </div>
        <div className="benefits">
          <article><span>01</span><div><h3>Всегда на связи</h3><p>Работаем ежедневно, без выходных и перерывов.</p></div></article>
          <article><span>02</span><div><h3>Бесплатный замер</h3><p>Приедем на площадку, оценим пространство и рассчитаем декор.</p></div></article>
          <article><span>03</span><div><h3>Доставка 24/7</h3><p>При заказе до 20:00 согласуем доставку в удобное время.</p></div></article>
          <article><span>04</span><div><h3>Удобная оплата</h3><p>Наличные, карта или безналичный расчёт для организаций.</p></div></article>
        </div>
      </section>

      <section className="process-section">
        <div className="process-image">
          <img src="/images/wedding.jpeg" alt="Оформление события студией Шарик" />
        </div>
        <div className="process-copy">
          <p className="eyebrow">Как заказать</p>
          <h2>От сообщения до готового праздника — 4 шага</h2>
          <ol>
            <li><span>1</span><div><b>Напишите нам</b><p>Расскажите о дате, поводе и месте.</p></div></li>
            <li><span>2</span><div><b>Получите варианты</b><p>Предложим палитру и комплектацию под бюджет.</p></div></li>
            <li><span>3</span><div><b>Согласуйте детали</b><p>Зафиксируем состав, время и стоимость.</p></div></li>
            <li><span>4</span><div><b>Встречайте праздник</b><p>Доставим и смонтируем оформление.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="contact-section" id="contacts">
        <div>
          <p className="eyebrow">Обсудим ваш праздник?</p>
          <h2>Пришлите пример — подберём идею и посчитаем стоимость</h2>
        </div>
        <div className="contact-actions">
          {contacts.map((contact) => (
            <article className="contact-person" key={contact.phone}>
              <div>
                <span>Ваш менеджер</span>
                <h3>{contact.name}</h3>
                <a href={`tel:+${contact.phone}`}>{contact.phoneDisplay}</a>
              </div>
              <div className="contact-person-actions">
                <a className="contact-chip whatsapp" href={getWhatsappLink(contact.phone)}>WhatsApp <span>↗</span></a>
                <a className="contact-chip phone" href={`tel:+${contact.phone}`}>Позвонить <span>↗</span></a>
              </div>
            </article>
          ))}
          <a className="contact-button telegram" href={telegramLink}><span>TG</span><b>Написать Екатерине в Telegram</b><i>↗</i></a>
        </div>
      </section>

      <footer>
        <div className="footer-main">
          <a className="brand brand-footer" href="#top">
            <span className="brand-mark">Ш</span>
            <span><strong>Шарик</strong><small>воздушные шары и оформление</small></span>
          </a>
          <p>Создаём атмосферу вашего праздника в Приморском крае</p>
          <div className="footer-details">
            <span>Садовая, 3г</span>
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
