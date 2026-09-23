"use server";

import { createClient } from "@supabase/supabase-js";

import { sendPpurioSms, sendPpurioKakao } from "@/utils/ppurio";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getCustomers(ownerId: string) {
  const supabase = getAdminClient();
  
  // 먼저 소속 부동산 ID 찾기
  const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", ownerId).single();
  if (!agency) return { success: false, message: "부동산 정보를 찾을 수 없습니다." };

  const { data, error } = await supabase
    .from("crm_customers")
    .select("*")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return { success: false, message: error.message };
  }

  const rows = data || [];
  if (!rows.length) return { success: true, data: rows };

  // 같은 번호로 다시 접수하면 새 고객이 생기지 않고 기존 고객에 붙는다(아래 참고).
  // 그때 crm_customers.created_at 은 그대로라, 등록일 순으로 세우면 오늘 들어온
  // 문의가 몇 달 전 자리에 박혀 목록에서 안 보인다. 접수는 들어왔는데 중개사는
  // 모르는 상태가 된다.
  //
  // 접수는 매번 crm_logs 에 시각과 함께 남으므로, 그 마지막 기록을 "최근 문의
  // 시각"으로 삼아 정렬한다. 컬럼을 새로 만들지 않아도 지금 있는 것으로 된다.
  const ids = rows.map((r: any) => r.id);
  const lastContact = new Map<string, string>();

  const { data: logs } = await supabase
    .from("crm_logs")
    .select("customer_id, created_at")
    .in("customer_id", ids)
    .order("created_at", { ascending: false })
    .limit(1000);

  // 내림차순이라 고객별로 처음 만나는 것이 가장 최근이다
  (logs || []).forEach((l: any) => {
    if (!lastContact.has(l.customer_id)) lastContact.set(l.customer_id, l.created_at);
  });

  const withContact = rows.map((r: any) => {
    const last = lastContact.get(r.id);
    return {
      ...r,
      // 기록이 없는 옛 고객은 등록일을 그대로 쓴다
      last_contact_at: last && last > r.created_at ? last : r.created_at,
    };
  });

  withContact.sort((a: any, b: any) => (a.last_contact_at < b.last_contact_at ? 1 : -1));

  return { success: true, data: withContact };
}

export async function createCustomer(ownerId: string, data: {
  name: string;
  phone?: string;
  type?: string;
  budget?: string;
  area?: string;
  source?: string;
  notes?: string;
}) {
  const supabase = getAdminClient();
  
  // 먼저 소속 부동산 ID 찾기
  const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", ownerId).single();
  if (!agency) return { success: false, message: "부동산 정보를 찾을 수 없습니다." };

  // notes는 crm_logs에 넣어야 하므로 crm_customers 저장용 데이터에서 분리합니다.
  const { notes, ...customerData } = data;

  // 1. 고객 등록
  const { data: customer, error: customerError } = await supabase
    .from("crm_customers")
    .insert([{ ...customerData, agency_id: agency.id }])
    .select()
    .single();

  if (customerError) {
    console.error("Error creating customer:", customerError);
    return { success: false, message: customerError.message };
  }

  // 2. 최초 메모 등록 (notes가 있는 경우)
  if (data.notes && customer) {
    const { error: logError } = await supabase.from("crm_logs").insert([{
      customer_id: customer.id,
      type: "memo",
      content: data.notes
    }]);
    
    if (logError) {
      console.error("Error creating initial note:", logError);
    }
  }

  return { success: true, data: customer };
}

export async function getCustomerLogs(customerId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_logs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching customer logs:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function addCustomerLog(customerId: string, type: string, content: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_logs")
    .insert([{ customer_id: customerId, type, content }])
    .select()
    .single();

  if (error) {
    console.error("Error adding log:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function updateCustomerStatus(customerId: string, newStatus: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_customers")
    .update({ status: newStatus })
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer status:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function updateCustomer(customerId: string, data: {
  name: string;
  phone?: string;
  type?: string;
  budget?: string;
  area?: string;
  source?: string;
  status?: string;
}) {
  const supabase = getAdminClient();
  const { data: customer, error } = await supabase
    .from("crm_customers")
    .update(data)
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data: customer };
}

export async function deleteCustomer(customerId: string) {
  const supabase = getAdminClient();
  // Delete logs first to satisfy foreign key constraints (if ON DELETE CASCADE is not set)
  await supabase.from("crm_logs").delete().eq("customer_id", customerId);
  const { error } = await supabase
    .from("crm_customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    console.error("Error deleting customer:", error);
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function getRelatedCustomers(phone: string, currentCustomerId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_customers")
    .select("*")
    .eq("phone", phone)
    .neq("id", currentCustomerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching related customers:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function registerIncomingInquiry(ownerId: string, data: {
  name: string;
  phone: string;
  type: string;
  budget?: string;
  area?: string;
  source: string;
  notes?: string;
  is_registered_member?: boolean;
  target_vacancy_id?: string;
  source_flyer_id?: string;
  photo_urls?: string[];
  move_in_date?: string;
  /**
   * 이미 만들어 둔 접수 건에 이어 붙인다 (물건접수웹페이지 2걸음째).
   * 없으면 새 건으로 쌓는다.
   */
  attach_to_customer_id?: string;
  /** 접수 당시 접속 정보의 해시. 스팸 방지에만 쓰고 원본 IP 는 받지 않는다 */
  submit_ip_hash?: string;
}) {
  const supabase = getAdminClient();

  // 1. 소속 부동산 ID 찾기
  const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", ownerId).single();
  if (!agency) return { success: false, message: "부동산 정보를 찾을 수 없습니다." };

  /*
   * 2. 접수는 건별로 쌓는다.
   *
   * 예전에는 같은 번호가 들어오면 기존 고객에 합쳤다. 그러면 오늘 들어온 접수가
   * 몇 달 전 고객 자리에 붙어버려 중개사는 새 문의가 온 줄 모른다. 한 사람이 두 번
   * 문의했다면 두 번 응대할 일이지 한 줄로 합칠 일이 아니다.
   *
   * 예외는 하나 — 물건접수웹페이지는 연락처(1걸음)와 물건 내용(2걸음)을 나눠 받는다.
   * 2걸음째는 방금 만든 그 건에 붙어야 하므로 id 를 들고 온다.
   */
  let customer: any = null;
  if (data.attach_to_customer_id) {
    const { data: found } = await supabase
      .from("crm_customers")
      .select("*")
      .eq("id", data.attach_to_customer_id)
      .eq("agency_id", agency.id)
      .maybeSingle();
    customer = found || null;
  }

  if (customer) {
    // [이어 붙이는 경우]: 1걸음에서 만든 건에 물건 내용을 채운다
    const previousName = customer.name;
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("crm_customers")
      .update({
        status: "신규",
        // 같은 번호로 다른 이름이 들어오면 최신 이름을 쓴다. 알림에는 새 이름이,
        // 목록에는 옛 이름이 떠서 같은 사람인지 알 수 없던 문제를 막는다.
        // 바뀐 사실은 바로 아래 이력에 남긴다.
        name: data.name || customer.name,
        is_registered_member: data.is_registered_member ?? customer.is_registered_member,
        target_vacancy_id: data.target_vacancy_id ?? customer.target_vacancy_id,
        source_flyer_id: data.source_flyer_id ?? customer.source_flyer_id,
        source: data.source,
        // 1걸음에서는 비워둔 칸들이다. 2걸음에서 들어온 값으로 채운다.
        // 내놔요/구해요는 1걸음에서 고른 값이 그대로 오지만, 이어 붙이는 쪽에서도
        // 최신 값을 쓴다 — 갱신하지 않으면 구해요로 낸 건이 내놔요로 남는다.
        type: data.type || customer.type,
        area: data.area || customer.area,
        budget: data.budget || customer.budget,
        photo_urls: data.photo_urls?.length ? data.photo_urls : customer.photo_urls,
        move_in_date: data.move_in_date ?? customer.move_in_date
      })
      .eq("id", customer.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating existing customer during inquiry:", updateError);
      return { success: false, message: updateError.message };
    }
    
    customer = updatedCustomer;

    // 추가 의뢰 로그 등록
    let logContent = `[🖥️ 접수 내용 추가]\n• 유입 경로: ${data.source}\n`;
    if (data.name && previousName && data.name !== previousName) {
      logContent += `• 이름 변경: ${previousName} → ${data.name}\n`;
    }
    if (data.area) logContent += `• 희망 조건: ${data.area}\n`;
    if (data.budget) logContent += `• 희망 예산: ${data.budget}\n`;
    if (data.move_in_date) logContent += `• 입주 희망일: ${data.move_in_date}\n`;
    if (data.photo_urls?.length) logContent += `• 첨부 사진: ${data.photo_urls.length}장\n`;
    if (data.notes) logContent += `• 접수 메시지:\n${data.notes}`;

    await supabase.from("crm_logs").insert([{
      customer_id: customer.id,
      type: "memo",
      content: logContent
    }]);
  } else {
    // [새 접수]: 같은 번호가 이미 있어도 새 건으로 쌓는다
    const { data: newCustomer, error: insertError } = await supabase
      .from("crm_customers")
      .insert([{
        agency_id: agency.id,
        name: data.name,
        phone: data.phone,
        type: data.type,
        budget: data.budget || "금액 조건 없음",
        area: data.area || "지역 미정",
        source: data.source,
        status: "신규",
        is_registered_member: data.is_registered_member || false,
        target_vacancy_id: data.target_vacancy_id || null,
        source_flyer_id: data.source_flyer_id || null,
        photo_urls: data.photo_urls?.length ? data.photo_urls : null,
        move_in_date: data.move_in_date || null,
        submit_ip_hash: data.submit_ip_hash || null
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating new customer from inquiry:", insertError);
      return { success: false, message: insertError.message };
    }

    customer = newCustomer;

    // 최초 의뢰 로그 등록
    let logContent = `[🖥️ 첫 문의 자동 연동]\n• 유입 경로: ${data.source}\n`;
    if (data.move_in_date) logContent += `• 입주 희망일: ${data.move_in_date}\n`;
    if (data.photo_urls?.length) logContent += `• 첨부 사진: ${data.photo_urls.length}장\n`;
    if (data.notes) logContent += `• 접수 메시지:\n${data.notes}`;

    await supabase.from("crm_logs").insert([{
      customer_id: customer.id,
      type: "memo",
      content: logContent
    }]);
  }

  return { success: true, data: customer };
}

export async function getCustomerDetail(customerId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) {
    console.error("Error fetching customer detail:", error);
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function sendSmsToCustomer(customerId: string, content: string, subject?: string) {
  const supabase = getAdminClient();
  
  // 1. 고객 연락처 조회
  const { data: customer, error: customerError } = await supabase
    .from("crm_customers")
    .select("phone, name")
    .eq("id", customerId)
    .single();

  if (customerError || !customer || !customer.phone) {
    return { success: false, message: "고객 연락처를 찾을 수 없습니다." };
  }

  // 2. 뿌리오 API를 통한 문자 발송
  const ppurioRes = await sendPpurioSms({
    to: customer.phone,
    content: content,
    subject: subject || "공실뉴스"
  });

  if (!ppurioRes.success) {
    return { success: false, message: ppurioRes.error || "문자 발송에 실패했습니다." };
  }

  // 3. 발송 이력을 crm_logs에 sms 타입으로 기록
  await supabase.from("crm_logs").insert([{
    customer_id: customerId,
    type: "sms",
    content: `[💬 문자 발송]\n${content}`
  }]);

  return { success: true, message: "문자가 성공적으로 발송되었습니다." };
}

export async function sendKakaoToCustomer(customerId: string, content: string, templateCode: string) {
  const supabase = getAdminClient();
  
  // 1. 고객 연락처 및 이름 조회
  const { data: customer, error: customerError } = await supabase
    .from("crm_customers")
    .select("phone, name")
    .eq("id", customerId)
    .single();

  if (customerError || !customer || !customer.phone) {
    return { success: false, message: "고객 연락처를 찾을 수 없습니다." };
  }

  // 2. 뿌리오 API를 통한 카카오 알림톡 발송
  const ppurioRes = await sendPpurioKakao({
    to: customer.phone,
    content: content,
    templateCode: templateCode,
    name: customer.name
  });

  if (!ppurioRes.success) {
    return { success: false, message: ppurioRes.error || "카카오톡 발송에 실패했습니다." };
  }

  // 3. 발송 이력을 crm_logs에 kakao 타입으로 기록
  await supabase.from("crm_logs").insert([{
    customer_id: customerId,
    type: "kakao",
    content: `[🟡 카카오톡 발송]\n${content}`
  }]);

  return { success: true, message: "카카오톡이 성공적으로 발송되었습니다." };
}

