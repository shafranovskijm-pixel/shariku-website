"use client";

import { useEffect, useState } from "react";

const SCHOOL_PROMO_END = new Date("2026-09-02T00:00:00+10:00").getTime();

export default function SeasonalFlowerTitle() {
  const [schoolPromoIsActive, setSchoolPromoIsActive] = useState(true);

  useEffect(() => {
    const update = () => setSchoolPromoIsActive(Date.now() < SCHOOL_PROMO_END);
    update();

    const remaining = SCHOOL_PROMO_END - Date.now();
    if (remaining <= 0) return;

    const timer = window.setTimeout(update, remaining);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <h2>
      {schoolPromoIsActive
        ? "К 1 сентября — свежие цветы уже в «Шарике»"
        : "Свежие цветы теперь в «Шарике»"}
    </h2>
  );
}
