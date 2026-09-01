import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { appendMarketingSource } from "../app/marketing-attribution.ts";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("publishes the flower launch on the main page", async () => {
  const html = await read("out/index.html");

  assert.match(html, /Свежие цветы теперь в «Шарике»/);
  assert.doesNotMatch(html, /К 1 сентября — свежие цветы уже в «Шарике»/);
  assert.match(html, /Подобрать букет/);
  assert.match(html, /flower_order_click/);
  assert.match(html, /111239502/);
  assert.match(html, /Цветы и воздушные шары в Уссурийске/);
  assert.doesNotMatch(html, /href="\/works"/);

  const flowerImages = new Set(
    [...html.matchAll(/\/images\/flowers\/flower-\d{2}\.jpeg/g)].map(
      ([path]) => path,
    ),
  );
  assert.equal(flowerImages.size, 9);
});

test("identifies Shariku and the requested service in WhatsApp messages", async () => {
  const html = await read("out/index.html");
  const messages = [...html.matchAll(/href="(https:\/\/wa\.me\/[^\"]+)"/g)].map(
    ([, href]) =>
      new URL(href.replaceAll("&amp;", "&")).searchParams.get("text") ?? "",
  );

  assert.ok(messages.length >= 20);
  assert.ok(messages.every((message) => message.includes("Пишу с сайта shariku.ru")));

  for (const subject of [
    "Воздушные шары",
    "Выпускные, школы и детские сады",
    "Пресс-воллы и бренд-зоны",
    "Фотозоны",
    "Свадебное оформление",
    "оформление, похожее на работу из портфолио",
  ]) {
    assert.ok(messages.some((message) => message.includes(subject)), subject);
  }

  const telegramHref = html.match(/href="(https:\/\/t\.me\/[^\"]+)"/)?.[1];
  assert.ok(telegramHref);
  const telegramMessage = new URL(
    telegramHref.replaceAll("&amp;", "&"),
  ).searchParams.get("text");
  assert.match(telegramMessage ?? "", /Пишу с сайта shariku\.ru/);
});

test("identifies Shariku in the portfolio WhatsApp message", async () => {
  const html = await read("out/works/index.html");
  const href = html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/)?.[1];
  assert.ok(href);
  const message = new URL(href.replaceAll("&amp;", "&")).searchParams.get("text");

  assert.match(message ?? "", /Пишу с сайта shariku\.ru/);
  assert.match(message ?? "", /ваши работы/);
});

test("adds useful ad attribution to WhatsApp without exposing yclid", () => {
  const base =
    "https://wa.me/79243370123?text=" +
    encodeURIComponent("Здравствуйте! Интересуют воздушные шары.");
  const landing =
    "https://shariku.ru/balloons/?yclid=secret-click-id&utm_source=yandex&utm_campaign=shariku_search&utm_content=balloons_1";

  const attributed = appendMarketingSource(base, landing);
  const message = new URL(attributed).searchParams.get("text") ?? "";

  assert.match(message, /Источник обращения: Яндекс\.Директ/);
  assert.match(message, /кампания shariku_search/);
  assert.match(message, /объявление balloons_1/);
  assert.doesNotMatch(message, /secret-click-id/);
  assert.equal(appendMarketingSource(attributed, landing), attributed);
});

test("does not alter organic WhatsApp links", () => {
  const base =
    "https://wa.me/79243370123?text=" +
    encodeURIComponent("Здравствуйте! Хочу уточнить стоимость.");

  assert.equal(appendMarketingSource(base, "https://shariku.ru/flowers/"), base);
});

test("makes the mobile header call action a real phone link", async () => {
  const html = await read("out/index.html");
  const headerPhone = html.match(
    /<a[^>]*class="header-phone"[^>]*href="([^"]+)"[^>]*>/,
  );

  assert.ok(headerPhone);
  assert.equal(headerPhone[1], "tel:+79243370123");
  assert.match(html, /aria-label="Позвонить Екатерине по номеру \+7 924 337-01-23"/);
});

test("keeps the post-campaign flower copy and Vladivostok cutoff", async () => {
  const source = await read("app/SeasonalFlowerTitle.tsx");

  assert.match(source, /2026-09-02T00:00:00\+10:00/);
  assert.match(source, /Свежие цветы теперь в «Шарике»/);
});

test("keeps portfolio and SEO routes available", async () => {
  const [works, sitemap] = await Promise.all([
    read("out/works/index.html"),
    read("out/sitemap.xml"),
  ]);

  assert.match(works, /Наши работы/);
  assert.match(sitemap, /https:\/\/shariku\.ru\//);
  assert.match(sitemap, /https:\/\/shariku\.ru\/works\//);
  assert.match(sitemap, /https:\/\/shariku\.ru\/flowers\//);
  assert.match(sitemap, /https:\/\/shariku\.ru\/balloons\//);
  assert.match(sitemap, /https:\/\/shariku\.ru\/event-decoration\//);
  assert.doesNotMatch(sitemap, /<lastmod>/);
});

test("renders focused category landings with canonical metadata and precise CTA context", async () => {
  const cases = [
    {
      file: "out/flowers/index.html",
      canonical: "https://shariku.ru/flowers/",
      heading: "Цветы и букеты в Уссурийске",
      subject: "букет по вашему бюджету",
    },
    {
      file: "out/balloons/index.html",
      canonical: "https://shariku.ru/balloons/",
      heading: "Воздушные шары в Уссурийске",
      subject: "воздушные шары — повод, дата и желаемый бюджет",
    },
    {
      file: "out/event-decoration/index.html",
      canonical: "https://shariku.ru/event-decoration/",
      heading: "Оформление праздников и фотозоны в Уссурийске",
      subject: "оформление праздника — повод, дата, площадка и бюджет",
    },
  ];

  for (const item of cases) {
    const html = await read(item.file);
    assert.match(html, new RegExp(`<h1>${item.heading}</h1>`));
    assert.match(html, new RegExp(`rel="canonical" href="${item.canonical}"`));
    assert.match(html, /"@type":"Service"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /property="og:type" content="website"/);
    assert.match(html, /property="og:locale" content="ru_RU"/);
    assert.match(html, /property="og:site_name" content="Студия оформления «Шарик»"/);
    assert.doesNotMatch(html, /Студия «Шарик» \| Студия «Шарик»/i);

    const href = html.match(/href="(https:\/\/wa\.me\/[^"]+)"/)?.[1];
    assert.ok(href, item.file);
    const message = new URL(href.replaceAll("&amp;", "&")).searchParams.get("text") ?? "";
    assert.match(message, /Пишу с сайта shariku\.ru/);
    assert.ok(message.includes(item.subject), item.subject);
  }
});

test("gives the portfolio its own social metadata and category links", async () => {
  const html = await read("out/works/index.html");

  assert.match(html, /name="twitter:title" content="Работы студии оформления «Шарик»"/);
  assert.match(html, /name="twitter:image" content="https:\/\/shariku\.ru\/images\/works\/work-069\.jpeg"/);
  assert.match(html, /href="\/flowers\/"/);
  assert.match(html, /href="\/balloons\/"/);
  assert.match(html, /href="\/event-decoration\/"/);
});
