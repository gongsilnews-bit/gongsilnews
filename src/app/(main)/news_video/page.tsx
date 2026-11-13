// 동영상뉴스 — 영상이 있는 기사만 모아 그 자리에서 재생 (2026-11-13 사장님)
import VideoNewsClient from "@/components/video/VideoNewsClient";
import { getVideoNews } from "@/utils/videoNews";

export const revalidate = 60;
export const metadata = { title: "동영상뉴스 | 공실뉴스", description: "공실뉴스 부동산 동영상뉴스 · 쇼츠 모아 보기" };

export default async function NewsVideoPage() {
  const items = await getVideoNews(80);
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 20px 80px" }}>
      <VideoNewsClient items={items} />
    </main>
  );
}
