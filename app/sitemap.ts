import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://shariku.ru/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://shariku.ru/works/",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://shariku.ru/flowers/",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://shariku.ru/balloons/",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://shariku.ru/event-decoration/",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
