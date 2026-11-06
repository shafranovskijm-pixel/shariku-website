import styles from "./FlowerCatalog.module.css";
import { orderLink } from "./order-link";

export const flowerCatalog = [
  { name: "Хризантема Алтай", price: 350 },
  { name: "Роза белая Candlelight (Эквадор)", price: 350 },
  { name: "Гвоздика", price: 85 },
  { name: "Альстромерия белая", price: 250 },
  { name: "Роза красная Explorer (Эквадор)", price: 300 },
  { name: "Роза EC Full Monty", price: 300 },
  { name: "Роза EC Nina", price: 300 },
  { name: "Роза Red Panthera", price: 300 },
  { name: "Лилия", price: 500 },
  { name: "Зелень на выбор", price: 100 },
  { name: "Гипсофила", price: 150 },
];

export default function FlowerCatalog() {
  return (
    <section className={styles.catalog} id="flower-catalog" aria-labelledby="flower-catalog-title">
      <div className={styles.heading}>
        <div><p className="eyebrow">Цветы для вашего букета</p><h2 id="flower-catalog-title">Выберите любимые цветы</h2></div>
        <p>Соберём букет из выбранных цветов. Наличие, количество, упаковку и итоговую стоимость согласуем перед заказом.</p>
      </div>
      <div className={styles.content}>
        <figure className={styles.poster}>
          <a href="/images/flowers/catalog-2026.png" target="_blank" rel="noopener noreferrer" aria-label="Открыть каталог цветов и цен крупно">
            <img src="/images/flowers/catalog-2026.png" width="1224" height="1285" alt="Каталог: хризантема, розы, гвоздика, альстромерия, лилия, зелень и гипсофила" loading="lazy" />
          </a>
          <figcaption>Посмотреть изображения и цены крупно ↗</figcaption>
        </figure>
        <div className={styles.prices}>
          <table>
            <caption>Прайс на цветы и зелень</caption>
            <thead><tr><th scope="col">Наименование</th><th scope="col">Цена</th></tr></thead>
            <tbody>{flowerCatalog.map(item => <tr key={item.name}><th scope="row">{item.name}</th><td>{item.price} ₽</td></tr>)}</tbody>
          </table>
          <p className={styles.note}>Стоимость букета зависит от количества цветов и оформления. Доставку рассчитываем отдельно. Уточните наличие и цену выбранной позиции у флориста.</p>
          <a className="button button-primary" href={orderLink("flowers", "букет из цветов в каталоге")}>Собрать свой букет <span>→</span></a>
        </div>
      </div>
      <details className={styles.rose}>
        <summary>Роза Red Panthera — посмотреть цветок</summary>
        <img src="/images/flowers/red-panthera.png" alt="Роза Red Panthera — изображение из прайса" width="1030" height="1030" loading="lazy" />
      </details>
    </section>
  );
}
