/* ══════════════════════════════════════════════════════════════
   매물·물건 출처 정보 — 블로그(blog.js)와 SNS(sns.js)가 함께 쓴다

   글 끝 "매물 정보 출처"(표시·광고 필수 정보: 중개사무소·대표·등록번호·소재지·연락처)와
   고정 상세 주소를 공실뉴스에서 받아 온다.
   API는 매물을 가져온 공실뉴스 사이트(운영 또는 localhost)에 묻고, 링크는 항상 운영 주소로 만든다.
   서버가 로그인 회원 등급을 확인한다 (유료 회원이거나 최근 블로그·SNS 무료 체험을 쓴 회원).
   ══════════════════════════════════════════════════════════════ */
async function gwFetchListing(vacancy) {
  const id = vacancy?.vacancyId;
  if (!id) return null;
  let origin = GWNaverBlog.SITE_URL;
  try {
    const pageOrigin = new URL(vacancy.url).origin;
    if (/^https:\/\/([a-z0-9-]+\.)?gongsilnews\.com$|^http:\/\/localhost(:\d+)?$/i.test(pageOrigin)) origin = pageOrigin;
  } catch (_) {
    /* 주소가 없으면 운영 사이트에 묻는다 */
  }
  if (vacancy.saleKind) return gwFetchAuctionListing(origin, id);
  const response = await fetch(`${origin}/api/extension/vacancy-source?id=${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data?.success) throw new Error(data?.error || "매물 출처 정보를 가져오지 못했습니다.");
  return {
    detailUrl: `${GWNaverBlog.SITE_URL}${data.detailPath}`,
    location: data.location || "",
    propertyType: data.propertyType || "",
    tradeType: data.tradeType || "",
    owner: data.owner || null,
    capturedAt: new Date().toISOString(),
  };
}

/* 경매·공매 물건 출처 정보(구분·관리번호·집행기관·고정 상세 주소) */
async function gwFetchAuctionListing(origin, id) {
  const response = await fetch(`${origin}/api/extension/auction-source?id=${encodeURIComponent(id)}&for=blog`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data?.success) throw new Error(data?.error || "경매·공매 물건 정보를 가져오지 못했습니다.");
  const fact = (...labels) => (data.facts || []).find((f) => labels.includes(f.label))?.value || "";
  return {
    detailUrl: `${GWNaverBlog.SITE_URL}${data.detailPath}`,
    location: data.location || "",
    propertyType: data.propertyType || "",
    saleKind: data.saleKind || "",
    caseLabel: fact("관리번호") ? "관리번호" : "사건번호",
    caseNo: fact("관리번호", "사건번호"),
    agency: fact("집행기관", "관할법원"),
    capturedAt: new Date().toISOString(),
  };
}
