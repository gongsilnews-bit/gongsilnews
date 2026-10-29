"use client";

// 내 기사 카드 (2026-10-28) — 홈 "내 기사"(한 줄로 옆으로 넘기기)와 기사관리 [카드형](바둑판)이 함께 쓴다
// 누르면 그 기사를 글감으로 뉴스·SNS발행 › 뉴스칼럼 블로그·SNS · 사진 위 채널 아이콘(올린 곳 ✓) ·
// 오른쪽 클릭·[···] = 카드 메뉴 · 아이콘 오른쪽 클릭 = 링크 작은 창 · [링크체크] = 다섯 채널 한눈에 · ☆ 즐겨찾기
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSectionProps } from "./types";
import { IconArticle, IconSend } from "./AdminIcons";
import { checkMyPromoLinks } from "@/app/actions/vacancyPromos";
import { BG, G, SITE, kakaoShare, verifyByHelper, RefreshGlyph, useHomepageBase, LinkPopover, LinksPanel, CardTools, CardHoverStyle, CardMenu, LoadingDots, IconOut, IconPen, IconStar, IconLink, IconTrash, type MenuItem } from "./VacancyCardGrid";
import { deleteMyArticle, getMyArticleBody, getMyArticleCards, saveMyArticlePromo, type MyArticleCard } from "@/app/actions/myArticles";

type ColumnNews = { title: string; publisher: string; publishedAt: string; url: string; body: string };
type Bridge = {
  openInBrowser?: (u: string) => Promise<void>;
  column?: {
    create: (source: { mode: "news"; news: ColumnNews }) => Promise<{ id: string }>;
    list: (limit?: number) => Promise<{ id: string; createdAt: string; worked?: boolean; source?: { mode?: string; news?: { publisher?: string; url?: string } } }[]>;
  };
};
const bridge = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio);

// 한 번 읽은 것은 기억해 두고 바로 그린다 (화면을 옮겨 다시 와도 "불러오는 중"이 안 뜨게)
const articleMemo: { member?: string; list?: MyArticleCard[] } = {};

const ago = (t: number) => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

// 사진 위 채널 아이콘 — 기사는 이미 있으니 기사 탭은 없다 · 글 주소는 도우미가 발행 순간 잡아 온다 (기사 홍보현황 article_promos)
const ART_CHANNELS = [["blog", "네이버 블로그"], ["instagram", "인스타그램"], ["threads", "스레드"], ["facebook", "페이스북"], ["youtube", "유튜브 대본"]] as const;
type ArtCh = (typeof ART_CHANNELS)[number][0];

export default function ArticleCardGrid({ theme, memberId, onMenuChange, keyword = "", layout = "row", onOpenColumn, onAdd, addLabel = "기사 작성" }: {
  theme: AdminSectionProps["theme"];
  memberId?: string;
  onMenuChange: (menu: string) => void;
  keyword?: string;
  layout?: "row" | "grid"; // row = 홈 한 줄 · grid = 기사관리 바둑판
  /** 뉴스·SNS발행 › 뉴스칼럼 목록에서 쓸 때 — 기사를 누르면 메뉴를 옮기지 않고 그 기사의 칼럼을 연다 (2026-10-29 사장님: 기사관리 카드 그대로) */
  onOpenColumn?: (columnId: string, tab: string) => void;
  /** 맨 앞 [+] 칸 — 없으면 기사 작성 */
  onAdd?: () => void;
  addLabel?: string;
}) {
  const { textPrimary, textSecondary, border, darkMode } = theme;
  const router = useRouter();
  const [articles, setArticles] = useState<MyArticleCard[] | null>(articleMemo.member === memberId ? articleMemo.list ?? null : null);
  const [opening, setOpening] = useState(""); // 글감 만드는 중인 기사
  const [artErr, setArtErr] = useState("");
  const [pasteFor, setPasteFor] = useState<{ a: MyArticleCard; ch: ArtCh; x: number; y: number } | null>(null); // 아이콘 오른쪽 클릭 — 링크 작은 창
  const [linksFor, setLinksFor] = useState<{ a: MyArticleCard; x: number; y: number } | null>(null); // [링크체크] — 다섯 채널 한눈에
  // [링크체크]을 열면 이 기사 링크만 바로 확인 — 서버(블로그·스레드·유튜브) + 도우미(인스타·페북) (2026-10-29 사장님)
  const [linkStatus, setLinkStatus] = useState("");
  useEffect(() => {
    if (!linksFor) { setLinkStatus(""); return; }
    const links = linksFor.a.links || {};
    const helperOnes = Object.entries(links).filter(([c, u]) => u && ["instagram", "facebook", "threads"].includes(c)).length;
    const inApp = Boolean((window as unknown as { gongsilStudio?: unknown }).gongsilStudio);
    const helperNote = helperOnes && inApp ? ` · 인스타·페북·스레드 ${helperOnes}개는 도우미가 1분 안에 확인해요` : "";
    setLinkStatus("지운 글인지 확인 중…");
    checkMyPromoLinks({ articleNo: linksFor.a.no }).then((r) => {
      if (!r.success) return setLinkStatus("확인하지 못했어요 — 다시 열어 주세요");
      if (r.removed.length) {
        setLinkStatus(`지운 글 ${r.removed.length}개를 풀었어요 (${r.removed.map((x) => x.channel).join("·")})${helperNote}`);
        getMyArticleCards().then((x) => { if (x.success) setArticles(x.data); }).catch(() => {});
      } else setLinkStatus(`블로그·유튜브는 모두 있어요${helperNote}`);
    }).catch(() => setLinkStatus("확인하지 못했어요 — 다시 열어 주세요"));
    verifyByHelper(Object.values(links));
  }, [linksFor?.a.no]); // eslint-disable-line react-hooks/exhaustive-deps
  const [artMenu, setArtMenu] = useState<{ a: MyArticleCard; x: number; y: number } | null>(null);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!memberId) return;
    let off = false;
    const load = () => getMyArticleCards().then((r) => {
      if (off || !r.success) return;
      articleMemo.member = memberId;
      articleMemo.list = r.data;
      setArticles(r.data);
    }).catch(() => {});
    void load();
    // 크롬에서 발행하고 앱으로 돌아오면 · 도우미가 글 주소를 보내 오면 다시 읽는다 (기사 홍보현황 ✓)
    window.addEventListener("focus", load);
    window.addEventListener("gs-promo-changed", load); // 공실 카드 쪽 확인이 기사 링크를 풀었을 때
    const offSaved = (window as unknown as { gongsilStudio?: { promo?: { onSaved: (fn: () => void) => () => void } } }).gongsilStudio?.promo?.onSaved(load);
    return () => { off = true; window.removeEventListener("focus", load); window.removeEventListener("gs-promo-changed", load); offSaved?.(); };
  }, [memberId]);

  // 즐겨찾기 — 이 기기에 회원별로, 별 누른 것이 맨 앞
  const favKey = `gs-art-fav:${memberId || "me"}`;
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch { setFavs([]); }
  }, [favKey]);
  const toggleFav = (id: string) => setFavs((cur) => {
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(favKey, JSON.stringify(next)); } catch {}
    return next;
  });

  const patchLinks = (id: string, ch: ArtCh, url: string) => setArticles((cur) => {
    const next = (cur || []).map((x) => {
      if (x.id !== id) return x;
      const links = { ...(x.links || {}) };
      if (url.trim()) links[ch] = url.trim(); else delete links[ch];
      return { ...x, links };
    });
    articleMemo.list = next;
    return next;
  });

  const newArticle = () => (onAdd ? onAdd() : router.push("?menu=article&action=write", { scroll: false }));
  const openArticle = async (a: MyArticleCard, tab = "blog") => {
    const url = `${window.location.origin}/news/${a.no}`;
    const g = bridge();
    // 웹에서는 글감 만들기(앱)가 없어 기사 화면을 연다
    if (!g?.column) { window.open(url, "_blank", "noopener"); return; }
    if (opening) return;
    setOpening(a.id);
    setArtErr("");
    try {
      // 같은 기사로 만든 칼럼이 있으면 그것을 다시 연다 — 써 둔 블로그·SNS 글이 그대로 (써 둔 것 우선, 없으면 최근 것)
      const mine = (await g.column.list(200).catch(() => [])).filter((c) =>
        c.source?.mode === "news" && c.source.news?.publisher === "공실뉴스" && new RegExp(`/news/${a.no}(?:[/?#]|$)`).test(String(c.source.news?.url || "")));
      const again = mine.find((c) => c.worked) || mine[0];
      let colId = again?.id || "";
      if (!colId) {
        const r = await getMyArticleBody(a.id);
        if (!r.success || !r.article) throw new Error(r.error || "기사를 읽지 못했어요.");
        const d = new Date(r.article.at);
        const col = await g.column.create({ mode: "news", news: {
          title: r.article.title,
          publisher: "공실뉴스",
          publishedAt: Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`,
          url,
          body: [r.article.subtitle, r.article.body].filter(Boolean).join("\n\n"),
        } });
        colId = col.id;
      }
      if (onOpenColumn) { onOpenColumn(colId, tab); return; }
      try {
        localStorage.setItem("studio_news_category", "column");
        localStorage.setItem("studio_last_column", colId);
        localStorage.setItem("studio_open_column", "1"); // 뉴스칼럼 목록을 건너뛰고 이 칼럼을 바로 연다 (한 번만, 2026-10-29)
        sessionStorage.setItem("gs-column-tab", tab); // 기사 카드는 블로그부터 · 아이콘을 눌렀으면 그 채널
      } catch {}
      onMenuChange("sns");
    } catch (e) {
      setArtErr((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      setOpening("");
    }
  };

  const articleUrl = (a: MyArticleCard) => `${window.location.origin}/news/${a.no}`;
  // 보내는 링크 — 내 홈페이지가 켜져 있으면 내 홈페이지의 그 기사, 아니면 공실뉴스 (2026-10-28 사장님)
  const homepage = useHomepageBase(memberId);
  const shareUrl = (a: MyArticleCard) => (homepage ? `${homepage}/news/${a.id}` : `${SITE}/news/${a.no}`);
  const openOutUrl = (u: string) => { const g = bridge(); if (g?.openInBrowser) void g.openInBrowser(u); else window.open(u, "_blank", "noopener"); };
  // 카카오톡으로 보내기 (친구·단톡방) — 링크는 실제 사이트 주소
  const shareArticle = (a: MyArticleCard) => {
    void kakaoShare({ title: a.title, description: homepage ? "맡길 물건이 있으면 홈페이지에 남겨 주세요" : "공실뉴스", imageUrl: a.thumb, url: shareUrl(a), button: "기사 보기", homepage })
      .catch((e) => setFlash(e instanceof Error ? e.message : "카카오톡을 열지 못했어요."));
  };
  const artGroups = (a: MyArticleCard): MenuItem[][] => [
    [
      { label: "공실뉴스에서 보기", icon: <IconOut />, go: () => openOutUrl(articleUrl(a)) },
      { label: "기사 수정", icon: <IconPen />, go: () => router.push(`?menu=article&action=write&id=${a.id}`, { scroll: false }) },
      { label: favs.includes(a.id) ? "즐겨찾기 해제" : "즐겨찾기", icon: <IconStar />, go: () => toggleFav(a.id) },
    ],
    [
      { label: "블로그·SNS 글 쓰기", icon: <IconSend />, note: "이 기사로", go: () => openArticle(a) },
    ],
    [
      { label: "카카오톡으로 보내기", icon: <IconSend />, note: homepage ? "내 홈페이지 링크" : "친구·단톡방", go: () => shareArticle(a) },
      { label: "링크 복사", icon: <IconLink />, note: homepage ? "내 홈페이지" : undefined, go: () => { void navigator.clipboard.writeText(shareUrl(a)).then(() => setFlash(homepage ? "내 홈페이지 기사 링크를 복사했어요." : "기사 링크를 복사했어요.")).catch(() => setFlash("복사하지 못했어요.")); } },
    ],
    [
      { label: "삭제", icon: <IconTrash />, danger: true, go: async () => {
          if (!confirm(`"${a.title}" 기사를 삭제할까요?\n삭제하면 공실뉴스와 기사 목록에서 사라져요.`)) return;
          const r = await deleteMyArticle(a.id);
          if (!r.success) { setFlash(`삭제하지 못했어요. ${r.error || ""}`); return; }
          setArticles((cur) => {
            const next = (cur || []).filter((x) => x.id !== a.id);
            articleMemo.list = next;
            return next;
          });
          setFlash("기사를 삭제했어요.");
        } },
    ],
  ];

  const kw = keyword.trim().toLowerCase();
  const shown = useMemo(() => {
    const list = (articles || []).filter((a) => !kw || a.title.toLowerCase().includes(kw) || a.no.includes(kw));
    return list.sort((a, z) => Number(favs.includes(z.id)) - Number(favs.includes(a.id)));
  }, [articles, kw, favs]);
  const grid = layout === "grid";
  const empty: React.CSSProperties = { padding: "28px 20px", border: `1px dashed ${border}`, borderRadius: 12, color: textSecondary, fontSize: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" };
  const cardBox: React.CSSProperties = grid ? { position: "relative", minWidth: 0 } : { position: "relative", flex: "0 0 210px", width: 210, minWidth: 0 };

  return (
    <>
      {artErr && <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#c92a2a" }}>{artErr}</div>}
      <div style={grid ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 } : { display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
        <button onClick={newArticle} title="새 기사 쓰기" style={{ ...(grid ? {} : { flex: "0 0 210px" }), border: 0, background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
          <div style={{ aspectRatio: "16 / 10", borderRadius: 12, border: `2px dashed ${darkMode ? "#2f5d62" : "#a5d8dd"}`, background: darkMode ? "#1f2b2d" : "#f0fafb",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#0b7285", color: "#fff", fontSize: 28, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(11,114,133,0.3)" }}>+</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: darkMode ? "#99e9f2" : "#0b7285" }}>{addLabel}</span>
          </div>
        </button>
        {articles === null ? <div style={{ ...empty, ...(grid ? {} : { flex: "0 0 210px" }) }}><LoadingDots color={textSecondary} /></div>
          : shown.length === 0 ? (kw ? <div style={{ ...empty, ...(grid ? {} : { flex: "0 0 210px" }) }}>찾는 기사가 없어요.</div> : null)
          : shown.map((a) => {
            const pending = a.status !== "APPROVED";
            return (
              <div key={a.id} className="gs-work-card" onContextMenu={(e) => { e.preventDefault(); setArtMenu({ a, x: e.clientX, y: e.clientY }); }} style={cardBox}>
                <CardTools style={{ top: 8, right: 8 }} fav={favs.includes(a.id)} onFav={() => toggleFav(a.id)}
                  onMore={(e) => { const r = e.currentTarget.getBoundingClientRect(); setArtMenu({ a, x: r.left, y: r.bottom + 4 }); }} />
                <button onClick={() => void openArticle(a)} disabled={!!opening} style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", cursor: opening ? "wait" : "pointer", padding: 0 }}>
                  <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 12, background: darkMode ? "#2c2d31" : "#f1f3f5", border: `1px solid ${border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {a.thumb ? <img src={a.thumb} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <IconArticle width={34} height={34} stroke={textSecondary} />}
                    {/* 채널 아이콘 — 올린 곳 ✓ (누르면 그 글) · 아직 = 흐리게 (누르면 그 채널 글쓰기) · 오른쪽 클릭 = 링크 작은 창 */}
                    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 6px 6px", display: "flex", gap: 3, alignItems: "center",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }}>
                      {ART_CHANNELS.map(([ch, label]) => {
                        const url = a.links?.[ch];
                        return (
                          <span key={ch} role="button" title={`${url ? `${label} · 올린 글 보기` : `${label} · 이 기사로 글 쓰기`} · 오른쪽 클릭: 링크`}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setPasteFor({ a, ch, x: e.clientX, y: e.clientY + 8 }); }}
                            onClick={(e) => { e.stopPropagation(); if (url) openOutUrl(url); else void openArticle(a, ch); }}
                            style={{ position: "relative", width: 24, height: 24, borderRadius: 7, background: BG[ch], display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)", filter: url ? "none" : "grayscale(1)", opacity: url ? 1 : 0.6 }}>
                            {G[ch]}
                            {url && <span style={{ position: "absolute", right: -4, bottom: -4, width: 14, height: 14, borderRadius: "50%", background: "#2f9e44", border: "2px solid #fff", color: "#fff", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                          </span>
                        );
                      })}
                      {/* 링크체크 — 사진 안 아이콘 줄 끝 (2026-10-28 사장님) */}
                      <span role="button" title="채널별 링크 보기·복사·수정"
                        onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setLinksFor({ a, x: r.right - 420, y: r.bottom + 6 }); }}
                        style={{ marginLeft: "auto", height: 22, padding: "0 7px", borderRadius: 6, background: "rgba(233,236,239,0.92)", color: "#495057", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", cursor: "pointer" }}>
                        <RefreshGlyph size={10} />링크체크
                      </span>
                    </span>
                    {pending && <span style={{ position: "absolute", left: 8, top: 8, fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: "#f59f00", color: "#fff" }}>검토 중</span>}
                    {opening === a.id && (
                      <span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingDots color="#495057" /></span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                </button>
                <div style={{ marginTop: 2, fontSize: 12, color: textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>기사 {a.no} · {a.at ? `${ago(Date.parse(a.at))} ${pending ? "작성" : "발행"}` : ""}</div>
              </div>
            );
          })}
      </div>

      {pasteFor && (
        <LinkPopover theme={theme} x={pasteFor.x} y={pasteFor.y} channel={pasteFor.ch} url={(articles || []).find((x) => x.id === pasteFor.a.id)?.links?.[pasteFor.ch]} onClose={() => setPasteFor(null)}
          onSave={async (url) => {
            const r = await saveMyArticlePromo(pasteFor.a.id, pasteFor.ch, url);
            if (!r.success) return r.error || "저장하지 못했어요.";
            patchLinks(pasteFor.a.id, pasteFor.ch, url);
            setFlash(url.trim() ? "링크를 저장했어요." : "연결을 끊었어요.");
            return "";
          }} />
      )}
      {linksFor && (
        <LinksPanel theme={theme} x={linksFor.x} y={linksFor.y} links={(articles || []).find((x) => x.id === linksFor.a.id)?.links || {}} onClose={() => setLinksFor(null)} status={linkStatus}
          onSave={async (ch, url) => {
            const r = await saveMyArticlePromo(linksFor.a.id, ch, url);
            if (!r.success) return r.error || "저장하지 못했어요.";
            patchLinks(linksFor.a.id, ch, url);
            return "";
          }} />
      )}
      {artMenu && <CardMenu theme={theme} title={artMenu.a.title}
        sub={[`기사 ${artMenu.a.no}`, artMenu.a.status === "APPROVED" ? "발행됨" : "검토 중"].join(" · ")}
        x={artMenu.x} y={artMenu.y} groups={artGroups(artMenu.a)} onClose={() => setArtMenu(null)} />}
      {flash && (
        <div style={{ position: "fixed", left: "50%", bottom: 32, transform: "translateX(-50%)", zIndex: 10001, padding: "10px 18px", borderRadius: 10, background: "#212529", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }}>{flash}</div>
      )}
      <CardHoverStyle darkMode={darkMode} />
    </>
  );
}
