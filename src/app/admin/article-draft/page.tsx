import { Suspense } from "react";
import StandaloneArticleDraftPage from "@/components/admin/article-draft/StandaloneArticleDraftPage";

export default function ArticleDraftPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eef1f5", color: "#6b7280" }}>작성기를 불러오고 있습니다...</div>}>
      <StandaloneArticleDraftPage />
    </Suspense>
  );
}
