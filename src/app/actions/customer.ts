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
