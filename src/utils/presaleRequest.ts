// 분양자료 신청 저장 — 웹(actions/presale)과 앱(api/presale/request)이 같이 쓴다 (2026-11-26)
//  동의 문구와 "제공받는 자"는 서버가 단지 자료로 다시 만들어 남긴다 (화면이 보낸 글을 믿지 않는다)
import { db } from "@/utils/aptMap";
import { collectText, thirdPartyName, thirdText } from "@/utils/presaleConsent";
import { createNotification } from "@/app/actions/notification";

export type PresaleRequestInput = { presaleId: string; name: string; phone: string; areaType?: string; agreeCollect: boolean; agreeThird: boolean };

export async function savePresaleRequest(input: PresaleRequestInput, userId: string | null) {
  const name = String(input.name || "").trim().slice(0, 30);
  const digits = String(input.phone || "").replace(/\D/g, "");
  if (!input.agreeCollect) return { success: false, error: "개인정보 수집·이용에 동의해 주세요." };
  if (name.length < 2) return { success: false, error: "이름을 적어 주세요." };
  if (!/^01\d{8,9}$/.test(digits)) return { success: false, error: "휴대폰 번호를 확인해 주세요." };
  const phone = digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  const supabase = db();
  const { data: p } = await supabase.from("presale_complexes").select("id, name, developer, types").eq("id", String(input.presaleId || "")).maybeSingle();
  if (!p) return { success: false, error: "분양 단지를 찾지 못했습니다." };
  const types = Array.isArray(p.types) ? (p.types as { type: string }[]).map((t) => t.type) : [];
  const areaType = input.areaType && types.includes(input.areaType) ? input.areaType : null;
  const agreeThird = Boolean(input.agreeThird);
  const row = {
    presale_id: p.id, presale_name: p.name, name, phone, area_type: areaType,
    agree_collect: true, agree_third: agreeThird,
    third_party: agreeThird ? thirdPartyName(p.name, p.developer) : null,
    consent_text: [collectText(p.name), agreeThird ? thirdText(p.name, p.developer) : ""].filter(Boolean).join("\n\n"),
    user_id: userId,
  };
  // 같은 번호로 같은 단지를 하루 안에 또 누르면 새 줄 대신 고친다 (여러 번 눌러도 한 명)
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: same } = await supabase.from("presale_requests").select("id").eq("presale_id", p.id).eq("phone", phone).gte("created_at", since).maybeSingle();
  const { error } = same
    ? await supabase.from("presale_requests").update(row).eq("id", same.id)
    : await supabase.from("presale_requests").insert(row);
  if (error) return { success: false, error: "신청을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  if (!same) {
    await createNotification({
      recipientRole: "ADMIN", type: "presale_request",
      title: `분양자료 신청 · ${p.name}`, body: `${name}${areaType ? ` · ${areaType}` : ""}${agreeThird ? " · 분양사 제공 동의" : ""}`,
      link: "/admin?menu=presale_requests",
    }).catch(() => {});
  }
  return { success: true };
}
