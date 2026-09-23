"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createArticleDraft } from "./draftTemplate";
import type { ArticleDraftResult, DraftChannel, DraftLength, DraftStyle, DraftVacancy } from "./types";
import styles from "./ArticleDraftStudio.module.css";

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  onApply: (draft: ArticleDraftResult) => void;
  myVacancies: DraftVacancy[];
  isLoadingVacancies: boolean;
  fetchMyVacancies: () => void;
  initialVacancyId?: string;
  variant?: "modal" | "standalone";
}

type MediaKind = "proof" | "photo" | "map" | "roadview";

function createProofImage(vacancy: DraftVacancy) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const address = [vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_addr].filter(Boolean).join(" ");
  const rows = [
    ["공실광고번호", String(vacancy.vacancy_no || "-")],
    ["소재지", address || "-"],
    ["면적", `공급 ${vacancy.supply_m2 || "-"}㎡ / 전용 ${vacancy.exclusive_m2 || "-"}㎡`],
    ["구조", `방 ${vacancy.room_count || "-"}개 · 욕실 ${vacancy.bath_count || "-"}개 · ${vacancy.direction || "방향 확인"}`],
    ["주요 특징", Array.isArray(vacancy.themes) ? vacancy.themes.join(" · ") : String(vacancy.themes || vacancy.options || "현장 확인")],
  ];
  ctx.fillStyle = "#f1f3f5";
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, 1200, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 38px sans-serif";
  ctx.fillText("공실뉴스 실매물 등록 확인", 58, 70);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(48, 144, 1104, 478);
  ctx.strokeStyle = "#d7dce2";
  ctx.strokeRect(48, 144, 1104, 478);
  ctx.fillStyle = "#111827";
  ctx.font = "800 34px sans-serif";
  ctx.fillText(vacancy.building_name || "공실 매물", 82, 202);
  rows.forEach(([label, value], index) => {
    const y = 265 + index * 68;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(72, y - 38, 210, 54);
    ctx.fillStyle = "#667085";
    ctx.font = "700 22px sans-serif";
    ctx.fillText(label, 92, y - 3);
    ctx.fillStyle = "#202631";
    ctx.font = "600 23px sans-serif";
    const clipped = value.length > 49 ? `${value.slice(0, 49)}…` : value;
    ctx.fillText(clipped, 315, y - 3);
  });
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(48, 622, 1104, 5);
  return canvas.toDataURL("image/png");
}

export default function ArticleDraftStudio({ isOpen = true, onClose, onApply, myVacancies, isLoadingVacancies, fetchMyVacancies, initialVacancyId, variant = "modal" }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [channel, setChannel] = useState<DraftChannel>("news");
  const [draftStyle, setDraftStyle] = useState<DraftStyle>("narration");
  const [length, setLength] = useState<DraftLength>("standard");
  const [draft, setDraft] = useState<ArticleDraftResult | null>(null);
  const [loadedVacancy, setLoadedVacancy] = useState<DraftVacancy | null>(null);
  const [proofImage, setProofImage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaKind>("photo");
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchMyVacancies();
    // fetchMyVacancies는 부모 렌더마다 새 참조가 될 수 있으므로 열림 상태만 기준으로 실행합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || selectedId) return;
    setSelectedId(initialVacancyId || myVacancies[0]?.id || "");
  }, [initialVacancyId, isOpen, myVacancies, selectedId]);

  const selected = useMemo(() => myVacancies.find((item) => item.id === selectedId), [myVacancies, selectedId]);
  const photos = useMemo(() => [...(loadedVacancy?.vacancy_photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [loadedVacancy]);

  useEffect(() => {
    if (!draft || !loadedVacancy || (selectedMedia !== "map" && selectedMedia !== "roadview")) return;
    const address = [loadedVacancy.sido, loadedVacancy.sigungu, loadedVacancy.dong, loadedVacancy.detail_addr].filter(Boolean).join(" ");
    const render = () => {
      if (!window.kakao?.maps) return;
      const draw = (position: object) => {
        if (selectedMedia === "map" && mapRef.current) {
          mapRef.current.innerHTML = "";
          const map = new window.kakao.maps.Map(mapRef.current, { center: position, level: 3 });
          new window.kakao.maps.Marker({ map, position });
        }
        if (selectedMedia === "roadview" && roadviewRef.current) {
          roadviewRef.current.innerHTML = "";
          const roadview = new window.kakao.maps.Roadview(roadviewRef.current);
          const client = new window.kakao.maps.RoadviewClient();
          client.getNearestPanoId(position, 80, (panoId: number | null) => {
            if (panoId) roadview.setPanoId(panoId, position);
            else if (roadviewRef.current) roadviewRef.current.textContent = "이 위치에서 제공되는 로드뷰가 없습니다.";
          });
        }
      };
      if (loadedVacancy.lat && loadedVacancy.lng) {
        draw(new window.kakao.maps.LatLng(Number(loadedVacancy.lat), Number(loadedVacancy.lng)));
      } else if (address) {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result: Array<{ x: string; y: string }>, status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result[0]) draw(new window.kakao.maps.LatLng(Number(result[0].y), Number(result[0].x)));
        });
      }
    };
    const start = () => window.kakao.maps.load(render);
    if (window.kakao?.maps) start();
    else {
      const existing = document.querySelector('script[src*="dapi.kakao.com"]');
      if (existing) existing.addEventListener("load", start, { once: true });
      else {
        const script = document.createElement("script");
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services&autoload=false`;
        script.onload = start;
        document.head.appendChild(script);
      }
    }
  }, [draft, loadedVacancy, selectedMedia]);

  if (!isOpen) return null;

  const loadVacancy = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vacancies")
        .select("*, vacancy_photos(url, sort_order)")
        .eq("id", selectedId)
        .single();
      if (error) throw error;
      const vacancy = (data || selected) as DraftVacancy;
      setLoadedVacancy(vacancy);
      setProofImage(createProofImage(vacancy));
      setSelectedMedia(vacancy.vacancy_photos?.length ? "photo" : "proof");
      setDraft(createArticleDraft(vacancy, channel, draftStyle, length));
    } catch (error) {
      console.error("article draft vacancy load error", error);
      if (selected) {
        setLoadedVacancy(selected);
        setProofImage(createProofImage(selected));
        setSelectedMedia(selected.vacancy_photos?.length ? "photo" : "proof");
        setDraft(createArticleDraft(selected, channel, draftStyle, length));
      }
      else alert("매물 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDraft(null);
    setLoadedVacancy(null);
    setProofImage("");
    setChannel("news");
    setDraftStyle("narration");
    setLength("standard");
  };

  return (
    <div className={`${styles.overlay} ${variant === "standalone" ? styles.standalone : ""}`} role={variant === "modal" ? "dialog" : undefined} aria-modal={variant === "modal" ? true : undefined} aria-label="공실뉴스 매물 기사 초안 작성기">
      <section className={`${styles.studio} ${variant === "standalone" ? styles.standaloneStudio : ""}`}>
        <header className={styles.header}>
          <div><h2>공실뉴스 매물기사초안 V1.0</h2><p>외부 AI API 없이 등록 매물 정보로 기사 초안을 만듭니다.</p></div>
          {onClose && <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">×</button>}
        </header>

        <div className={styles.body}>
          <aside className={styles.controls}>
            <div className={styles.section}>
              <label className={styles.label} htmlFor="draft-vacancy">내 매물 선택</label>
              <select id="draft-vacancy" className={styles.select} value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setDraft(null); }} disabled={isLoadingVacancies}>
                <option value="">매물을 선택하세요</option>
                {myVacancies.map((item) => <option key={item.id} value={item.id}>[{item.trade_type || "거래"}] {item.building_name || "이름 없는 매물"} · {item.vacancy_no || "번호 없음"}</option>)}
              </select>
            </div>

            <div className={styles.section}><span className={styles.label}>원고 종류</span><div className={styles.toggle}><button type="button" className={channel === "news" ? styles.active : ""} onClick={() => setChannel("news")}>공실뉴스</button><button type="button" className={channel === "blog" ? styles.active : ""} onClick={() => setChannel("blog")}>블로그</button></div></div>
            <div className={styles.section}><span className={styles.label}>원고 스타일</span><div className={styles.toggle}><button type="button" className={draftStyle === "narration" ? styles.active : ""} onClick={() => setDraftStyle("narration")}>나레이션형</button><button type="button" className={draftStyle === "analysis" ? styles.active : ""} onClick={() => setDraftStyle("analysis")}>신문 분석형</button></div></div>
            <div className={styles.section}><span className={styles.label}>분량</span><div className={styles.lengths}>{([['short','300자'],['standard','600자'],['long','1,000자']] as const).map(([value,label]) => <button type="button" key={value} className={length === value ? styles.active : ""} onClick={() => setLength(value)}>{label}</button>)}</div></div>
            <button type="button" className={styles.load} onClick={loadVacancy} disabled={!selectedId || loading}>{loading ? "... 매물 불러오는 중" : "선택한 매물로 초안 만들기"}</button>
          </aside>

          <main className={styles.previewCard}>
            <div className={styles.previewTop}><strong>결과 미리보기</strong><span>{channel === "news" ? "공실뉴스 기사" : "블로그 원고"}</span></div>
            <div className={styles.phoneWrap}>
              {!draft ? <div className={styles.empty}>왼쪽에서 매물과 조건을 선택한 후<br />초안 만들기를 눌러주세요.</div> : <article className={styles.phone}><div className={styles.phoneBar}>09:41　공실뉴스</div><div className={styles.article}><span className={styles.badge}>{draft.section2}</span><h3>{draft.title}</h3><div className={styles.subtitle}>{draft.subtitle}</div><div className={styles.mediaStage}>{selectedMedia === "proof" && proofImage && <img className={styles.image} src={proofImage} alt="공실뉴스 실매물 등록 확인" />}{selectedMedia === "photo" && (photos[0]?.url || draft.imageUrl) && <img className={styles.image} src={photos[0]?.url || draft.imageUrl} alt={draft.imageCaption || draft.title} />}{selectedMedia === "map" && <div ref={mapRef} className={styles.mapCanvas}>지도 로딩 중...</div>}{selectedMedia === "roadview" && <div ref={roadviewRef} className={styles.mapCanvas}>로드뷰 로딩 중...</div>}</div><div className={styles.caption}>{selectedMedia === "proof" ? "공실뉴스 등록 매물 검증 화면" : selectedMedia === "photo" ? draft.imageCaption : selectedMedia === "map" ? "매물 위치 지도" : "매물 주변 현장 로드뷰"}</div><div className={styles.mediaStrip}><div className={styles.mediaStripTitle}><span>기사 포함 미디어 4종</span><span>클릭하여 미리보기</span></div><div className={styles.mediaGrid}><button type="button" className={`${styles.mediaThumb} ${selectedMedia === "proof" ? styles.active : ""}`} onClick={() => setSelectedMedia("proof")}>{proofImage ? <img src={proofImage} alt="검증 화면" /> : <div className={styles.mediaPlaceholder}>검증</div>}<span>검증 화면</span></button><button type="button" className={`${styles.mediaThumb} ${selectedMedia === "photo" ? styles.active : ""}`} onClick={() => setSelectedMedia("photo")}>{photos[0]?.url ? <img src={photos[0].url} alt="대표사진" /> : <div className={styles.mediaPlaceholder}>사진 없음</div>}<span>대표사진</span></button><button type="button" className={`${styles.mediaThumb} ${selectedMedia === "map" ? styles.active : ""}`} onClick={() => setSelectedMedia("map")}><div className={styles.mediaPlaceholder}>위치 지도</div><span>위치지도</span></button><button type="button" className={`${styles.mediaThumb} ${selectedMedia === "roadview" ? styles.active : ""}`} onClick={() => setSelectedMedia("roadview")}><div className={styles.mediaPlaceholder}>현장 보기</div><span>로드뷰</span></button></div></div><div className={styles.content}>{channel === "news" ? draft.content_article : draft.content_blog}</div></div></article>}
            </div>
          </main>
        </div>

        <footer className={styles.footer}><button type="button" className={styles.cancel} onClick={reset}>초기화</button><button type="button" className={styles.apply} disabled={!draft} onClick={() => { if (draft) { const chosenImage = selectedMedia === "proof" ? proofImage : selectedMedia === "photo" ? (photos[0]?.url || draft.imageUrl) : draft.imageUrl; onApply({ ...draft, imageUrl: chosenImage, imageCaption: selectedMedia === "proof" ? "공실뉴스 실매물 등록 확인 화면" : draft.imageCaption }); onClose?.(); } }}>기사쓰기에 적용</button></footer>
      </section>
    </div>
  );
}
