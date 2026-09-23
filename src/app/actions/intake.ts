"use server"

import { createClient } from "@supabase/supabase-js";
import { registerIncomingInquiry } from "./customer";
import { createNotification } from "./notification";
import { isPermissionAlive } from "@/utils/planCheck";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/** 물건접수웹페이지에서 들어오는 접수 유형. 기본은 물건을 내놓는 쪽이다. */
export type IntakeType = "매물내놔요" | "매물구해요";

export interface IntakeInput {
  type: IntakeType;
  name: string;
  phone: string;
  /** 내놔요면 물건 소재지, 구해요면 희망 지역 */
  area?: string;
  /** 내놔요면 희망 매도·임대가, 구해요면 예산 */
  budget?: string;
  /** 구해요일 때만 받는다 */
  moveInDate?: string;
  notes?: string;
  /** 선택 항목. 없어도 접수된다 */
  photoUrls?: string[];
  /**
   * 접수 폼은 두 걸음이다.
   *   lead   — 이름·연락처만 받고 곧바로 저장한다. 중개사에게 알림이 간다.
   *   detail — 저장된 뒤 이어서 받는 물건 내용. 같은 번호라 같은 고객에 붙는다.
   * detail 에서 알림을 또 보내면 한 사람 때문에 폰이 두 번 울린다. 그래서 보내지 않는다.
   */
  phase?: "lead" | "detail";
  /** 2걸음째에 1걸음에서 만든 접수 건 id 를 들고 온다 */
  customerId?: string;

  /**
   * 사람 눈에 안 보이는 칸. 사람은 비워두고 자동 채우기 봇은 채운다.
   * 값이 있으면 저장하지 않되 성공한 척 답한다 — 실패를 알려주면 우회법을 찾는다.
   */
  website?: string;
  /** 폼이 화면에 뜬 시각(ms). 여는 즉시 제출되는 것은 사람이 아니다 */
  openedAt?: number;
}

/** 접수 폼 방어 기준. 열어놓고 보면서 조정한다. */
const GUARD = {
  /** 이 시간 안에 제출되면 사람이 아니다 */
  MIN_FILL_MS: 3000,
  /** 같은 홈페이지에 같은 번호가 다시 들어올 수 있는 간격 */
  SAME_PHONE_MINUTES: 10,
  /** 같은 곳에서 한 시간에 넣을 수 있는 건수 */
  PER_IP_HOURLY: 5,
  /** 한 홈페이지가 하루에 받는 건수 */
  PER_SITE_DAILY: 100,
};

/**
 * 접속 정보를 해시로 만든다.
 *
 * 원본 IP 는 저장하지도 로그에 남기지도 않는다. 같은 곳에서 또 왔는지만
 * 알면 되고, 그 이상은 우리가 들고 있을 이유가 없다.
 */
async function ipFingerprint(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const raw =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip")?.trim() ||
      "";
    if (!raw) return null;
    const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "gongsil";
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${salt}:${raw}`)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  } catch {
    return null;
  }
}

/** 캡차 검증. 키가 준비되면 이 함수만 채우면 된다. */
async function verifyTurnstile(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch {
    // 캡차 서버가 죽었다고 접수를 막지는 않는다. 다섯 겹이 남아 있다.
    return true;
  }
}

/**
 * 공개 접수 폼 제출.
 *
 * 접수자는 비로그인이라 소유자를 신뢰할 수 없다. 그래서 폼이 보낸 값이 아니라
 * 서브도메인으로 homepage_settings 를 찾아 owner_id 를 서버에서 직접 확정한다.
 * 저장은 기존 CRM 경로(registerIncomingInquiry)를 그대로 타므로 중개사는
 * [고객문의] 화면에서 평소처럼 받는다.
 */
export async function submitPropertyIntake(subdomain: string, input: IntakeInput) {
  if (!subdomain) return { success: false, message: "잘못된 접근입니다." };

  const name = input.name?.trim();
  const phone = input.phone?.trim();
  if (!name) return { success: false, message: "이름을 입력해 주세요." };
  if (!phone) return { success: false, message: "연락처를 입력해 주세요." };

  /*
   * [1겹] 사람 눈에 안 보이는 칸이 채워져 있으면 봇이다.
   * [2겹] 폼이 뜨자마자 제출된 것도 봇이다.
   *
   * 둘 다 성공한 척 돌려준다. "막혔다"고 알려주면 우회법을 찾을 뿐이다.
   * 2걸음째(detail)는 이미 만든 건에 붙는 것이라 이 검사를 하지 않는다.
   */
  if (input.phase !== "detail") {
    if (input.website) return { success: true };
    if (input.openedAt && Date.now() - input.openedAt < GUARD.MIN_FILL_MS) {
      return { success: true };
    }
  }

  /*
   * [비어 있는 겹] 캡차.
   *
   * 지금은 키가 없어 넘어간다. 위 다섯 겹으로 대부분 막히고, 캡차는 손님에게
   * 한 단계를 더 지우는 대가가 있어 실제로 뚫리는 것이 보일 때 켠다.
   * 그때는 Cloudflare Turnstile 키를 넣고 폼이 보낸 토큰을 여기서 검증하면 된다.
   */
  if (process.env.TURNSTILE_SECRET_KEY && input.phase !== "detail") {
    const ok = await verifyTurnstile((input as any).captchaToken);
    if (!ok) return { success: false, message: "사람인지 확인하지 못했습니다. 다시 시도해 주세요." };
  }

  const supabase = getAdminClient();

  try {
    const { data: hs } = await supabase
      .from("homepage_settings")
      .select("owner_id, is_active")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (!hs || hs.is_active === false) {
      return { success: false, message: "현재 접수를 받고 있지 않습니다." };
    }

    /*
     * 사진 첨부는 요금제가 여는 기능이다. 폼에서 단계를 감추는 것만으로는
     * 요청을 직접 보내면 그대로 들어오므로 여기서 한 번 더 본다.
     * 막는 대신 사진만 버린다 — 접수 자체는 끝까지 되는 편이 임대인에게 낫다.
     */
    const { data: owner } = await supabase
      .from("members")
      .select("role, plan_type, plan_end_date, can_intake_photo")
      .eq("id", hs.owner_id)
      .single();
    const allowPhoto = isPermissionAlive(owner, owner?.can_intake_photo);
    const photoUrls = allowPhoto && input.photoUrls?.length ? input.photoUrls : undefined;

    const ipHash = await ipFingerprint();

    /*
     * [3·4·5겹] 얼마나 들어왔는지 센다. 2걸음째는 새 건을 만들지 않으므로 건너뛴다.
     *
     * 막을 때는 사무소 전화번호를 같이 돌려준다. 진짜 손님이 걸렸을 때
     * 그냥 돌려보내면 그 손님을 잃는다.
     */
    if (input.phase !== "detail") {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, phone")
        .eq("owner_id", hs.owner_id)
        .single();

      if (agency?.id) {
        const callback = agency.phone ? ` 급하시면 ${agency.phone} 로 연락 주세요.` : "";
        const since = (minutes: number) =>
          new Date(Date.now() - minutes * 60 * 1000).toISOString();

        // 같은 번호가 방금 또 들어왔는가
        const { count: samePhone } = await supabase
          .from("crm_customers")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .eq("phone", phone)
          .gte("created_at", since(GUARD.SAME_PHONE_MINUTES));
        if ((samePhone || 0) > 0) {
          return {
            success: false,
            message: "방금 접수하셨습니다. 잠시 후 다시 시도해 주세요." + callback,
          };
        }

        // 같은 곳에서 한 시간에 몇 건이나 들어왔는가
        if (ipHash) {
          const { count: perIp } = await supabase
            .from("crm_customers")
            .select("id", { count: "exact", head: true })
            .eq("submit_ip_hash", ipHash)
            .gte("created_at", since(60));
          if ((perIp || 0) >= GUARD.PER_IP_HOURLY) {
            return {
              success: false,
              message: "지금은 접수가 어렵습니다. 잠시 후 다시 시도해 주세요." + callback,
            };
          }
        }

        // 이 홈페이지가 오늘 몇 건이나 받았는가
        const { count: perSite } = await supabase
          .from("crm_customers")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .gte("created_at", since(60 * 24));
        if ((perSite || 0) >= GUARD.PER_SITE_DAILY) {
          // 중개사는 폭주를 모르고 지나간다. 하루 한 번만 알린다.
          await createNotification({
            recipientId: hs.owner_id,
            type: "intake_new",
            title: "접수가 하루 한도에 닿았습니다",
            body: `오늘 ${perSite}건이 들어와 잠시 접수를 멈췄습니다. 고객문의를 확인해 주세요.`,
            link: "/realty_admin?menu=customer",
            mobileLink: "/m/admin/customer",
            sourceId: `intake-cap-${new Date().toISOString().slice(0, 10)}`,
            revive: false,
          });
          return {
            success: false,
            message: "지금은 접수가 어렵습니다. 잠시 후 다시 시도해 주세요." + callback,
          };
        }
      }
    }

    const res = await registerIncomingInquiry(hs.owner_id, {
      name,
      phone,
      type: input.type,
      area: input.area?.trim() || undefined,
      budget: input.budget?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      source: "물건접수웹페이지",
      attach_to_customer_id: input.customerId || undefined,
      photo_urls: photoUrls,
      submit_ip_hash: ipHash || undefined,
      // 입주 희망일은 구하는 쪽에서만 의미가 있다
      move_in_date: input.type === "매물구해요" ? input.moveInDate || undefined : undefined,
    });

    if (!res.success) return res;

    // 2걸음째에서 이 건에 이어 붙일 수 있도록 id 를 돌려준다
    const customerId = (res as any).data?.id as string | undefined;

    // 매물은 먼저 잡는 사람이 가져간다. 중개사가 관리자에 없더라도 바로 알 수 있게 알림을 띄운다.
    // 뒤이어 들어오는 물건 내용(detail)은 같은 고객 기록에 붙으므로 다시 알리지 않는다.
    if (input.phase === "detail") return { success: true, customerId };

    await createNotification({
      recipientId: hs.owner_id,
      type: "intake_new",
      title: input.type === "매물구해요" ? "물건 의뢰가 접수되었습니다" : "물건이 접수되었습니다",
      body: `${name} · ${phone}${input.area ? ` · ${input.area}` : ""}`,
      link: "/realty_admin?menu=customer",
      mobileLink: "/m/admin/customer",
      sourceId: (res as any).data?.id,
      revive: true,
    });

    return { success: true, customerId };
  } catch (error: any) {
    console.error("submitPropertyIntake error:", error);
    return { success: false, message: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
