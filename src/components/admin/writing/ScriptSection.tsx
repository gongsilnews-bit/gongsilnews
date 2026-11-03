"use client";
/**
 * [대본 작성] 메뉴 (2026-11-03 사장님: "그냥 유튜브 대본 작성 이렇게 하자")
 *  동영상studio 대본 쓰기 화면(①~⑧)을 그대로 — 대본만 쓰고 멈춘다.
 *  ① 매물 소개 · 단지/시세 · 뉴스 기사 · 자유 주제 · 공실뉴스 → 용도 · 문체 · 첫 3초 · 영상 길이 · 쓸 AI → 대본 확인·고치기
 *  쓴 대본은 작성 중 초안(.gss)으로 내 PC 에 저절로 저장되고, [동영상studio에서 이어서]를 누르면 그 초안을 동영상studio 가 연다.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TextWizard from "@/components/admin/studio-video/TextWizard";
import { ModalPage, C, LIGHT } from "@/components/admin/studio-video/ui";

export default function ScriptSection() {
  const router = useRouter();
  const [k] = useState(0);
  // 대본 작성은 늘 밝은 화면 (2026-11-03 사장님: "주간모드로 해야지") — 떠 있는 창·메뉴까지 같은 색이 되게 화면 전체에 넣고, 떠나면 뺀다
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, v] of Object.entries(LIGHT)) root.style.setProperty(`--st-${key}`, v);
    root.style.setProperty("color-scheme", "light");
    return () => {
      for (const key of Object.keys(LIGHT)) root.style.removeProperty(`--st-${key}`);
      root.style.removeProperty("color-scheme");
    };
  }, []);
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", background: C.bg }}>
      <ModalPage.Provider value={true}>
        <TextWizard key={k} scriptOnly onCancel={() => {}} onDone={() => {}}
          onContinue={(file) => {
            try { sessionStorage.setItem("gs-video-open", JSON.stringify({ file, at: Date.now() })); } catch {}
            router.push("?menu=video", { scroll: false });
          }} />
      </ModalPage.Provider>
    </div>
  );
}
