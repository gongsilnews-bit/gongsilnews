import { redirect } from "next/navigation";

// 2026-10-26 신청·혜택·금액은 공실뉴스부동산 하나로 통일 — 예전 부동산특강(공실스터디) 주소는 그쪽으로
export default function StudyBenefitsRedirect() {
  redirect("/newsrealty/benefits/brokerage-article");
}
