import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sigunguCd = searchParams.get("sigunguCd");
  const bjdongCd = searchParams.get("bjdongCd");
  const bun = searchParams.get("bun")?.padStart(4, "0");
  const ji = searchParams.get("ji")?.padStart(4, "0");
  const platGbCd = searchParams.get("platGbCd") || "0"; // 0: 대지, 1: 산, 2: 블록

  if (!sigunguCd || !bjdongCd || !bun || !ji) {
    return NextResponse.json({ error: "Missing required parameters (sigunguCd, bjdongCd, bun, ji)" }, { status: 400 });
  }

  // 공공데이터포털 API Key (환경변수에서 읽어옴)
  // TODO: .env.local에 DATA_GO_KR_API_KEY 추가 필수 (인코딩된 키 권장)
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key not configured on the server." }, { status: 500 });
  }

  const endpoint = "http://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";
  
  // URLSearchParams 대신 문자열 결합을 사용하는 이유: API Key에 이미 인코딩된 기호(%)가 포함되어 있을 수 있어서 이중 인코딩 방지
  const url = `${endpoint}?serviceKey=${apiKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}&numOfRows=10&pageNo=1&_type=json`;

  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Data.go.kr API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조: data.response.body.items.item
    const items = data?.response?.body?.items?.item;

    if (!items) {
      return NextResponse.json({ message: "No building ledger found for the given address.", data: null }, { status: 404 });
    }

    // 배열 형태일 수도 있고, 단일 객체일 수도 있음
    const ledger = Array.isArray(items) ? items[0] : items;

    // 필요한 핵심 정보 추출
    const result = {
      mainPurpsCdNm: ledger.mainPurpsCdNm || "", // 주용도 (예: 단독주택, 제1종근린생활시설)
      etcPurps: ledger.etcPurps || "", // 기타용도
      useAprDay: ledger.useAprDay || "", // 사용승인일 (YYYYMMDD)
      totArea: ledger.totArea || 0, // 연면적 (㎡)
      archArea: ledger.archArea || 0, // 건축면적 (㎡)
      grndFlrCnt: ledger.grndFlrCnt || 0, // 지상층수
      ugrndFlrCnt: ledger.ugrndFlrCnt || 0, // 지하층수
      rideUseElvtCnt: ledger.rideUseElvtCnt || 0, // 승용승강기
      emgenUseElvtCnt: ledger.emgenUseElvtCnt || 0, // 비상용승강기
      totPkngCnt: (ledger.indrMechUtcnt || 0) + (ledger.indrAutoUtcnt || 0) + (ledger.oudrMechUtcnt || 0) + (ledger.oudrAutoUtcnt || 0), // 총 주차수 (자주식+기계식)
      strctCdNm: ledger.strctCdNm || "", // 구조 (예: 철근콘크리트구조)
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Building Ledger API Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch building ledger", details: error.message }, { status: 500 });
  }
}
