// 네이버 커머스API (스마트스토어) 호출. 애플리케이션 "공실뉴스 멤버십 연동", API 그룹은 "주문 판매자"만.
// 키: NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET
// API센터에 등록한 호출 IP에서만 호출된다.
import bcrypt from "bcryptjs";

const BASE = "https://api.commerce.naver.com/external";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("NAVER_COMMERCE_CLIENT_ID / SECRET 이 없습니다");

  // 서명: bcrypt(클라이언트ID_타임스탬프, 시크릿을 솔트로) → base64
  const timestamp = Date.now();
  const sign = Buffer.from(bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret)).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      timestamp: String(timestamp),
      client_secret_sign: sign,
      grant_type: "client_credentials",
      type: "SELF",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`토큰 발급 실패 (${res.status}): ${JSON.stringify(json)}`);
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function call(path: string, init: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`커머스API ${path} 실패 (${res.status}): ${text.slice(0, 500)}`);
  return json;
}

export interface ChangedStatus {
  productOrderId: string;
  orderId: string;
  lastChangedType: string;
  lastChangedDate: string;
  productOrderStatus: string;
}

/** from 이후 상태가 바뀐 상품주문. 네이버는 한 번에 최대 24시간 구간만 준다. */
export async function getChangedProductOrders(from: Date, to?: Date): Promise<ChangedStatus[]> {
  const out: ChangedStatus[] = [];
  let moreFrom: string | undefined = from.toISOString();
  let moreSequence: string | undefined;
  while (moreFrom) {
    const q = new URLSearchParams({ lastChangedFrom: moreFrom });
    if (to) q.set("lastChangedTo", to.toISOString());
    if (moreSequence) q.set("moreSequence", moreSequence);
    const json = await call(`/v1/pay-order/seller/product-orders/last-changed-statuses?${q}`);
    out.push(...(json.data?.lastChangeStatuses ?? []));
    moreFrom = json.data?.more?.moreFrom;
    moreSequence = json.data?.more?.moreSequence;
  }
  return out;
}

export interface ProductOrderDetail {
  order: { orderId: string; ordererName?: string; ordererTel?: string; paymentDate?: string };
  productOrder: {
    productOrderId: string;
    productOrderStatus: string;
    productId?: string;
    sellerProductCode?: string;
    quantity?: number;
    totalPaymentAmount?: number;
    claimStatus?: string;
  };
}

/** 상품주문 상세 (주문자 연락처 포함). 한 번에 최대 300건. */
export async function getProductOrders(productOrderIds: string[]): Promise<ProductOrderDetail[]> {
  const out: ProductOrderDetail[] = [];
  for (let i = 0; i < productOrderIds.length; i += 300) {
    const json = await call(`/v1/pay-order/seller/product-orders/query`, {
      method: "POST",
      body: JSON.stringify({ productOrderIds: productOrderIds.slice(i, i + 300) }),
    });
    out.push(...(json.data ?? []));
  }
  return out;
}

/** 상품 배송방법이 "배송없음"이라 배송없음(NOTHING)으로 발송처리한다. 성공한 상품주문번호를 돌려준다. */
export async function dispatchWithoutDelivery(productOrderIds: string[]): Promise<string[]> {
  if (productOrderIds.length === 0) return [];
  const dispatchDate = new Date().toISOString();
  const json = await call(`/v1/pay-order/seller/product-orders/dispatch`, {
    method: "POST",
    body: JSON.stringify({
      dispatchProductOrders: productOrderIds.map((productOrderId) => ({
        productOrderId,
        deliveryMethod: "NOTHING",
        dispatchDate,
      })),
    }),
  });
  const ok: { productOrderId: string }[] = json.data?.successProductOrderInfos ?? [];
  const failed = json.data?.failProductOrderInfos ?? [];
  if (failed.length) console.error("[smartstore] 발송처리 실패:", JSON.stringify(failed));
  return ok.map((o) => o.productOrderId);
}
