import { getBoardPosts } from "@/app/actions/board";
import PremiumDroneCarousel from "./PremiumDroneCarousel";

export default async function PremiumDroneSection() {
  const { data } = await getBoardPosts("pds");
  const posts = data?.slice(0, 12) || [];

  if (posts.length === 0) return null;

  return (
    <div className="premium-bg">
      <div className="container px-20">
        <div className="sec-title-wrap">
          <h2 className="sec-title" style={{ color: "#fff" }}>드론영상 (자료실)</h2>
        </div>
        <PremiumDroneCarousel posts={posts} />
      </div>
    </div>
  );
}
