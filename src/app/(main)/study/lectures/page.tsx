import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// 강의목록은 2026-10-26부터 부동산특강 첫 화면(/study) — 예전 주소는 그대로 넘겨준다 (?tab= 등 유지)
export default async function StudyLecturesRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
  const s = q.toString();
  redirect("/study" + (s ? "?" + s : ""));
}
