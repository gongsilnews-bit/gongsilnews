// 안드로이드 앱 정보설정 (사이트 모바일 /m/admin/settings 와 같은 화면, 2026-11-17)
//  앱은 로그인 토큰(Authorization: Bearer)을 보낸다 — 고치는 사람은 언제나 토큰의 본인. 남의 정보는 읽지도 고치지도 못한다.
//  등급·권한·포인트·상태(role · plan · point_balance · status …)는 앱에서 절대 바꾸지 못한다.
//
//  POST { action: "get" }                                  → 내 기본정보 · 부동산정보 · 소식 수신 동의
//  POST { action: "save", member, agency?, isTemp, requestApproval } → 기본정보(이름·연락처·프로필 사진·SNS 주소) + 부동산정보
//       부동산정보는 사이트와 같은 adminUpdateAgency(서류 AI 검증·같은 사무소 중복 검사 포함)로 저장한다
//  POST multipart { action: "upload", kind: "profile" | "reg" | "biz", file } → 사진 1장 → { url }
//  POST { action: "consent.set", sms, kakao }              → 소식·혜택 받기(광고성 정보 수신 동의)
//  POST { action: "geocode", address }                     → 주소 → 좌표 (주소 검색 창에서 좌표를 못 구했을 때)
import { NextRequest, NextResponse } from "next/server";
import { adminUpdateAgency, adminUploadAgencyDocument } from "@/app/admin/actions";
import { geocodeAddress } from "@/app/actions/geocode";
import { no, whoAmI } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });

// 사이트 화면의 마케팅 정보 칸과 같은 이름들
const SNS_KEYS = ["homepage", "contact", "shopping_mall", "blog", "cafe", "youtube", "facebook", "twitter", "instagram", "kakao", "threads"] as const;
const KINDS = { profile: "profile", reg: "reg_cert", biz: "biz_cert" } as const;
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** 우리 저장소(agency_documents)의 내 폴더 사진 주소인가 — 남의 사진이나 바깥 주소를 넣지 못하게 */
function isMyDocUrl(url: unknown, uid: string) {
  if (typeof url !== "string" || !url) return false;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agency_documents/${uid}/`;
  return url.startsWith(base) && !url.includes("..");
}

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const uid = me.user.id;
  const db = me.db;

  // ── 사진 1장 올리기 (사이트와 같은 adminUploadAgencyDocument — 내 폴더 · JPG/PNG/WebP · 10MB 까지) ──
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const form = await req.formData();
    if (String(form.get("action") || "") !== "upload") return no("알 수 없는 요청입니다.");
    const kind = KINDS[String(form.get("kind") || "") as keyof typeof KINDS];
    const file = form.get("file");
    if (!kind || !(file instanceof File)) return no("사진 또는 종류가 없습니다.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", `${uid}/${kind}_${Date.now()}.${ext}`);
    const r = await adminUploadAgencyDocument(fd);
    return r.success ? ok({ url: r.url }) : no(r.error || "사진을 올리지 못했습니다.", 500);
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");

  // ── 읽기 ──
  if (action === "get") {
    const { data: m, error } = await db.from("members").select("name, email, phone, role, profile_image_url, sns_links").eq("id", uid).maybeSingle();
    if (error || !m) return no("회원 정보를 불러오지 못했습니다.", 500);
    const { data: a } = await db.from("agencies")
      .select("name, ceo_name, cell, phone, zipcode, address, address_detail, intro, reg_num, biz_num, status, reject_reason, reg_cert_url, biz_cert_url, lat, lng")
      .eq("owner_id", uid).maybeSingle();
    // 소식 수신 동의 칸이 아직 없으면(SQL 실행 전) consent 는 null — 화면이 상자를 그리지 않는다 (사이트와 같음)
    const { data: c, error: cErr } = await db.from("members").select("marketing_sms, marketing_kakao, marketing_agreed_at").eq("id", uid).maybeSingle();
    const consent = cErr || !c ? null : { sms: !!c.marketing_sms, kakao: !!c.marketing_kakao, at: (c.marketing_agreed_at as string | null) || null };
    const links = (m.sns_links && typeof m.sns_links === "object" ? m.sns_links : {}) as Record<string, unknown>;
    const sns: Record<string, string> = {};
    for (const k of SNS_KEYS) { const v = links[k]; sns[k] = typeof v === "string" ? v : String((v as { url?: string } | null)?.url || ""); }
    return ok({
      member: { name: m.name || "", email: m.email || "", phone: m.phone || "", role: m.role || "USER", profile_image_url: m.profile_image_url || null },
      sns,
      agency: a || null,
      consent,
    });
  }

  // ── 소식·혜택 받기 (사이트 updateMyMarketingConsent 와 같게 — 누르면 바로 저장, 날짜 새로) ──
  if (action === "consent.set") {
    const { error } = await db.from("members")
      .update({ marketing_sms: !!body?.sms, marketing_kakao: !!body?.kakao, marketing_agreed_at: new Date().toISOString() })
      .eq("id", uid);
    return error ? no(error.message, 500) : ok();
  }

  if (action === "geocode") {
    const r = await geocodeAddress(str(body?.address, 300));
    return r.success && r.lat && r.lng ? ok({ lat: r.lat, lng: r.lng }) : ok({ lat: null, lng: null });
  }

  // ── 저장 ──
  if (action === "save") {
    const isTemp = !!body?.isTemp;
    const mIn = (body?.member || {}) as Record<string, unknown>;
    const { data: cur } = await db.from("members").select("sns_links, profile_image_url").eq("id", uid).maybeSingle();

    // 기본정보 — 고칠 수 있는 칸은 이름 · 연락처 · 프로필 사진 · SNS 주소뿐
    const upd: Record<string, unknown> = { name: str(mIn.name, 50), phone: str(mIn.phone, 20) };
    if (mIn.profile_image_url !== undefined && mIn.profile_image_url !== cur?.profile_image_url) {
      if (!isMyDocUrl(mIn.profile_image_url, uid)) return no("프로필 사진 주소가 올바르지 않습니다.");
      upd.profile_image_url = mIn.profile_image_url;
    }
    // SNS 는 주소(url)만 바꾼다 — 사이트에서 적어 둔 아이디·비밀번호 메모와 API 목록은 그대로 둔다
    if (mIn.sns && typeof mIn.sns === "object") {
      const links = { ...((cur?.sns_links && typeof cur.sns_links === "object" ? cur.sns_links : {}) as Record<string, unknown>) };
      for (const k of SNS_KEYS) {
        const url = str((mIn.sns as Record<string, unknown>)[k], 500);
        const prev = links[k];
        links[k] = typeof prev === "object" && prev ? { ...(prev as Record<string, unknown>), url } : { url, login_id: "", login_pw: "", login_type: "일반" };
      }
      upd.sns_links = links;
    }
    const { error: mErr } = await db.from("members").update(upd).eq("id", uid);
    if (mErr) return no("기본정보를 저장하지 못했습니다: " + mErr.message, 500);

    // 부동산정보 — 화면이 보낸 칸 중 사이트 화면이 고치게 하는 것만
    const aIn = body?.agency as Record<string, unknown> | undefined;
    if (!aIn) return ok({ status: null, reviewReason: "" });
    const { data: ex } = await db.from("agencies").select("status, reg_cert_url, biz_cert_url").eq("owner_id", uid).maybeSingle();
    const doc = (v: unknown, prev: string | null | undefined) => {
      if (!v) return null;
      if (v === prev || isMyDocUrl(v, uid)) return v as string;
      throw new Error("서류 사진 주소가 올바르지 않습니다.");
    };
    let regUrl: string | null, bizUrl: string | null;
    try { regUrl = doc(aIn.reg_cert_url, ex?.reg_cert_url); bizUrl = doc(aIn.biz_cert_url, ex?.biz_cert_url); }
    catch (e) { return no((e as Error).message); }
    const lat = Number(aIn.lat), lng = Number(aIn.lng);
    const prevStatus = ex?.status || "PENDING";
    // 사이트와 같게: 반려 상태에서 (임시저장이 아닌) 저장 → 승인대기. 상태는 화면 값이 아니라 DB 값에서 정한다
    const status = !isTemp && prevStatus === "REJECTED" ? "PENDING" : prevStatus;
    const requestApproval = !isTemp && !!body?.requestApproval && (!me.isRealtor || prevStatus === "REJECTED");
    const r = await adminUpdateAgency(uid, {
      name: str(aIn.name, 100), ceo_name: str(aIn.ceo_name, 50), cell: str(aIn.cell, 20), phone: str(aIn.phone, 20),
      zipcode: str(aIn.zipcode, 10), address: str(aIn.address, 300), address_detail: str(aIn.address_detail, 200),
      intro: str(aIn.intro, 100), reg_num: str(aIn.reg_num, 50), biz_num: str(aIn.biz_num, 20),
      reg_cert_url: regUrl, biz_cert_url: bizUrl,
      lat: Number.isFinite(lat) && lat ? lat : null, lng: Number.isFinite(lng) && lng ? lng : null,
      status, reject_reason: null,
    }, { requestApproval });
    if (!r.success) return no(r.error || "중개업소 정보 저장에 실패했습니다.");
    return ok({
      status: ("status" in r && r.status) || status,
      reviewReason: ("reviewReason" in r && r.reviewReason) || "",
    });
  }

  return no("알 수 없는 요청입니다.");
}
