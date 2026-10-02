import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import StudyResourcesClient from "./StudyResourcesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "자료실 | 공실스터디",
  description: "부동산마케팅에 필요한 자료 공유실입니다.",
};

const RESOURCE_BOARD_IDS = ["drone", "app", "prompt", "sound", "doc"] as const;

export default async function StudyResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; tab?: string; page?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;

  // 1. 자료실 5대 게시판 메타 정보 병렬 조회
  const boardResponses = await Promise.all(
    RESOURCE_BOARD_IDS.map((id) => getBoard(id))
  );

  const boardsMap: Record<string, any> = {};
  boardResponses.forEach((res, idx) => {
    if (res.success && res.data) {
      boardsMap[RESOURCE_BOARD_IDS[idx]] = res.data;
    }
  });

  // 2. 로그인 사용자 정보 및 권한 레벨
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let serverUser: any = null;
  let serverUserLevel = 0;
  let isAdmin = false;

  if (user) {
    const { data } = await supabase
      .from("members")
      .select("role, plan_type, agencies(status)")
      .eq("id", user.id)
      .single();
    const r = data?.role?.toUpperCase() || "";
    isAdmin = r === "ADMIN" || r === "최고관리자" || r.includes("관리자");

    if (data) {
      const { getPermissionLevel } = await import("@/utils/permissionCheck");
      serverUser = { id: user.id, role: data.role, email: user.email };
      serverUserLevel = getPermissionLevel(data);
    }
  }

  // 3. 5대 게시판 글 목록 병렬 조회
  const postResponses = await Promise.all(
    RESOURCE_BOARD_IDS.map((id) => {
      const b = boardsMap[id];
      return b
        ? getBoardPosts(id, { boardType: b.board_type, userId: user?.id, isAdmin })
        : Promise.resolve({ data: [] });
    })
  );

  const postsMap: Record<string, any[]> = {};
  postResponses.forEach((res, idx) => {
    postsMap[RESOURCE_BOARD_IDS[idx]] = (res as any).data || [];
  });

  const selectedBoardKey =
    resolvedParams.board && RESOURCE_BOARD_IDS.includes(resolvedParams.board as any)
      ? resolvedParams.board
      : "drone";

  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#666" }}>자료실을 불러오는 중...</div>}>
      <StudyResourcesClient
        boardsMap={boardsMap}
        postsMap={postsMap}
        serverUser={serverUser}
        serverUserLevel={serverUserLevel}
        initialBoardKey={selectedBoardKey}
      />
    </Suspense>
  );
}
