const phoneDisplay = "+7 908 455-16-35";
const phone = "79084551635";
const whatsappLink =
  `https://wa.me/${phone}?text=${encodeURIComponent("Здравствуйте! Посмотрел(а) ваши работы на сайте. Хочу обсудить оформление праздника.")}`;

const works = [
  { src: "/images/works/work-001.jpeg", alt: "Персональная композиция из белых шаров", category: "Композиции" },
  { src: "/images/works/work-003.jpeg", alt: "Свадебная композиция в бело-золотой гамме", category: "Свадьбы" },
  { src: "/images/works/work-004.jpeg", alt: "Серебряно-белый букет шаров для пары", category: "Композиции" },
  { src: "/images/works/work-007.jpeg", alt: "Белая фотозона с прозрачными шарами", category: "Фотозоны" },
  { src: "/images/works/work-012.jpeg", alt: "Свадебная фотозона с молодожёнами", category: "Свадьбы" },
  { src: "/images/works/work-018.jpeg", alt: "Бирюзовая фотозона на выпускной", category: "Выпускные" },
  { src: "/images/works/work-022.jpeg", alt: "Круглая бело-золотая фотозона", category: "Фотозоны" },
  { src: "/images/works/work-028.jpeg", alt: "Букет из маленьких золотых и белых шаров", category: "Композиции" },
  { src: "/images/works/work-031.jpeg", alt: "Свадебная фотозона с цветами", category: "Свадьбы" },
  { src: "/images/works/work-033.jpeg", alt: "Серебряная фотозона на юбилей", category: "Юбилеи" },
  { src: "/images/works/work-036.jpeg", alt: "Сине-серебряная фотозона", category: "Фотозоны" },
  { src: "/images/works/work-038.jpeg", alt: "Прозрачная композиция с белыми шарами", category: "Композиции" },
  { src: "/images/works/work-041.jpeg", alt: "Детская композиция с фигурой кошки", category: "Детские праздники" },
  { src: "/images/works/work-044.jpeg", alt: "Композиция для гендер-пати", category: "Гендер-пати" },
  { src: "/images/works/work-049.jpeg", alt: "Чёрно-золотая композиция на день рождения", category: "Дни рождения" },
  { src: "/images/works/work-052.jpeg", alt: "Розовая фотозона с цифрой один", category: "Детские праздники" },
  { src: "/images/works/work-055.jpeg", alt: "Уличная бело-золотая фотозона", category: "Фотозоны" },
  { src: "/images/works/work-056.jpeg", alt: "Нежная фотозона на первый день рождения", category: "Детские праздники" },
  { src: "/images/works/work-058.jpeg", alt: "Золотая фотозона с подсветкой", category: "Дни рождения" },
  { src: "/images/works/work-061.jpeg", alt: "Розово-чёрная фотозона для вечеринки", category: "Фотозоны" },
  { src: "/images/works/work-066.jpeg", alt: "Синяя фотозона для праздничной сцены", category: "Фотозоны" },
  { src: "/images/works/work-069.jpeg", alt: "Розово-золотая фотозона с бантом", category: "Дни рождения" },
  { src: "/images/works/work-077.jpeg", alt: "Свадебное оформление на природе", category: "Свадьбы" },
  { src: "/images/works/work-082.jpeg", alt: "Яркая детская композиция на два года", category: "Детские праздники" },
  { src: "/images/works/work-088.jpeg", alt: "Разноцветное оформление детского праздника", category: "Детские праздники" },
  { src: "/images/works/work-090.jpeg", alt: "Сине-серебряная композиция на один год", category: "Детские праздники" },
  { src: "/images/works/work-098.jpeg", alt: "Нежно-розовый персональный набор шаров", category: "Композиции" },
  { src: "/images/works/work-103.jpeg", alt: "Голубая композиция для новорождённого", category: "Выписка" },
  { src: "/images/works/work-108.jpeg", alt: "Большая композиция для гендер-пати", category: "Гендер-пати" },
  { src: "/images/works/work-112.jpeg", alt: "Уличная фотозона на первый день рождения", category: "Детские праздники" },
  { src: "/images/works/work-115.jpeg", alt: "Красная романтическая композиция из сердец", category: "Композиции" },
  { src: "/images/works/work-120.jpeg", alt: "Фиолетовая фотозона на выпускной", category: "Выпускные" },
  { src: "/images/works/work-127.jpeg", alt: "Золотая композиция на десятилетие", category: "Детские праздники" },
  { src: "/images/works/work-129.jpeg", alt: "Нежная фотозона для маленькой девочки", category: "Детские праздники" },
  { src: "/images/works/work-133.jpeg", alt: "Круглая голубо-розовая фотозона", category: "Фотозоны" },
  { src: "/images/works/work-135.jpeg", alt: "Оформление сцены на школьный выпускной", category: "Выпускные" },
];

const categories = [...new Set(works.map((work) => work.category))];

export default function WorksPage() {
  return (
    <main className="works-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Шарик — на главную">
          <span className="brand-mark">Ш</span>
          <span>
            <strong>Шарик</strong>
            <small>студия декора</small>
          </span>
        </a>
        <nav aria-label="Навигация по сайту">
          <a href="/">Главная</a>
          <a href="/#services">Услуги</a>
          <a href="/#about">О нас</a>
        </nav>
        <a className="header-phone" href={`tel:+${phone}`}>{phoneDisplay}</a>
      </header>

      <section className="works-hero">
        <div>
          <p className="eyebrow">Портфолио студии</p>
          <h1>Наши работы</h1>
        </div>
        <p>
          Реальные оформления для свадеб, дней рождения, выпускных и семейных
          праздников. Покажите понравившийся пример — адаптируем цвет, состав и
          размер под вашу площадку и бюджет.
        </p>
      </section>

      <section className="works-content">
        <div className="works-categories" aria-label="Категории работ">
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
        <div className="works-grid">
          {works.map((work) => (
            <figure key={work.src}>
              <img src={work.src} alt={work.alt} loading="lazy" />
              <figcaption>{work.category}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="works-cta">
        <div>
          <p className="eyebrow">Есть любимый вариант?</p>
          <h2>Соберём похожее оформление специально для вас</h2>
        </div>
        <a className="button button-primary" href={whatsappLink}>
          Обсудить в WhatsApp <span>↗</span>
        </a>
      </section>

      <footer>
        <a className="brand brand-footer" href="/">
          <span className="brand-mark">Ш</span>
          <span><strong>Шарик</strong><small>студия декора</small></span>
        </a>
        <p>Создаём атмосферу вашего праздника в Приморском крае</p>
        <div><span>Садовая, 3г</span><span>Ежедневно</span></div>
      </footer>
    </main>
  );
}
