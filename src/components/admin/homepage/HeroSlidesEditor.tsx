"use client";

import React from "react";
import { youtubeId, MAX_HERO_SLIDES, type HeroSlide } from "@/app/sites/[subdomain]/theme";

export interface EditorSkin {
  field: React.CSSProperties;
  label: React.CSSProperties;
  border: string;
  text: string;
  sub: string;
  dark?: boolean;
}

interface Props {
  skin: EditorSkin;
  slides: HeroSlide[];
  setSlide: (i: number, patch: Partial<HeroSlide>) => void;
  setCta: (i: number, patch: Partial<NonNullable<HeroSlide["cta"]>>) => void;
  addSlide: () => void;
  removeSlide: (i: number) => void;
  onSlidePhoto: (i: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  vacancies: any[];
  articles: any[];
}

/**
 * 첫 화면 슬라이드 편집 — PC 편집기와 폰 편집기가 같은 폼을 쓴다.
 *
 * 세로로 쌓이는 폼이라 좁은 화면에서도 그대로 통한다. 두 벌로 두면 칸을 하나
 * 늘릴 때마다 양쪽을 고쳐야 하고 한쪽은 반드시 낡는다.
 */
export default function HeroSlidesEditor({
  skin,
  slides,
  setSlide,
  setCta,
  addSlide,
  removeSlide,
  onSlidePhoto,
  vacancies,
  articles,
}: Props) {
  const { field, label, border, text, sub, dark } = skin;

  return (
    <div>
      <label style={label}>첫 화면 (최대 {MAX_HERO_SLIDES}장)</label>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
        한 장으로 시작합니다. 아래 <strong>[+ 장 추가]</strong>로 최대 {MAX_HERO_SLIDES}장까지 늘릴 수 있고,
        두 장 이상이면 6초(영상은 14초)마다 저절로 넘어갑니다. 사진도 영상도 안 넣으면 고른 색으로 채워집니다.
        <br />
        <strong>문구 칸을 비우면 그 줄은 화면에 나오지 않습니다.</strong> 사진만 크게 보이게 하려면 문구를 모두 비우세요.
      </p>

      {slides.map((sl, i) => {
        const vid = youtubeId(sl.youtube);
        const filled = sl.image || sl.youtube || sl.title || sl.highlight || sl.desc;

        return (
          <div
            key={i}
            style={{
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: "14px 14px 4px",
              marginBottom: 12,
              background: dark ? "#111827" : "#fcfdfe",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: text }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#059669", color: "#fff", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i + 1}
                </span>
                {i === 0 ? "첫 장" : `${i + 1}번째 장`}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {filled && (
                  <button
                    type="button"
                    onClick={() => setSlide(i, { image: "", youtube: "", title: "", highlight: "", desc: "" })}
                    style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    비우기
                  </button>
                )}
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlide(i)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    장 삭제
                  </button>
                )}
              </span>
            </div>

            {sl.image && !vid ? (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${border}`, marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.image} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
                <button
                  type="button"
                  onClick={() => setSlide(i, { image: "" })}
                  style={{ position: "absolute", top: 8, right: 8, padding: "5px 10px", borderRadius: 6, border: "none", background: "rgba(0,0,0,.66)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  사진 빼기
                </button>
              </div>
            ) : vid ? (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${border}`, marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
                <span style={{ position: "absolute", left: 8, top: 8, padding: "4px 9px", borderRadius: 5, background: "#ef4444", color: "#fff", fontSize: 11.5, fontWeight: 800 }}>
                  유튜브
                </span>
              </div>
            ) : (
              <label
                style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: sub, cursor: "pointer", marginBottom: 12 }}
              >
                + 사진 올리기
                <input type="file" accept="image/*" hidden onChange={(e) => onSlidePhoto(i, e)} />
              </label>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ ...label, marginBottom: 5 }}>유튜브 주소 (넣으면 영상이 먼저입니다)</label>
              <input
                style={field}
                value={sl.youtube || ""}
                onChange={(e) => setSlide(i, { youtube: e.target.value })}
                placeholder="https://youtu.be/..."
              />
              {sl.youtube && !vid && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
                  유튜브 주소가 아닌 것 같습니다. 주소창에 있는 것을 그대로 붙여넣어 주세요.
                </p>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ ...label, marginBottom: 5 }}>첫 줄</label>
              <input style={field} value={sl.title || ""} onChange={(e) => setSlide(i, { title: e.target.value })} placeholder="내놓을 물건이 있으신가요?" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...label, marginBottom: 5 }}>둘째 줄 (강조)</label>
              <input style={field} value={sl.highlight || ""} onChange={(e) => setSlide(i, { highlight: e.target.value })} placeholder="여기에 접수해 주세요" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...label, marginBottom: 5 }}>설명</label>
              <textarea
                style={{ ...field, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                value={sl.desc || ""}
                onChange={(e) => setSlide(i, { desc: e.target.value })}
                placeholder="연락처만 남겨 주시면 확인 후 바로 연락드립니다."
              />
            </div>

            {/* 버튼 — 장마다 보내는 곳이 다를 수 있다 */}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, marginBottom: 14 }}>
              <label style={{ ...label, marginBottom: 5 }}>버튼 문구</label>
              <input
                style={field}
                value={sl.cta?.label ?? ""}
                onChange={(e) => setCta(i, { label: e.target.value })}
                placeholder="1분이면 접수 끝"
              />
              <p style={{ margin: "6px 0 12px", fontSize: 12, color: sub }}>비우면 이 장에는 버튼이 나오지 않습니다.</p>

              <label style={{ ...label, marginBottom: 5 }}>누르면</label>
              <select
                style={field}
                value={sl.cta?.type || "intake"}
                onChange={(e) => setCta(i, { type: e.target.value as any })}
              >
                <option value="intake">물건 접수로 이동</option>
                <option value="location">오시는 길로 이동</option>
                <option value="vacancy">매물 하나 열기</option>
                <option value="article">기사 하나 열기</option>
                <option value="url">주소 직접 입력</option>
              </select>

              {sl.cta?.type === "vacancy" && (
                <div style={{ marginTop: 8 }}>
                  <select style={field} value={sl.cta?.vacancyId || ""} onChange={(e) => setCta(i, { vacancyId: e.target.value })}>
                    <option value="">매물을 고르세요</option>
                    {vacancies.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {[v.trade_type, v.building_name || [v.sigungu, v.dong].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                  {!vacancies.length && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>공실등록에 올린 매물이 없습니다.</p>
                  )}
                </div>
              )}

              {sl.cta?.type === "article" && (
                <div style={{ marginTop: 8 }}>
                  <select style={field} value={sl.cta?.articleId || ""} onChange={(e) => setCta(i, { articleId: e.target.value })}>
                    <option value="">기사를 고르세요</option>
                    {articles.map((a: any) => (
                      <option key={a.id} value={String(a.article_no || a.id)}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                  {!articles.length && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>발행된 기사가 없습니다.</p>
                  )}
                </div>
              )}

              {sl.cta?.type === "url" && (
                <input
                  style={{ ...field, marginTop: 8 }}
                  value={sl.cta?.url || ""}
                  onChange={(e) => setCta(i, { url: e.target.value })}
                  placeholder="https://..."
                />
              )}
            </div>
          </div>
        );
      })}

      {slides.length < MAX_HERO_SLIDES && (
        <button
          type="button"
          onClick={addSlide}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px dashed ${border}`, background: "transparent", color: sub, fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}
        >
          + 장 추가 ({slides.length}/{MAX_HERO_SLIDES})
        </button>
      )}
    </div>
  );
}
