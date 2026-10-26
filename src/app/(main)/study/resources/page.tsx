import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// 자료실 은 2026-10-26 공실뉴스부동산 쪽으로 옮겼다. 예전 주소·퍼진 링크는 새 주소로 (?board= 등은 그대로)
export default async function StudyResourcesRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
  const s = q.toString();
  redirect("/newsrealty/resources" + (s ? "?" + s : ""));
}
