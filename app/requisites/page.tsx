import type { Metadata } from "next";
import LegalPage from "../LegalPage";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Сведения и контакты",
  description: "Реквизиты ИП Байтимировой Екатерины Алексеевны: ИНН, ОГРНИП, электронная почта, контакты и адрес студии «Шарик» в Уссурийске.",
  alternates: { canonical: "/requisites/" },
};

export default function RequisitesPage() {
  return (
    <LegalPage title="Сведения и контакты" intro="Реквизиты индивидуального предпринимателя и контакты студии «Шарик».">
      <dl className={styles.details}>
        <div><dt>Предприниматель</dt><dd>Индивидуальный предприниматель Байтимирова Екатерина Алексеевна</dd></div>
        <div><dt>ИНН</dt><dd>252000193603</dd></div>
        <div><dt>ОГРНИП</dt><dd>326253600056261</dd></div>
        <div><dt>Дата регистрации</dt><dd>20 мая 2026 года</dd></div>
        <div><dt>Регистрирующий орган</dt><dd>Межрайонная инспекция Федеральной налоговой службы № 15 по Приморскому краю</dd></div>
        <div><dt>Электронная почта</dt><dd><a href="mailto:katti_silence@mail.ru">katti_silence@mail.ru</a></dd></div>
        <div><dt>Екатерина</dt><dd><a href="tel:+79243370123">+7 924 337-01-23</a></dd></div>
        <div><dt>Наталья</dt><dd><a href="tel:+79243363007">+7 924 336-30-07</a></dd></div>
        <div><dt>Адрес студии</dt><dd>Приморский край, г. Уссурийск, ул. Садовая, 3г</dd></div>
        <div><dt>Часы работы</dt><dd><span>Понедельник — суббота: 10:00–19:00</span><span>Воскресенье: 10:00–18:00</span></dd></div>
      </dl>
      <section>
        <h2>Вопросы по заказам</h2>
        <p>Позвоните в студию или <a href="https://wa.me/79243370123" target="_blank" rel="noopener noreferrer">напишите Екатерине в WhatsApp</a>. Состав заказа, итоговую стоимость, доставку, сроки и способ оплаты согласуйте до внесения оплаты.</p>
        <p>Порядок согласования, получения и оплаты описан на странице <a href="/ordering/">«Заказ, доставка и оплата»</a>. Письменные вопросы и претензии по заказам можно направить на <a href="mailto:katti_silence@mail.ru">katti_silence@mail.ru</a>.</p>
      </section>
      <section>
        <h2>Обращения о персональных данных</h2>
        <p>Запрос об обработке данных, заявление об их уточнении или удалении, отзыв согласия направляйте ИП Байтимировой Екатерине Алексеевне на <a href="mailto:katti_silence@mail.ru">katti_silence@mail.ru</a>. Для вопросов также доступен телефон <a href="tel:+79243370123">+7 924 337-01-23</a>.</p>
        <p>Подробнее — в <a href="/privacy/">политике конфиденциальности</a>. Управлять разрешением на необязательную аналитику можно через настройки внизу любой страницы.</p>
      </section>
    </LegalPage>
  );
}
