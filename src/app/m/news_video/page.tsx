// 모바일 동영상뉴스 — 누르면 크게 재생, 쇼츠는 위아래로 밀어 다음 영상 (2026-11-13 사장님)
import VideoNewsClient from "@/components/video/VideoNewsClient";
import { getVideoNews } from "@/utils/videoNews";

export const revalidate = 60;
export const metadata = { title: "동영상뉴스 | 공실뉴스" };

export default async function MobileNewsVideoPage() {
  const items = await getVideoNews(60);
  return (
    <main style={{ padding: "18px 14px 90px", background: "#fff", minHeight: "100dvh" }}>
      <VideoNewsClient items={items} mobile />
    </main>
  );
}
