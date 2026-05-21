"use server";

import { createClient } from "@supabase/supabase-js";

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

  return { success: true, data };
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
}) {
  const supabase = getAdminClient();
  
  // 1. 소속 부동산 ID 찾기
  const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", ownerId).single();
  if (!agency) return { success: false, message: "부동산 정보를 찾을 수 없습니다." };

  // 2. 동일 연락처 중복 여부 확인
  const { data: existingCustomer } = await supabase
    .from("crm_customers")
    .select("*")
    .eq("agency_id", agency.id)
    .eq("phone", data.phone)
    .limit(1);

  let customer = existingCustomer && existingCustomer.length > 0 ? existingCustomer[0] : null;

  if (customer) {
    // [중복된 경우]: 기존 고객 상태를 "신규"로 복구하고 최신 유입 정보 갱신
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("crm_customers")
      .update({
        status: "신규",
        is_registered_member: data.is_registered_member ?? customer.is_registered_member,
        target_vacancy_id: data.target_vacancy_id ?? customer.target_vacancy_id,
        source_flyer_id: data.source_flyer_id ?? customer.source_flyer_id,
        source: data.source
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
    let logContent = `[🖥️ 추가 문의 자동 연동]\n• 유입 경로: ${data.source}\n`;
    if (data.area) logContent += `• 희망 조건: ${data.area}\n`;
    if (data.budget) logContent += `• 희망 예산: ${data.budget}\n`;
    if (data.notes) logContent += `• 접수 메시지:\n${data.notes}`;

    await supabase.from("crm_logs").insert([{
      customer_id: customer.id,
      type: "memo",
      content: logContent
    }]);
  } else {
    // [신규 고객인 경우]: 신규 레코드 생성
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
        source_flyer_id: data.source_flyer_id || null
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
    if (data.notes) logContent += `• 접수 메시지:\n${data.notes}`;

    await supabase.from("crm_logs").insert([{
      customer_id: customer.id,
      type: "memo",
      content: logContent
    }]);
  }

  return { success: true, data: customer };
}
