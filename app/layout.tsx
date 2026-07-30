import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Шарик — воздушные шары и оформление праздников",
  description:
    "Студия декора и воздушных шаров в Приморском крае. Букеты, фотозоны, оформление свадеб, дней рождения и других событий.",
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
      <body>{children}</body>
    </html>
  );
}
