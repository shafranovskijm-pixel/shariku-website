import type { ReactNode } from "react";
import styles from "./legal.module.css";

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className={styles.header}>
        <a className="brand" href="/" aria-label="Студия «Шарик» — на главную">
          <span className="brand-mark" aria-hidden="true">Ш</span>
          <span><strong>Шарик</strong><small>цветы, шары и оформление</small></span>
        </a>
        <a className={styles.homeLink} href="/">← На главную</a>
      </header>
      <main className={styles.page}>
        <p className={styles.eyebrow}>Информация для посетителей</p>
        <h1>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        <div className={styles.document}>{children}</div>
      </main>
    </>
  );
}
