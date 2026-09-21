"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";
import BrokerageArticleContent from "@/components/newsrealty/BrokerageArticleContent";

export default function MobileBrokerageArticlePage() {
  const router = useRouter();
  return <div>
    <header style={{position:"sticky",top:0,zIndex:50,height:50,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderBottom:"1px solid #eef0f3"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><button type="button" aria-label="뒤로 가기" onClick={() => router.back()} style={{padding:4,border:0,background:"none",color:"#334155",fontSize:22,cursor:"pointer"}}>‹</button><Link href="/m/newsrealty" style={{color:"#111827",fontSize:16,fontWeight:800,textDecoration:"none"}}>공실뉴스부동산</Link></div>
      <Link href="/m/newsrealty/apply" style={{padding:"7px 13px",borderRadius:6,background:"#ff8e15",color:"#fff",fontSize:12,fontWeight:800,textDecoration:"none"}}>입점신청</Link>
    </header>
    <BenefitsSubNav activeTab="brokerage-article" isMobile />
    <BrokerageArticleContent applyHref="/m/newsrealty/apply" />
  </div>;
}
