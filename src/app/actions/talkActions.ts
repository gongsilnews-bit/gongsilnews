"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

/* ═══════════════ 타입 ═══════════════ */

export interface TalkRoom {
  id: string;
  title: string;
  description: string | null;
  type: string; // 'group' | 'private'
  avatar: string;
  created_by: string;
  created_at: string;
  // 조인
  last_message?: string;
  last_message_time?: string;
  last_sender_name?: string;
  member_count?: number;
  my_role?: string;
  unread_count?: number;
}

export interface TalkMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  sender_profile_image?: string;
}

/* ═══════════════ 내 채팅방 목록 ═══════════════ */

export async function getMyRooms(userId: string): Promise<{ success: boolean; data?: TalkRoom[]; error?: string }> {
  const supabase = getAdminClient();
  try {
    // 내가 속한 방 ID + 역할
    const { data: memberships, error: memErr } = await supabase
      .from("talk_room_members")
      .select("room_id, role")
      .eq("user_id", userId);

    if (memErr) throw memErr;
    if (!memberships || memberships.length === 0) return { success: true, data: [] };

    const roomIds = memberships.map(m => m.room_id);
    const roleMap: Record<string, string> = {};
    memberships.forEach(m => { roleMap[m.room_id] = m.role; });

    // 방 정보
    const { data: rooms, error: roomErr } = await supabase
      .from("talk_rooms")
      .select("*")
      .in("id", roomIds)
      .order("created_at", { ascending: false });

    if (roomErr) throw roomErr;

    // 각 방의 마지막 메시지 + 멤버 수
    const result: TalkRoom[] = [];
    for (const room of rooms || []) {
      // 마지막 메시지
      const { data: lastMsg } = await supabase
        .from("talk_messages")
        .select("content, sender_name, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // 멤버 수
      const { count } = await supabase
        .from("talk_room_members")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      result.push({
        ...room,
        last_message: lastMsg?.content || "",
        last_message_time: lastMsg?.created_at || room.created_at,
        last_sender_name: lastMsg?.sender_name || "",
        member_count: count || 0,
        my_role: roleMap[room.id],
      });
    }

    // 마지막 메시지 시간 기준 정렬
    result.sort((a, b) => new Date(b.last_message_time || "").getTime() - new Date(a.last_message_time || "").getTime());

    return { success: true, data: result };
  } catch (error: any) {
    console.error("채팅방 목록 조회 오류:", error);
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 메시지 조회 ═══════════════ */

export async function getRoomMessages(roomId: string, limit = 50): Promise<{ success: boolean; data?: TalkMessage[]; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("talk_messages")
      .select("id, room_id, sender_id, sender_name, content, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    // 프로필 이미지 조회
    const senderIds = [...new Set((data || []).map(m => m.sender_id))];
    let profileMap: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: members } = await supabase
        .from("members")
        .select("id, profile_image_url")
        .in("id", senderIds);
      (members || []).forEach(m => { if (m.profile_image_url) profileMap[m.id] = m.profile_image_url; });
    }

    const messages: TalkMessage[] = (data || []).map(m => ({
      ...m,
      sender_profile_image: profileMap[m.sender_id] || undefined,
    }));

    return { success: true, data: messages };
  } catch (error: any) {
    console.error("메시지 조회 오류:", error);
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 메시지 전송 ═══════════════ */

export async function sendMessage(roomId: string, senderId: string, senderName: string, content: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("talk_messages")
      .insert({ room_id: roomId, sender_id: senderId, sender_name: senderName, content });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("메시지 전송 오류:", error);
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 채팅방 생성 ═══════════════ */

export async function createRoom(params: {
  title: string;
  description?: string;
  type: string;
  avatar: string;
  creatorId: string;
}): Promise<{ success: boolean; roomId?: string; error?: string }> {
  const supabase = getAdminClient();
  try {
    // 방 생성
    const { data: room, error: roomErr } = await supabase
      .from("talk_rooms")
      .insert({
        title: params.title,
        description: params.description || null,
        type: params.type,
        avatar: params.avatar,
        created_by: params.creatorId,
      })
      .select("id")
      .single();

    if (roomErr) throw roomErr;

    // 방장으로 등록
    const { error: memberErr } = await supabase
      .from("talk_room_members")
      .insert({
        room_id: room.id,
        user_id: params.creatorId,
        role: "owner",
      });

    if (memberErr) throw memberErr;

    // 시스템 메시지
    const { error: msgErr } = await supabase
      .from("talk_messages")
      .insert({
        room_id: room.id,
        sender_id: params.creatorId,
        sender_name: "시스템",
        content: "채팅방이 생성되었습니다 🎉",
      });

    return { success: true, roomId: room.id };
  } catch (error: any) {
    console.error("채팅방 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 1:1 DM 찾기/생성 ═══════════════ */

export async function findOrCreateDM(myUserId: string, myName: string, targetUserId: string, targetName: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
  const supabase = getAdminClient();
  try {
    // 내가 속한 private 방 중 targetUserId도 있는 방 찾기
    const { data: myRooms } = await supabase
      .from("talk_room_members")
      .select("room_id")
      .eq("user_id", myUserId);

    if (myRooms && myRooms.length > 0) {
      const myRoomIds = myRooms.map(r => r.room_id);

      // private 방 필터
      const { data: privateRooms } = await supabase
        .from("talk_rooms")
        .select("id")
        .in("id", myRoomIds)
        .eq("type", "private");

      if (privateRooms && privateRooms.length > 0) {
        const privateRoomIds = privateRooms.map(r => r.id);

        // 그 중 targetUserId도 멤버인 방 찾기
        const { data: targetMembership } = await supabase
          .from("talk_room_members")
          .select("room_id")
          .in("room_id", privateRoomIds)
          .eq("user_id", targetUserId);

        if (targetMembership && targetMembership.length > 0) {
          // 기존 DM 방 발견
          return { success: true, roomId: targetMembership[0].room_id };
        }
      }
    }

    // 없으면 새로 생성
    const { data: room, error: roomErr } = await supabase
      .from("talk_rooms")
      .insert({
        title: `${myName}, ${targetName}`,
        type: "private",
        avatar: "💬",
        created_by: myUserId,
      })
      .select("id")
      .single();

    if (roomErr) throw roomErr;

    // 두 명 다 멤버로 등록
    await supabase
      .from("talk_room_members")
      .insert([
        { room_id: room.id, user_id: myUserId, role: "owner" },
        { room_id: room.id, user_id: targetUserId, role: "member" },
      ]);

    return { success: true, roomId: room.id };
  } catch (error: any) {
    console.error("DM 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 멤버 관리 ═══════════════ */

export async function addRoomMember(roomId: string, userId: string, role = "member"): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("talk_room_members")
      .upsert({ room_id: roomId, user_id: userId, role }, { onConflict: "room_id,user_id" });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRoomMembers(roomId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("talk_room_members")
      .select("user_id, role, joined_at, members:user_id(name, profile_image_url)")
      .eq("room_id", roomId);

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* ═══════════════ 프로필 관리 ═══════════════ */

export async function updateMyName(userId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase.from("members").update({ name: newName }).eq("id", userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("이름 수정 오류:", error);
    return { success: false, error: error.message };
  }
}
