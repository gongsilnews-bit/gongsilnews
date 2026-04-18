"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/* ── 포인트 정책 조회 ── */
export async function getPointSettings() {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("point_settings").select("*");
  if (error) return { success: false, error: error.message, data: {} as Record<string, number> };
  const map: Record<string, number> = {};
  (data || []).forEach((row: any) => { map[row.key] = Number(row.value); });
  return { success: true, data: map };
}

/* ── 포인트 정책 수정 ── */
export async function updatePointSetting(key: string, value: number) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("point_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 잔액 조회 ── */
export async function getPointBalance(memberId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("point_balance")
    .eq("id", memberId)
    .single();
  if (error) return { success: false, error: error.message, balance: 0 };
  return { success: true, balance: data?.point_balance || 0 };
}

/* ── 거래 내역 조회 ── */
export async function getPointTransactions(opts?: {
  memberId?: string;
  type?: "EARN" | "SPEND";
  limit?: number;
  offset?: number;
}) {
  const supabase = getAdminClient();
  let q = supabase
    .from("point_transactions")
    .select("*, member:members!point_transactions_member_id_fkey(name, email), counterpart:members!point_transactions_counterpart_id_fkey(name, email)")
    .order("created_at", { ascending: false });

  if (opts?.memberId) q = q.eq("member_id", opts.memberId);
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 50) - 1);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/* ── 전체 회원 포인트 현황 ── */
export async function getAllMembersWithBalance() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, role, point_balance, created_at")
    .eq("is_deleted", false)
    .order("point_balance", { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/* ── 관리자 수동 지급/차감 ── */
export async function adminAdjustPoints(memberId: string, amount: number, reason: string) {
  const supabase = getAdminClient();

  // 현재 잔액 조회
  const { data: member, error: mErr } = await supabase
    .from("members")
    .select("point_balance")
    .eq("id", memberId)
    .single();
  if (mErr || !member) return { success: false, error: "회원 조회 실패" };

  const currentBalance = member.point_balance || 0;
  const newBalance = currentBalance + amount;
  if (newBalance < 0) return { success: false, error: "잔액이 부족합니다." };

  // 잔액 업데이트
  const { error: uErr } = await supabase
    .from("members")
    .update({ point_balance: newBalance })
    .eq("id", memberId);
  if (uErr) return { success: false, error: uErr.message };

  // 거래 기록
  const { error: tErr } = await supabase.from("point_transactions").insert({
    member_id: memberId,
    type: amount >= 0 ? "EARN" : "SPEND",
    amount: Math.abs(amount),
    reason: amount >= 0 ? (reason || "관리자지급") : (reason || "관리자차감"),
    balance_after: newBalance,
  });
  if (tErr) return { success: false, error: tErr.message };

  return { success: true, balance: newBalance };
}

/* ── P2P 전송 ── */
export async function transferPoints(fromId: string, toId: string, amount: number) {
  if (amount <= 0) return { success: false, error: "전송 금액은 0보다 커야 합니다." };
  if (fromId === toId) return { success: false, error: "자신에게 전송할 수 없습니다." };

  const supabase = getAdminClient();

  // 정책 조회
  const { data: settings } = await getPointSettings();
  const feeRate = settings?.TRANSFER_FEE_RATE || 0;
  const maxOnce = settings?.TRANSFER_MAX_ONCE || 999999999;
  const maxDaily = settings?.TRANSFER_MAX_DAILY || 999999999;

  if (amount > maxOnce) return { success: false, error: `1회 최대 전송 한도는 ${maxOnce.toLocaleString()}P입니다.` };

  // 일일 전송 한도 체크
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayTransfers } = await supabase
    .from("point_transactions")
    .select("amount")
    .eq("member_id", fromId)
    .eq("reason", "P2P전송")
    .gte("created_at", todayStart.toISOString());
  const todayTotal = (todayTransfers || []).reduce((s: number, t: any) => s + t.amount, 0);
  if (todayTotal + amount > maxDaily) return { success: false, error: `오늘의 전송 한도(${maxDaily.toLocaleString()}P)를 초과합니다.` };

  // 수수료 계산
  const fee = Math.floor(amount * feeRate / 100);
  const totalDeduct = amount + fee;

  // 보내는 사람 잔액 확인
  const { data: sender } = await supabase.from("members").select("point_balance, name").eq("id", fromId).single();
  if (!sender) return { success: false, error: "보내는 회원을 찾을 수 없습니다." };
  if ((sender.point_balance || 0) < totalDeduct) return { success: false, error: "잔액이 부족합니다." };

  // 받는 사람 확인
  const { data: receiver } = await supabase.from("members").select("point_balance, name").eq("id", toId).single();
  if (!receiver) return { success: false, error: "받는 회원을 찾을 수 없습니다." };

  const senderNewBalance = (sender.point_balance || 0) - totalDeduct;
  const receiverNewBalance = (receiver.point_balance || 0) + amount;

  // 보내는 사람 잔액 차감
  await supabase.from("members").update({ point_balance: senderNewBalance }).eq("id", fromId);
  // 받는 사람 잔액 증가
  await supabase.from("members").update({ point_balance: receiverNewBalance }).eq("id", toId);

  // 거래 기록 (보내는 사람)
  await supabase.from("point_transactions").insert({
    member_id: fromId,
    type: "SPEND",
    amount: totalDeduct,
    reason: "P2P전송",
    counterpart_id: toId,
    balance_after: senderNewBalance,
  });

  // 거래 기록 (받는 사람)
  await supabase.from("point_transactions").insert({
    member_id: toId,
    type: "EARN",
    amount,
    reason: "P2P수신",
    counterpart_id: fromId,
    balance_after: receiverNewBalance,
  });

  return { success: true, fee, senderBalance: senderNewBalance };
}

/* ── 회원 검색 (전송 시 사용) ── */
export async function searchMembersForTransfer(query: string, excludeId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, role")
    .eq("is_deleted", false)
    .neq("id", excludeId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);
  if (error) return { success: false, data: [] };
  return { success: true, data: data || [] };
}
