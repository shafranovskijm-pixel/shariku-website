import type { Metadata } from "next";
import "./globals.css";
import MessengerAttribution from "./MessengerAttribution";
import Metrika from "./Metrika";
import { YANDEX_MAPS_URL } from "./business-location";

export const metadata: Metadata = {
  metadataBase: new URL("https://shariku.ru"),
  title: {
    default: "Цветы и воздушные шары в Уссурийске — студия «Шарик»",
    template: "%s | Студия «Шарик»",
  },
  description:
    "Свежие цветы, букеты, воздушные шары, фотозоны, пресс-воллы и оформление праздников в Уссурийске. Заказ, доставка и монтаж от студии «Шарик».",
  keywords: [
    "цветы Уссурийск",
    "букеты Уссурийск",
    "доставка цветов Уссурийск",
    "цветы к 1 сентября Уссурийск",
    "воздушные шары Уссурийск",
    "шары с доставкой Уссурийск",
    "оформление праздников Уссурийск",
    "фотозона Уссурийск",
    "пресс-волл Уссурийск",
    "оформление свадьбы Уссурийск",
    "свадебный президиум Уссурийск",
    "оформление выпускного Уссурийск",
    "оформление школы шарами Уссурийск",
    "оформление детского сада Уссурийск",
    "букеты из шаров",
    "печать на шарах Уссурийск",
    "студия оформления Шарик",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Студия оформления «Шарик»",
    title: "Цветы, воздушные шары и оформление праздников в Уссурийске",
    description: "Свежие букеты, воздушные шары, фотозоны и оформление событий с доставкой по Уссурийску.",
    images: [{ url: "/images/flowers/flower-01.jpeg", width: 1037, height: 839, alt: "Нежный букет цветов студии Шарик" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Студия оформления «Шарик» — Уссурийск",
    description: "Свежие цветы, воздушные шары, фотозоны и оформление праздников.",
    images: ["/images/flowers/flower-01.jpeg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Metrika />
        <MessengerAttribution />
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/111239502"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://shariku.ru/#business",
              name: "Шарик — цветы, воздушные шары и студия оформления",
              description: "Свежие цветы, букеты, воздушные шары, фотозоны, пресс-воллы и оформление праздников в Уссурийске.",
              url: "https://shariku.ru/",
              telephone: ["+7 924 337-01-23", "+7 924 336-30-07"],
              image: [
                "https://shariku.ru/images/flowers/flower-01.jpeg",
                "https://shariku.ru/images/hero.jpeg",
                "https://shariku.ru/images/storefront.jpeg",
                "https://shariku.ru/images/wedding.jpeg",
                "https://shariku.ru/images/birthday.jpeg",
              ],
              priceRange: "₽₽",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Садовая улица, 3г",
                addressLocality: "Уссурийск",
                addressRegion: "Приморский край",
                addressCountry: "RU",
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  opens: "10:00",
                  closes: "19:00",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: "Sunday",
                  opens: "10:00",
                  closes: "18:00",
                },
              ],
              areaServed: ["Уссурийск", "Приморский край"],
              hasMap: YANDEX_MAPS_URL,
              sameAs: [YANDEX_MAPS_URL],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
