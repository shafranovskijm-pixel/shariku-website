import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Страница не найдена — студия «Шарик»" },
  description:
    "Такой страницы нет. Перейдите на главную, выберите цветы, воздушные шары или оформление праздника в студии «Шарик».",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold tracking-widest">ОШИБКА 404</p>
      <h1 className="text-4xl font-semibold">Страница не найдена</h1>
      <p className="text-lg">
        Возможно, адрес изменился или в ссылке есть опечатка. Выберите нужный
        раздел студии «Шарик».
      </p>
      <nav aria-label="Разделы сайта" className="flex flex-wrap gap-6 underline">
        <Link href="/">На главную</Link>
        <Link href="/flowers/">Цветы и букеты</Link>
        <Link href="/balloons/">Воздушные шары</Link>
        <Link href="/event-decoration/">Оформление праздников</Link>
        <Link href="/works/">Наши работы</Link>
      </nav>
    </main>
  );
}
