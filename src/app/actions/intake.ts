"use server"

import { createClient } from "@supabase/supabase-js";
import { registerIncomingInquiry } from "./customer";
import { createNotification } from "./notification";

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

    const res = await registerIncomingInquiry(hs.owner_id, {
      name,
      phone,
      type: input.type,
      area: input.area?.trim() || undefined,
      budget: input.budget?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      source: "물건접수웹페이지",
      attach_to_customer_id: input.customerId || undefined,
      photo_urls: input.photoUrls?.length ? input.photoUrls : undefined,
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
