import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { appendMarketingSource, marketingSourceHref, rememberMarketingSource } from "../app/marketing-attribution.ts";
import { recentWorks } from "../app/recent-works.ts";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function portfolioWorks() {
  const source = await read("app/works/page.tsx");
  const legacyList = source.match(/const works\s*=\s*\[([\s\S]*?)\n\];/)?.[1];
  assert.ok(legacyList, "The existing portfolio list must remain available");
  const legacyWorks = [...legacyList.matchAll(/\{\s*src:\s*"([^"]+)",\s*alt:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g)]
    .map(([, src, alt, category]) => ({ src, alt, category }));
  assert.equal(legacyWorks.length, 32, "Retain all 32 existing portfolio entries");
  return [...recentWorks, ...legacyWorks];
}

test("publishes the flower launch on the main page", async () => {
  const html = await read("out/index.html");

  assert.match(html, /Свежие цветы теперь в «Шарике»/);
  assert.doesNotMatch(html, /К 1 сентября — свежие цветы уже в «Шарике»/);
  assert.match(html, /Подобрать букет/);
  assert.match(html, /flower_order_click/);
  assert.doesNotMatch(html, /mc\.yandex\.ru\/watch|<script[^>]+src=["']https:\/\/mc\.yandex/);
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

test("keeps the ad source through untagged service pages without storing click IDs", () => {
  const now = 100000;
  const entry = "https://shariku.ru/?yclid=private-click&utm_source=yandex&utm_campaign=search&utm_content=balloons&email=private@example.test";
  const stored = rememberMarketingSource(entry, null, now);
  assert.doesNotMatch(stored, /private-click|private@example|email|yclid/);
  const next = rememberMarketingSource("https://shariku.ru/balloons/", stored, now + 1000);
  const sourceHref = marketingSourceHref("https://shariku.ru/balloons/", next);
  const contact = appendMarketingSource("https://wa.me/79243370123?text=Здравствуйте", sourceHref);
  assert.match(new URL(contact).searchParams.get("text"), /Яндекс\.Директ · кампания search · объявление balloons/);
});

test("does not credit organic visits to expired campaigns or merge a new campaign with the old one", () => {
  const now = 100000;
  const stored = rememberMarketingSource("https://shariku.ru/?utm_source=yandex&utm_campaign=old&utm_content=old_ad", null, now);
  assert.equal(rememberMarketingSource("https://shariku.ru/", stored, now + 1800001), null);
  assert.equal(rememberMarketingSource("https://shariku.ru/", "broken json", now), null);
  const next = rememberMarketingSource("https://shariku.ru/?utm_source=telegram&utm_campaign=new", stored, now + 1000);
  const href = marketingSourceHref("https://shariku.ru/flowers/", next);
  assert.equal(new URL(href).searchParams.get("utm_source"), "telegram");
  assert.equal(new URL(href).searchParams.get("utm_campaign"), "new");
  assert.equal(new URL(href).searchParams.has("utm_content"), false);
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

    const categoryActions = html.match(/<div class="category-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const href = categoryActions.match(/href="(https:\/\/wa\.me\/[^"]+)"/)?.[1];
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

test("portfolio assets have unique local sources, descriptive labels and nonempty files", async () => {
  const works = await portfolioWorks();
  assert.ok(recentWorks.length >= 60, "Retain all sixty newly supplied portfolio photographs");
  assert.equal(new Set(works.map((work) => work.src)).size, works.length, "A photo source must appear only once");
  await Promise.all(works.map(async (work) => {
    assert.match(work.src, /^\/images\/(?:recent|works)\/[^/?#]+\.(?:jpe?g|png|webp)$/i);
    assert.ok(work.alt.trim().length > 0, `${work.src}: descriptive alt text`);
    assert.ok(work.category.trim().length > 0, `${work.src}: category`);
    const asset = await stat(new URL(`public${work.src}`, root));
    assert.ok(asset.isFile() && asset.size > 0, work.src);
  }));
});

test("renders fifteen portfolio photos, all category filters and an accessible show-more action", async () => {
  const works = await portfolioWorks();
  const html = (await read("out/works/index.html")).replace(/<!--[\s\S]*?-->/g, "");
  const gallery = html.match(/<div class="works-grid">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(gallery, "Portfolio must show photographs in the initial HTML");
  const images = [...gallery.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(([, src]) => src);
  assert.equal(images.length, 15, "Initial gallery is limited to fifteen images");
  assert.equal([...gallery.matchAll(/<figure\b/g)].length, 15);
  assert.deepEqual(images, works.slice(0, 15).map((work) => work.src));

  const filters = html.match(/<div[^>]*aria-label="Категории работ"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(filters, "Portfolio categories must be usable buttons");
  const buttons = [...filters.matchAll(/<button\b([^>]*)>([^<]+)<\/button>/g)];
  const labels = buttons.map(([, , label]) => label);
  assert.deepEqual(labels, ["Все работы", ...new Set(works.map((work) => work.category))]);
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.every((label) => label.trim().length > 0));
  assert.equal(buttons.filter(([, attributes]) => attributes.includes('aria-pressed="true"')).length, 1);
  assert.match(buttons[0][1], /aria-pressed="true"/);
  assert.match(html, new RegExp(`aria-live="polite"[^>]*>Все работы · ${works.length} фото<`));
  assert.match(html, /<button\b[^>]*type="button"[^>]*>Показать ещё фото\s*<span>↓<\/span><\/button>/);
});

test("provides playable portfolio videos with existing sources, posters and no autoplay", async () => {
  const html = await read("out/works/index.html");
  const videos = [...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
  assert.ok(videos.length >= 2, "Both supplied video examples must be available");
  const sources = [];
  await Promise.all(videos.map(async ([, attributes, content]) => {
    assert.match(attributes, /\bcontrols(?:="")?(?:\s|$)/);
    assert.match(attributes, /\bpreload="none"/);
    assert.doesNotMatch(attributes, /\bautoplay/i);
    assert.match(attributes, /\baria-label="[^"]+"/);
    const poster = attributes.match(/\bposter="([^"]+)"/)?.[1];
    const src = content.match(/<source\b[^>]*src="([^"]+)"[^>]*type="video\/mp4"/)?.[1];
    assert.ok(poster, "Each video needs a poster");
    assert.ok(src, "Each video needs an MP4 source");
    sources.push(src);
    assert.match(src, /^\/videos\/recent\/[^/?#]+\.mp4$/);
    assert.match(poster, /^\/images\/recent\/[^/?#]+\.(?:jpe?g|png|webp)$/i);
    assert.ok(content.includes(`href="${src}"`), "Provide a direct-video fallback link");
    for (const path of [src, poster]) {
      const asset = await stat(new URL(`public${path}`, root));
      assert.ok(asset.isFile() && asset.size > 0, path);
    }
  }));
  assert.equal(new Set(sources).size, sources.length, "Avoid duplicate video entries");
});

test("keeps all five public pages indexable with one self-canonical", async () => {
  const paths = ["", "works/", "flowers/", "balloons/", "event-decoration/"];
  const titles = new Set();
  const descriptions = new Set();

  for (const path of paths) {
    const html = await read(`out/${path}index.html`);
    const titleTags = [...html.matchAll(/<title>(.*?)<\/title>/g)];
    const descriptionTags = [...html.matchAll(/<meta name="description" content="([^"]*)"\s*\/?\s*>/g)];
    const canonicalTags = [...html.matchAll(/<link rel="canonical" href="([^"]*)"\s*\/?\s*>/g)];
    const robotsTags = [...html.matchAll(/<meta name="robots" content="([^"]*)"\s*\/?\s*>/g)];

    assert.equal(titleTags.length, 1, path);
    assert.equal(descriptionTags.length, 1, path);
    assert.equal(canonicalTags.length, 1, path);
    assert.equal(canonicalTags[0][1], `https://shariku.ru/${path}`);
    assert.ok(robotsTags.every(([, value]) => !/noindex|nofollow/i.test(value)), path);
    assert.match(html, /<h1\b/, path);
    assert.ok(html.includes('href="https://yandex.ru/maps/org/103639380260/"'), path);
    assert.match(html, /"hasMap":"https:\/\/yandex\.ru\/maps\/org\/103639380260\/"/, path);
    titles.add(titleTags[0][1]);
    descriptions.add(descriptionTags[0][1]);
  }

  assert.equal(titles.size, paths.length);
  assert.equal(descriptions.size, paths.length);
});

test("exports a useful Russian 404 without home metadata or index directive", async () => {
  const html = await read("out/404.html");
  const titles = [...html.matchAll(/<title>(.*?)<\/title>/g)];
  const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)"\s*\/?\s*>/g)];

  assert.deepEqual(titles.map(([, title]) => title), ["Страница не найдена — студия «Шарик»"]);
  assert.deepEqual(robots.map(([, value]) => value), ["noindex"]);
  assert.equal([...html.matchAll(/<meta name="description"(?:\s|\/?>)/g)].length, 1);
  assert.doesNotMatch(html, /<link rel="canonical"(?:\s|\/?>)/);
  assert.match(html, /<h1[^>]*>Страница не найдена<\/h1>/);
  assert.doesNotMatch(html, /This page could not be found/);
  for (const path of ["/", "/flowers/", "/balloons/", "/event-decoration/", "/works/"]) {
    assert.ok(html.includes(`href="${path}"`), path);
  }
});

test("publishes all eleven supplied flower prices with the correct names", async () => {
  const html = (await read("out/flowers/index.html")).replace(/<!--[\s\S]*?-->/g, "");
  const table = html.match(/<table[^>]*>([\s\S]*?<caption>Прайс на цветы и зелень<\/caption>[\s\S]*?)<\/table>/)?.[1];
  assert.ok(table, "The flower price list must be readable HTML, not only an image");
  const rows = [...table.matchAll(/<tr[^>]*>\s*<th scope="row">([^<]+)<\/th>\s*<td>(\d+)\s*₽<\/td>\s*<\/tr>/g)]
    .map(([, name, price]) => [name, Number(price)]);
  assert.deepEqual(rows, [
    ["Хризантема Алтай", 350],
    ["Роза белая Candlelight (Эквадор)", 350],
    ["Гвоздика", 85],
    ["Альстромерия белая", 250],
    ["Роза красная Explorer (Эквадор)", 300],
    ["Роза EC Full Monty", 300],
    ["Роза EC Nina", 300],
    ["Роза Red Panthera", 300],
    ["Лилия", 500],
    ["Зелень на выбор", 100],
    ["Гипсофила", 150],
  ]);
  assert.match(html, /href="\/images\/flowers\/catalog-2026\.png"/);
  assert.match(html, /src="\/images\/flowers\/red-panthera\.png"/);
});

test("exports legal documents with the proprietor's verified details and working navigation", async () => {
  const cases = [
    ["privacy/", "Политика конфиденциальности"],
    ["analytics-consent/", "Согласие на обработку данных для аналитики"],
    ["requisites/", "Сведения и контакты"],
    ["ordering/", "Заказ, доставка и оплата"],
  ];
  const sitemap = await read("out/sitemap.xml");
  for (const [path, heading] of cases) {
    const html = await read(`out/${path}index.html`);
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1];
    assert.equal(h1, heading, path);
    assert.ok(html.includes(`rel="canonical" href="https://shariku.ru/${path}"`), path);
    for (const detail of ["Байтимирова Екатерина Алексеевна", "252000193603", "326253600056261"]) {
      assert.ok(html.includes(detail), `${path}: ${detail}`);
    }
    assert.match(html, /href="mailto:katti_silence@mail\.ru"/);
    assert.match(html, /aria-label="Документы и условия"/);
    assert.match(html, /<button[^>]*>Настройки аналитики<\/button>/);
    for (const [legalPath] of cases) {
      assert.ok(html.includes(`href="/${legalPath}"`), `${path}: ${legalPath}`);
    }
    assert.ok(sitemap.includes(`https://shariku.ru/${path}`), path);
  }
});

test("does not embed a tracking pixel or third-party analytics script before consent", async () => {
  for (const path of ["", "flowers/", "balloons/", "event-decoration/", "works/", "privacy/", "analytics-consent/", "requisites/", "ordering/"]) {
    const html = await read(`out/${path}index.html`);
    assert.doesNotMatch(html, /mc\.yandex\.ru\/watch|<script[^>]+src=["']https:\/\/mc\.yandex/, path);
  }
});

test("keeps public business schema accurate and excludes private source URLs", async () => {
  for (const path of ["", "flowers/", "balloons/", "event-decoration/", "works/"]) {
    const html = await read(`out/${path}index.html`);
    const schemas = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(([, content]) => JSON.parse(content));
    const business = schemas.find((schema) => schema["@type"] === "LocalBusiness");
    assert.ok(business, path);
    assert.equal(business.url, "https://shariku.ru/");
    assert.equal(business.address.streetAddress, "Садовая улица, 3г");
    assert.equal(business.address.addressLocality, "Уссурийск");
    assert.deepEqual(business.telephone, ["+7 924 337-01-23", "+7 924 336-30-07"]);
    for (const asset of business.image) assert.equal(new URL(asset).origin, "https://shariku.ru");
    assert.doesNotMatch(JSON.stringify(schemas), /web\.telegram\.org|5550254442|localhost|127\.0\.0\.1|api\.timeweb\.cloud|file:\/\/|[A-Z]:\\\\/i, path);
  }
});
