export type OrderService = "balloons" | "flowers" | "decoration" | "other";

export function orderLink(service: OrderService = "other", subject?: string) {
  const params = new URLSearchParams({ service });
  if (subject) params.set("subject", subject.slice(0, 200));
  return `/order/?${params.toString()}`;
}

export function categoryOrderService(slug: string): OrderService {
  return slug === "flowers" ? "flowers" : slug === "balloons" ? "balloons" : "decoration";
}
