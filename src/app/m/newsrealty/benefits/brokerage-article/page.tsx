"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NewsrealtyBenefits from "@/components/newsrealty/NewsrealtyBenefits";

export default function MobileBrokerageArticlePage() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/m/newsrealty/apply");
  };

  return <div style={{paddingTop:50}}>
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:9999990,height:50,boxSizing:"border-box",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderBottom:"1px solid #eef0f3"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><button type="button" aria-label="뒤로 가기" onClick={() => router.back()} style={{padding:4,border:0,background:"none",color:"#334155",fontSize:22,cursor:"pointer"}}>‹</button><Link href="/m/newsrealty" style={{color:"#111827",fontSize:16,fontWeight:800,textDecoration:"none"}}>공실뉴스부동산</Link></div>
      <Link href="/m/newsrealty/apply" style={{padding:"7px 13px",borderRadius:6,background:"#ff8e15",color:"#fff",fontSize:12,fontWeight:800,textDecoration:"none"}}>입점신청</Link>
    </header>
    <NewsrealtyBenefits onApply={handleApplyClick} inquiryHref="/m/newsrealty/guide/inquiry" tabsTop={50} showFooter />
  </div>;
}
