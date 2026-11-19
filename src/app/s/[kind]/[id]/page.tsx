// 앱에서 공유한 공실·기사 — 받은 사람을 앱으로 (2026-11-19 사장님: 직방처럼. 모바일웹은 그대로 두고 앱 공유만 이 주소)
//  /s/v/<공실 id> · /s/n/<기사 번호 또는 id>
//  카톡 미리보기(제목·사진)는 이 서버 화면이 내보낸다. 받은 화면은 사진·제목·짧은 소개 + [공실뉴스 앱에서 보기]
//  안드로이드 폰만 이 화면을 보고, 아이폰·PC·우리 앱 안에서는 원래 웹 화면으로 바로 넘긴다 (ShareLanding)
import type { Metadata } from "next";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { getArticleDetail } from "@/app/actions/article";
import { getCleanAddrText, getPriceText } from "@/app/(map)/gongsil/gongsilHelpers";
import ShareLanding, { type ShareCard } from "./ShareLanding";

export const revalidate = 60;

async function load(kind: string, id: string): Promise<ShareCard | null> {
  try {
    if (kind === "v") {
      const res = await getVacancyDetail(id);
      const v = res.success ? res.data : null;
      if (!v) return null;
      const addr = getCleanAddrText(v);
      const price = getPriceText(v);
      return {
        kind: "v",
        title: `${addr} ${price}`.trim(),
        desc: [v.property_type, v.trade_type].filter(Boolean).join(" · ") || "공실 매물",
        image: res.photos?.[0]?.url || null,
        price,
        place: addr,
        webPath: `/m/gongsil?id=${encodeURIComponent(String(v.id))}`,
      };
    }
    if (kind === "n") {
      const res = await getArticleDetail(id);
      const a = res.success ? (res.data as { id: string; article_no?: number | null; title: string; subtitle?: string | null; thumbnail_url?: string | null; status?: string; is_deleted?: boolean } | null) : null;
      if (!a || a.is_deleted || (a.status && a.status !== "APPROVED")) return null;
      const sub = String(a.subtitle || "").split(/\n+/).map((x) => x.trim()).find(Boolean) || "";
      return {
        kind: "n",
        title: a.title,
        desc: sub || "공실뉴스 기사",
        image: a.thumbnail_url || null,
        price: "",
        place: "",
        webPath: `/m/news/${a.article_no || a.id}`,
      };
    }
  } catch (e) {
    console.error("[share] load failed", e);
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string; id: string }> }): Promise<Metadata> {
  const { kind, id } = await params;
  const c = await load(kind, id);
  if (!c) return { title: "공실뉴스", robots: { index: false } };
  const title = c.kind === "v" ? `${c.title} | 공실뉴스` : c.title;
  return {
    title,
    description: c.desc,
    robots: { index: false }, // 원래 공실·기사 주소가 검색에 잡히게 — 이 공유 주소는 검색에 넣지 않는다
    openGraph: { title, description: c.desc, images: c.image ? [c.image] : [] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const c = await load(kind, id);
  return <ShareLanding card={c} />;
}
