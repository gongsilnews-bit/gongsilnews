"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./BrokerageArticleContent.module.css";

const faqs = [
  {q:"언론 기사 4건은 어떤 언론사에 보도되나요?",a:"공실뉴스와 제휴된 정식 언론사를 통해 국내 주요 포털 뉴스 지면에 송출됩니다."},
  {q:"기사를 직접 작성해야 하나요?",a:"아닙니다. 등록한 매물 정보를 바탕으로 AI 기사 작성 에이전트가 초안을 만들고 전문 데스크가 검수합니다."},
  {q:"공동중개는 어떻게 진행되나요?",a:"등록된 매물은 공실뉴스 공동중개망을 통해 전국 제휴 중개사에게 공유됩니다."},
  {q:"기본 제공 건수보다 더 발행할 수 있나요?",a:"기본 제공 건수를 사용한 뒤에도 파트너 우대 조건으로 추가 기사 송출을 신청할 수 있습니다."},
];

function Reveal({children,className="",delay=false}:{children:React.ReactNode;className?:string;delay?:boolean}) {
  const ref=useRef<HTMLDivElement>(null); const [visible,setVisible]=useState(false);
  useEffect(()=>{const node=ref.current;if(!node)return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.unobserve(node)}},{threshold:.14});observer.observe(node);return()=>observer.disconnect()},[]);
  return <div ref={ref} className={`${styles.reveal} ${visible?styles.visible:""} ${delay?styles.delay:""} ${className}`}>{children}</div>;
}
function ScreenFrame({src,alt,className=""}:{src:string;alt:string;className?:string}) {
  return <div className={`${styles.screenFrame} ${className}`}><div className={styles.browserBar}><i/><i/><i/></div><Image src={src} alt={alt} width={1024} height={720} sizes="(max-width: 760px) 92vw, 620px" /></div>;
}

export default function BrokerageArticleContent({applyHref}:{applyHref:string}) {
  const [openFaq,setOpenFaq]=useState<number|null>(null);
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.heroInner}>
      <Reveal className={styles.heroCopy}><h1>매물 하나 등록하면<br/><em>중개 기회가 더 넓어집니다.</em></h1><p>공실뉴스에 등록한 매물을<br/>기사와 공동중개로 연결해보세요.</p><Link className={styles.primaryCta} href={applyHref}>무료로 시작하기 <span>→</span></Link></Reveal>
      <Reveal className={styles.heroVisual} delay><ScreenFrame src="/signup_map.png" alt="공실뉴스 AI 매물 콘텐츠 작성 화면"/><div className={styles.phoneFrame}><Image src="/newsrealty_mockup@2x.png" alt="공실뉴스 모바일 화면" width={320} height={316} priority/></div></Reveal>
    </div></section>
    <Story soft={false} imageFirst title="매물만 등록하세요." body={<>복잡한 작업 없이<br/>공실 정보를 간편하게 등록합니다.</>} visual={<ScreenFrame src="/signup_news.png" alt="공실뉴스 매물 정보 등록 결과 화면"/>}/>
    <Story soft title={<>AI가 기사 초안을<br/>만듭니다.</>} body={<>등록한 매물을 바탕으로<br/>기사 작성에 필요한 초안을 만들어드립니다.</>} visual={<ScreenFrame src="/signup_map.png" alt="공실뉴스 AI 기사 초안 작성 화면"/>}/>
    <Story soft={false} imageFirst title={<>내 매물이<br/>콘텐츠가 됩니다.</>} body={<>하나의 매물이 기사뿐 아니라<br/>유튜브와 블로그 콘텐츠로 확장됩니다.</>} visual={<div className={styles.layered}><ScreenFrame src="/signup_news.png" alt="공실뉴스 기사 콘텐츠 화면"/><div className={styles.layerPhone}><Image src="/newsrealty_mockup@2x.png" alt="공실뉴스 모바일 콘텐츠 화면" width={320} height={316}/></div></div>}/>
    <Story soft title={<>전국 중개사와<br/>연결됩니다.</>} body={<>공실뉴스 공동중개망을 통해<br/>새로운 중개 기회를 만들어보세요.</>} visual={<div className={styles.networkVisual}><Image src="/newsrealty_mockup@2x.png" alt="공실뉴스 공동중개 모바일 화면" width={320} height={316}/></div>}/>
    <section className={styles.values}><Reveal><h2>매물 하나가<br/>더 많은 기회를 만듭니다.</h2><div className={styles.valueList}><span>계약 기회</span><span>콘텐츠</span><span>지역 인지도</span></div></Reveal></section>
    <section className={styles.finalCta}><Reveal><h2>좋은 매물이<br/>좋은 기회를 만납니다.</h2><p>공실뉴스에서<br/>내 지역의 매물부터 시작하세요.</p><Link className={styles.primaryCta} href={applyHref}>무료 파트너 등록 <span>→</span></Link></Reveal></section>
    <section className={styles.faq}><h2>자주 묻는 질문</h2><div>{faqs.map((faq,index)=>{const isOpen=openFaq===index;return <article key={faq.q} className={styles.faqItem}><button type="button" aria-expanded={isOpen} onClick={()=>setOpenFaq(isOpen?null:index)}><span>{faq.q}</span><b>{isOpen?"−":"+"}</b></button>{isOpen&&<p>{faq.a}</p>}</article>})}</div></section>
    <footer className={styles.localFooter}>© {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343</footer>
  </main>;
}

function Story({soft,imageFirst=false,title,body,visual}:{soft:boolean;imageFirst?:boolean;title:React.ReactNode;body:React.ReactNode;visual:React.ReactNode}) {
  const copy=<Reveal className={styles.copy}><h2>{title}</h2><p>{body}</p></Reveal>;
  const image=<Reveal className={styles.visual} delay>{visual}</Reveal>;
  return <section className={`${styles.storySection} ${soft?styles.soft:""}`}><div className={`${styles.storyGrid} ${imageFirst?styles.imageFirst:""}`}>{imageFirst?<>{image}{copy}</>:<>{copy}{image}</>}</div></section>;
}
