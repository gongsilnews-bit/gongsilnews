"use client";

// 고급 화면전환의 번짐·색 갈라짐 — SVG 필터 (굽기 studio-app/src/video/transAdv.js bakeFrame 과 같은 순서: 제자리에서 번짐 → 색 갈라짐 → 옮기기·키우기)
import React from "react";
import type { TransFxSpec } from "./transitions";

export function TransFx({ fid, fx }: { fid: string; fx?: TransFxSpec }) {
  if (!fx || (!fx.from && !fx.to)) return null;
  const one = (k: "from" | "to") => {
    const v = fx[k];
    if (!v) return null;
    return (
      // 필터 영역 = 화면 그대로, 가장자리는 끝 색을 늘려서 (번져도 가장자리가 비지 않게)
      <filter key={k} id={`${fid}-${k}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={`${v.sx.toFixed(2)} ${v.sy.toFixed(2)}`} edgeMode="duplicate" result="b" />
        {v.rgb > 0.01 && (
          <>
            <feOffset in="b" dx={v.rgb} dy={0} result="ro" />
            <feColorMatrix in="ro" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feOffset in="b" dx={-v.rgb} dy={0} result="bo" />
            <feColorMatrix in="bo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bb" />
            <feComposite in="r" in2="g" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="rg" />
            <feComposite in="rg" in2="bb" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} />
          </>
        )}
      </filter>
    );
  };
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>{one("from")}{one("to")}</defs>
    </svg>
  );
}
