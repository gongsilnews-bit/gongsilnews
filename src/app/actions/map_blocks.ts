"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface MapBlock {
  id?: string;
  name: string;
  sido?: string;
  sigungu?: string;
  dong?: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
  is_active?: boolean;
  created_at?: string;
}

// ── 블럭 목록 조회 ──
export async function getMapBlocks(filters?: { sido?: string; sigungu?: string }) {
  const supabase = getAdminClient();
  let query = supabase
    .from("map_blocks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters?.sido) query = query.eq("sido", filters.sido);
  if (filters?.sigungu) query = query.eq("sigungu", filters.sigungu);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ── 블럭 생성 ──
export async function createMapBlock(block: MapBlock) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("map_blocks")
    .insert({
      name: block.name,
      sido: block.sido || null,
      sigungu: block.sigungu || null,
      dong: block.dong || null,
      coordinates: block.coordinates,
      color: block.color || "#0066cc",
      is_active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ── 블럭 수정 ──
export async function updateMapBlock(id: string, updates: Partial<MapBlock>) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("map_blocks")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.sido !== undefined && { sido: updates.sido }),
      ...(updates.sigungu !== undefined && { sigungu: updates.sigungu }),
      ...(updates.dong !== undefined && { dong: updates.dong }),
      ...(updates.coordinates !== undefined && { coordinates: updates.coordinates }),
      ...(updates.color !== undefined && { color: updates.color }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ── 블럭 삭제 (soft delete) ──
export async function deleteMapBlock(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("map_blocks")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
