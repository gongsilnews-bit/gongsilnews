import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import MobileBoardClient from "./MobileBoardClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "?ë£Œ??- ê³µì‹¤?´ìŠ¤",
};

export default async function MobileBoardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const boardId = resolvedParams.id || "drone";

  const boardRes = await getBoard(boardId);
  const board = boardRes.success ? boardRes.data : null;

  let posts = [];
  let serverUser = null;
  let serverUserLevel = 0;

  if (board) {
    // Get current user auth
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let isAdmin = false;
    
    if (user) {
      const { data } = await supabase.from("members").select("role, plan_type").eq("id", user.id).single();
      const r = data?.role?.toUpperCase() || "";
      isAdmin = r === "ADMIN" || r === "ìµœê³ ê´€ë¦¬ì" || r.includes("ê´€ë¦¬ì");
      
      if (data) {
        const { getPermissionLevel } = await import("@/utils/permissionCheck");
        serverUser = { id: user.id, role: data.role, email: user.email };
        serverUserLevel = getPermissionLevel(data);
      }
    }

    const postsRes = await getBoardPosts(boardId, {
      boardType: board.board_type,
      userId: user?.id,
      isAdmin
    });
    posts = postsRes.success ? postsRes.data : [];
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666", minHeight: "100vh", paddingTop: "100px" }}>?ë£Œ?¤ì„ ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>}>
      {board ? (
        <MobileBoardClient board={board} initialPosts={posts} serverUser={serverUser} serverUserLevel={serverUserLevel} />
      ) : (
        <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#666", minHeight: "100vh", paddingTop: "100px" }}>ì¡´ì¬?˜ì? ?ŠëŠ” ?ë£Œ?¤ì…?ˆë‹¤.</div>
      )}
    </Suspense>
  );
}
