import { redirect } from "next/navigation";

export default async function MobileNewsRedirectPage({ searchParams }: { searchParams: any }) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams();
  if (resolvedParams) {
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryString.append(key, v));
        } else {
          queryString.append(key, String(value));
        }
      }
    });
  }
  const qs = queryString.toString();
  redirect(`/m/news_map${qs ? `?${qs}` : ""}`);
}
