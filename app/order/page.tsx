import type { Metadata } from "next";
import OrderRequest from "../OrderRequest";
import styles from "../OrderRequest.module.css";

export const metadata: Metadata = {
  title: "Оставить заявку — цветы, шары и оформление",
  description: "Расскажите о вашем заказе студии «Шарик» в Уссурийске. Екатерина уточнит состав, стоимость и удобное время.",
  alternates: { canonical: "/order/" },
};

export default function OrderPage() {
  return <>
    <header className={styles.header}>
      <a className="brand" href="/" aria-label="Шарик — на главную"><span className="brand-mark" aria-hidden="true">Ш</span><span><strong>Шарик</strong><small>цветы, шары и оформление</small></span></a>
      <a href="tel:+79243370123">+7 924 337-01-23</a>
    </header>
    <main className={styles.page}>
      <a className={styles.back} href="/">← На главную</a>
      <h1>Ваш праздник начинается с идеи</h1>
      <OrderRequest />
    </main>
  </>;
}
