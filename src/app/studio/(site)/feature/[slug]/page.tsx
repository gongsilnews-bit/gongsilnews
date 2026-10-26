import React from "react";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import { FEATURES, featureBySlug } from "@/components/studio-site/studioFeatures";

/**
 * 공실스튜디오 기능 상세 (/studio/feature/[slug]) — 브루 기능 페이지와 같은 6칸 (2026-10-26 사장님)
 *  ① 큰 제목 두 줄 + 설명 + 버튼 + 앱 화면  ② 한 줄 약속  ③ 좋은 점 3가지  ④ 어떻게 하나요(3단계)  ⑤ 활용  ⑥ 마지막 한 줄
 * 글이 없는 칸은 안 그린다.
 * 그림은 실제 앱에서 찍은 화면 (public/studio-shots/f-<slug>.webp · f-<slug>-<1~3>.webp, 2026-10-26 Claude 가 앱을 띄워 캡처 · 이메일·이름·전화 흐림).
 * 큰 화면 그림이 없으면 자리 표시, 특징 그림이 없으면 그림 없이 글만.
 */
const ACCENT = "#e8890c";
const SOFT = "#fdf4e7";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  return f ? { title: `${f.name} | 공실스튜디오`, description: f.lead } : {};
}

/** 찍어 둔 화면이 있으면 그 주소 */
function shotSrc(name: string): string | null {
  return fs.existsSync(path.join(process.cwd(), "public", "studio-shots", `${name}.webp`)) ? `/studio-shots/${name}.webp` : null;
}

function Shot({ label, ratio = "16 / 9", max = 1000, src }: { label: string; ratio?: string; max?: number; src?: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label} loading="lazy" style={{ display: "block", margin: "48px auto 0", width: "100%", maxWidth: max, height: "auto", borderRadius: 14, border: "1px solid #e5e7eb", boxShadow: "0 24px 60px rgba(31,23,20,0.16)" }} />
    );
  }
  return (
    <div style={{ margin: "48px auto 0", width: "100%", maxWidth: max, aspectRatio: ratio, borderRadius: 18, background: "repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 14px,#eef0f3 14px,#eef0f3 28px)", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 15, fontWeight: 600 }}>
      {label} 자리
    </div>
  );
}

const btn = (solid: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 150, height: 58, padding: "0 28px", borderRadius: 10, fontSize: 17, fontWeight: 700, textDecoration: "none", background: solid ? ACCENT : "#fff", color: solid ? "#fff" : ACCENT, border: `1px solid ${ACCENT}` });
const h2: React.CSSProperties = { fontSize: "clamp(28px,3.4vw,40px)", lineHeight: 1.3, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 16px" };
const sec: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "112px 24px 0", textAlign: "center" };

export default async function StudioFeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", color: "#111827", wordBreak: "keep-all" }}>
      <StudioSiteHeader />

      {/* ① */}
      <section style={{ ...sec, paddingTop: 88 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#6b7280", margin: "0 0 12px" }}>{f.name}</p>
        <h1 style={{ fontSize: "clamp(38px,5vw,60px)", lineHeight: 1.22, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 24px" }}>{f.title[0]}<br />{f.title[1]}</h1>
        <p style={{ fontSize: 18, lineHeight: 1.75, color: "#4b5563", margin: "0 auto 32px", maxWidth: 680 }}>{f.lead}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/studio#download" style={btn(true)}>앱 받기</Link>
        </div>
        <Shot label={`${f.name} 앱 화면`} src={shotSrc(`f-${f.slug}`)} />
      </section>

      {/* ② */}
      {f.promise && (
        <section style={sec}><h2 style={h2}>{f.promise}</h2></section>
      )}

      {/* ③ */}
      {f.points?.map((pt, i) => {
        const src = shotSrc(`f-${f.slug}-${i + 1}`);
        return (
          <section key={pt.t} style={{ ...sec, paddingTop: i === 0 ? 72 : src ? 96 : 56 }}>
            <h3 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>{pt.t}</h3>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4b5563", margin: 0 }}>{pt.d}</p>
            {src && <Shot label={pt.t} max={880} src={src} />}
          </section>
        );
      })}

      {/* ④ */}
      {f.steps && (
        <div style={{ background: SOFT, marginTop: 112, paddingBottom: 112 }}>
          <section style={sec}>
            <h2 style={h2}>{f.name}, 어떻게 하나요?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginTop: 40, textAlign: "left" }}>
              {f.steps.map((s, i) => (
                <div key={s.t} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 26 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: ACCENT, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>{i + 1}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{s.t}</div>
                  <div style={{ fontSize: 15.5, lineHeight: 1.7, color: "#4b5563" }}>{s.d}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ⑤ */}
      {f.uses && (
        <section style={sec}>
          <h2 style={h2}>{f.name} 이렇게 활용해 보세요</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18, marginTop: 40, textAlign: "left" }}>
            {f.uses.map((u) => (
              <div key={u.t}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{u.t}</div><div style={{ fontSize: 15, lineHeight: 1.65, color: "#4b5563" }}>{u.d}</div></div>
            ))}
          </div>
        </section>
      )}

      {/* ⑥ */}
      <div style={{ background: "#1f1714", color: "#fff", marginTop: 112, padding: "88px 24px", textAlign: "center" }}>
        <h2 style={{ ...h2, color: "#fff" }}>{f.end || `${f.name}, 공실스튜디오로 시작하세요.`}</h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/studio#download" style={btn(true)}>앱 받기</Link>
          <Link href="/studio/pricing" style={{ ...btn(false), color: "#fff", background: "transparent", borderColor: "rgba(255,255,255,.7)" }}>이용료 보기</Link>
        </div>
      </div>
    </div>
  );
}
