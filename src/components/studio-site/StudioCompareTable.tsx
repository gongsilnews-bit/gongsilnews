"use client";
import React from "react";
import Link from "next/link";
import { ProTag } from "@/components/admin/ProBadge";
import { useStartHref } from "./useStartHref";

/**
 * 부동산회원 · 공실뉴스부동산 비교표 — 금액안내(/newsrealty/pricing) 가격 칸 아래 (2026-11-05 사장님: 소개 첫 화면에서 금액안내로 옮김)
 * /pro 주소가 여기(#pro)로 온다
 */
const ACCENT = "#e8890c";
const ACCENT_SOFT = "#fdf4e7";
export const COMPARE: { t: string; free: string; pro: string }[] = [
  { t: "공실뉴스에 거는 공실", free: "광고 중 3건", pro: "광고 중 20건 + 내 홈페이지 전용 20건" },
  { t: "블로그 · SNS · 유튜브 대본 쓰기", free: "한 달 3번", pro: "무제한" },
  { t: "공실뉴스 기사 쓰기", free: "—", pro: "한 달 4건" },
  { t: "뉴스칼럼 (내 기사로 블로그 · SNS)", free: "—", pro: "됨" },
  { t: "AI 매물보고서", free: "표지 · 개요", pro: "모든 쪽 · AI 채우기" },
  { t: "유리창 홍보지", free: "\"숫자 크게\" 디자인", pro: "모든 디자인" },
  { t: "물건접수홈페이지", free: "—", pro: "집주인 접수 · 로고 · 색상 · 사진 · 영상" },
  { t: "포토studio · AI 이미지", free: "—", pro: "됨" },
  { t: "고객관리 · 기사 아래 광고 · 배너", free: "—", pro: "됨" },
  { t: "글 속 링크", free: "공실뉴스로", pro: "내 물건접수홈페이지로" },
  { t: "이름 옆 딱지", free: "—", pro: "NEWS" },
];

const CSS = `
.cmp-sec{max-width:1120px;margin:0 auto;padding:96px 24px 120px;text-align:center;font-family:"Pretendard Variable","Pretendard",-apple-system,sans-serif;color:#111827;word-break:keep-all}
.cmp-h2{font-size:clamp(28px,3.4vw,40px);line-height:1.3;font-weight:900;letter-spacing:-0.02em;margin:0 0 18px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
.cmp-p{font-size:17px;line-height:1.75;color:#4b5563;margin:0 auto 32px;max-width:680px}
.cmp-p b{color:${ACCENT}}
.sv-cmp{max-width:860px;margin:8px auto 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;text-align:left}
.sv-cmp .h,.sv-cmp .r{display:grid;grid-template-columns:1.3fr 1fr 1.4fr;align-items:center}
.sv-cmp .h{background:#f9fafb;font-size:15px;font-weight:800;color:#374151}
.sv-cmp .h span,.sv-cmp .r span{padding:14px 20px}
.sv-cmp .r{border-top:1px solid #f1f5f9;font-size:15px;color:#4b5563}
.sv-cmp .r .t{font-weight:700;color:#111827}
.sv-cmp .pro{background:${ACCENT_SOFT};color:#111827;font-weight:700}
.sv-cmp .h .pro{color:${ACCENT}}
.cmp-btn{display:inline-flex;align-items:center;justify-content:center;min-width:150px;height:56px;padding:0 28px;border-radius:10px;font-size:17px;font-weight:700;text-decoration:none;margin-top:32px;background:#fff;color:${ACCENT};border:1px solid ${ACCENT}}
@media (max-width:640px){.sv-cmp .h span,.sv-cmp .r span{padding:12px 10px;font-size:13.5px}}
`;

export default function StudioCompareTable() {
  const startHref = useStartHref(); // 로그인 안 했으면 회원가입, 했으면 관리자
  return (
    <section id="pro" className="cmp-sec" style={{ scrollMarginTop: 80 }}>
      <style>{CSS}</style>
      <h2 className="cmp-h2">공실뉴스부동산 <ProTag size="md" style={{ fontSize: 20, padding: "4px 9px 5px", borderRadius: 5 }} /> 가 되면</h2>
      <p className="cmp-p">무료로 시작해 한 달 3번 써 보고,<br />더 많이 · 더 멀리 알리고 싶을 때 <b>공실뉴스부동산</b>이 되세요.</p>
      <div className="sv-cmp">
        <div className="h"><span /><span>부동산회원</span><span className="pro">공실뉴스부동산</span></div>
        {COMPARE.map((r) => (
          <div key={r.t} className="r"><span className="t">{r.t}</span><span>{r.free}</span><span className="pro">{r.pro}</span></div>
        ))}
      </div>
      <Link href={startHref} className="cmp-btn">무료로 시작하기</Link>
    </section>
  );
}
