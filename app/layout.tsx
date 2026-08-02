import type { Metadata } from "next";
import "./globals.css";
import Metrika from "./Metrika";

export const metadata: Metadata = {
  metadataBase: new URL("https://shariku.ru"),
  title: {
    default: "Воздушные шары в Уссурийске — студия декора «Шарик»",
    template: "%s | Студия «Шарик»",
  },
  description:
    "Воздушные шары, букеты, фотозоны и оформление праздников в Уссурийске. Доставка, монтаж и индивидуальный декор от студии «Шарик».",
  keywords: [
    "воздушные шары Уссурийск",
    "шары с доставкой Уссурийск",
    "оформление праздников Уссурийск",
    "фотозона Уссурийск",
    "букеты из шаров",
    "студия декора Шарик",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Студия декора «Шарик»",
    title: "Воздушные шары и оформление праздников в Уссурийске",
    description: "Букеты из шаров, фотозоны и оформление событий с доставкой по Уссурийску и Приморскому краю.",
    images: [{ url: "/images/hero.jpeg", width: 1080, height: 1350, alt: "Фотозона студии декора Шарик" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Студия декора «Шарик» — Уссурийск",
    description: "Воздушные шары, фотозоны и оформление праздников.",
    images: ["/images/hero.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
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
              name: "Шарик — студия декора",
              description: "Воздушные шары, букеты, фотозоны и оформление праздников в Уссурийске.",
              url: "https://shariku.ru/",
              telephone: "+7 908 455-16-35",
              image: [
                "https://shariku.ru/images/hero.jpeg",
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
              sameAs: [],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
