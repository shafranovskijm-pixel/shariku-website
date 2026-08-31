import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

  const flowerImages = new Set(
    [...html.matchAll(/\/images\/flowers\/flower-\d{2}\.jpeg/g)].map(
      ([path]) => path,
    ),
  );
  assert.equal(flowerImages.size, 9);
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
});
