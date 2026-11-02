"use client";

import { useState } from "react";
import styles from "./WorksGallery.module.css";

type Work = {src:string;alt:string;category:string};

export default function WorksGallery({ works }: {works:Work[]}) {
  const [category, setCategory] = useState("Все работы");
  const [limit, setLimit] = useState(15);
  const categories = ["Все работы", ...new Set(works.map(work => work.category))];
  const filtered = category === "Все работы" ? works : works.filter(work => work.category === category);
  return <>
    <div className={styles.filters} aria-label="Категории работ">
      {categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => {setCategory(item);setLimit(15);}}>{item}</button>)}
    </div>
    <p className={styles.count} aria-live="polite">{category} · {filtered.length} фото</p>
    <div className="works-grid">
      {filtered.slice(0,limit).map(work => <figure key={work.src}>
        <a href={work.src} target="_blank" rel="noopener noreferrer" aria-label={`Открыть фото: ${work.alt}`}><img src={work.src} alt={work.alt} loading="lazy" /></a>
        <figcaption>{work.category}</figcaption>
      </figure>)}
    </div>
    {limit < filtered.length && <button className={`button button-primary ${styles.more}`} type="button" onClick={() => setLimit(n => n+15)}>Показать ещё фото <span>↓</span></button>}
  </>;
}
