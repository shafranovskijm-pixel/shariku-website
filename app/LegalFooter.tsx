"use client";

import styles from "./legal.module.css";

export function PrivacySettingsButton() {
  return (
    <button
      className={styles.settingsButton}
      type="button"
      onClick={() => window.dispatchEvent(new Event("shariku:privacy-settings"))}
    >
      Настройки аналитики
    </button>
  );
}

export default function LegalFooter() {
  return (
    <footer className={styles.footer} aria-label="Правовая информация">
      <div className={styles.footerInner}>
        <p className={styles.footerOwner}>
          ИП Байтимирова Екатерина Алексеевна
          <span>ИНН 252000193603 · ОГРНИП 326253600056261</span>
          <span>Регистрация 20.05.2026 · <a href="mailto:katti_silence@mail.ru">katti_silence@mail.ru</a></span>
        </p>
        <nav className={styles.footerLinks} aria-label="Документы и условия">
          <a href="/privacy/">Политика конфиденциальности</a>
          <a href="/analytics-consent/">Согласие на аналитику</a>
          <a href="/requisites/">Сведения и контакты</a>
          <a href="/ordering/">Заказ, доставка и оплата</a>
          <PrivacySettingsButton />
        </nav>
      </div>
    </footer>
  );
}
