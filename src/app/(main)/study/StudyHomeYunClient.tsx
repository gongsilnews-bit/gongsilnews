"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import StudyHeader, { STUDY_HOME_HERO_BAR } from "@/components/study/StudyHeader";
import styles from "./studyHomeYun.module.css";

const TARGET_AUDIENCE = [
  {
    tag: "RECOMMEND 01",
    title: "사무실/상가 전문 부동산",
    image: "/images/study/recommend_real_teheran_man.jpg",
    imageAlt: "강남 테헤란로를 걸으며 스마트폰으로 공실뉴스를 열람하는 전문 남성 공인중개사",
    description: "빠른 공실계약이 필요한 사무실/상가 전문 부동산 대표님!  고객에게 브리핑이 꼭! 필요할때~",
    solution: "AI 매매보고서 초안 10초 완성!~공실뉴스에서 공실만 등록하면, 빠르게 완성할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    description: "단지 내 물건작업과 임장작업이 필수인 아파트/오피스텔 입점 부동산 대표님!~  차별화된 서비스를 고객에게 제공하고 싶을때~",
    solution: "물건접수웹페이지, 아파트/오피스텔 인테리어 예상AI서비스로 스마트하게 중개할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 03",
    title: "빌라/주택 건물 부동산",
    image: "/images/study/recommend_real_villa.jpg",
    imageAlt: "신축 빌라와 주택 현장 영상 촬영 짐벌을 든 전문 공인중개사",
    description: "원룸·투룸 다가구부터 꼬마빌딩까지, 유튜브가 가장 효율적이라는데,,, 어떻게 촬영하고 편집해야 할지 막막한 대표님!",
    solution: "손님의 Call로 연결되는 유튜브 영상제작! 촬영방법부터 편집법까지! 따라만 하세요!",
  },
];

const FAQS = [
  {
    question: "컴퓨터나 AI를 잘 모르는 초보자도 따라갈 수 있나요?",
    answer:
      "네. 복잡한 이론보다 실제 매물을 가지고 화면을 보며 순서대로 따라 하는 실습에 집중합니다. 필요한 부분은 온라인에서 반복해 볼 수 있습니다.",
  },
  {
    question: "공실스터디에서는 무엇을 배우나요?",
    answer:
      "AI를 활용한 매물 설명과 블로그 글 작성, 유튜브 콘텐츠 기획과 편집, 공실 홍보 등 1~2인 부동산이 현장에서 바로 활용할 수 있는 내용을 배웁니다.",
  },
  {
    question: "스마트폰에서도 수강할 수 있나요?",
    answer: "네. PC는 물론 스마트폰과 태블릿에서도 강의를 볼 수 있습니다.",
  },
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function StudyHomeYunClient() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className={styles.page}>
      <StudyHeader background={STUDY_HOME_HERO_BAR} />

      <main>
        {/* ━━━ [1섹션] 메인 히어로 ━━━ */}
        <section className={styles.hero} aria-labelledby="study-hero-title">
          <div className={styles.heroShade} aria-hidden="true" />

          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>AI 스마트폰, SNS 시대!</p>
            <h1 id="study-hero-title">
              유튜브, 블로그, SNS
              <br />
              <span>부동산은 꼭! 해야 합니다.</span>
            </h1>
            <p className={styles.heroDescription}>
              정보를 주고 받는 부동산에게 유튜브/블로그/SNS 마케팅은 선택이 아니라 필수입니다!
              <br />
              이제, 공실스터디멤버가 되시면, 블로그/유튜브/SNS 마케팅 바로 시작하실 수 있습니다!
            </p>
            <div className={styles.heroActions}>
              <Link href="/study/benefits/vacancy-register" className={styles.heroPrimary}>
                멤버쉽 혜택 &gt;&gt;
              </Link>
              <Link href="/study/apply" className={styles.heroSecondary}>
                멤버쉽 신청하기 &gt;&gt;
              </Link>
            </div>
            <p className={styles.heroNote}>물건 등록 한 번으로 자동 완성 · 전국 11만 부동산 네트워크 연동 · 초보자도 쉽게</p>
          </div>
        </section>

        {/* ━━━ [2섹션] 대형부동산 현황 (Market Reality) ━━━ */}
        <section className={styles.marketSection} aria-labelledby="market-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.kicker}>MARKET REALITY</p>
              <h2 id="market-title">
                대형 부동산은 매일 꾸준히
                <br />
                <span>유튜브·블로그, SNS마케팅을 운영하고 있습니다.</span>
              </h2>
              <p className={styles.sectionDescription}>
                전문 인력을 갖춘 대형 부동산들은 매일 마케팅 담당자가 유튜브/ 블로그/SNS를 꾸준히 운영하며, 온라인 고객과 전속 매물을 꾸준히 선점하고 있습니다.
              </p>
            </header>

            <div className={styles.marketGrid}>
              <div className={styles.marketCard}>
                <div className={styles.marketCardImgBox}>
                  <Image
                    src="/images/study/market-corp-youtube.jpg"
                    alt="유튜브 영상을 전문 제작하는 대형 중개법인 미디어팀"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.marketCardImg}
                  />
                  <div className={styles.marketCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                </div>
                <span className={styles.marketBadge}>전문 기획·촬영팀 상주</span>
                <h3>부동산유튜브 채널 운영</h3>
                <p>
                  전문 촬영 장비와 드론, 전담 PD를 배치해 매주 현장 임장 영상과 쇼츠를 쏟아내며 온라인 고객을 꾸준히 만납니다.
                </p>
              </div>

              <div className={styles.marketCard}>
                <div className={styles.marketCardImgBox}>
                  <Image
                    src="/images/study/market-corp-ai-report.jpg"
                    alt="AI를 활용해 매매보고서와 홈페이지를 전문적으로 운영하는 모습"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.marketCardImg}
                  />
                  <div className={styles.marketCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                </div>
                <span className={styles.marketBadge}>전문적인 온라인 작업</span>
                <h3>매매보고서, 홈페이지 운영</h3>
                <p>
                  부동산 운영에 필요한 전문적인 매매보고서, 꾸준한 홈페이지 운영을 AI를 활용해 쉽게 빠르게 운영합니다.
                </p>
              </div>

              <div className={styles.marketCard}>
                <div className={styles.marketCardImgBox}>
                  <Image
                    src="/images/study/market-corp-sns-blog.jpg"
                    alt="블로그 및 SNS 마케팅을 활발히 운영하는 대형 중개법인"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.marketCardImg}
                  />
                  <div className={styles.marketCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                </div>
                <span className={styles.marketBadge} style={{ visibility: "hidden" }}>&nbsp;</span>
                <h3>SNS마케팅 채널 운영</h3>
                <p>
                  AI 스마트폰시대, 부동산 정보를 빠르게 SNS로 젊은 고객에게 전달하며, 온라인으로 고객과 소통하며 오프라인에서 만납니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ [대조 브릿지] 대형 법인 VS 로컬 1~2인 부동산 (가운데 라인 정렬) ━━━ */}
        <div className={styles.vsDividerWrap} aria-hidden="true">
          <div className={styles.contentWidth}>
            <div className={styles.vsDividerInner}>
              <span className={styles.vsLine} />
              <span className={styles.vsBadge}>VS</span>
              <span className={styles.vsLine} />
            </div>
          </div>
        </div>

        {/* ━━━ [3섹션] 1~2인 로컬 부동산의 현실 고충 (Local Reality) ━━━ */}
        <section className={styles.painSection} aria-labelledby="pain-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.painKicker}>LOCAL BROKER REALITY</p>
              <h2 id="pain-title">
                <span className={styles.painTitleHighlight}>하지만</span> 1~2인 로컬 부동산은
                <br />
                <span>온라인마케팅 할 시간이 많지 않습니다</span>
              </h2>
              <p className={styles.sectionDescription}>
                임장 가고, 손님 받고, 계약서 쓰기도 바쁜 하루… 중요성을 알면서도 포기할 수밖에 없었던 대표님들의 현실적인 이유입니다.
              </p>
            </header>

            <div className={styles.painGrid}>
              {/* 1번 카드: 비싼 온라인광고비 & 고정비용 증가 (대표 소장님) */}
              <div className={styles.painCard}>
                <div className={styles.painCardImgBox}>
                  <Image
                    src="/images/study/char-local-40s-agency-won.jpg"
                    alt="비싼 온라인 광고비와 고정비용 증가로 고민하는 동네 공인중개사와 나가는 마케팅 직원"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.painCardImg}
                  />
                  <div className={styles.painCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6l3.5 12L12 9l4.5 9L20 6" />
                      <line x1="3" y1="11" x2="21" y2="11" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                    </svg>
                  </div>
                </div>
                <span className={styles.painBadge}>비용 부담 · 고정비 증가</span>
                <h3>비싼 온라인광고비 &amp; 고정비용 증가</h3>
                <p>
                  &ldquo;온라인광고비, 사무실임대료, 공실열람비용이 너무 부담스럽습니다.&rdquo; 고정비증가로 온라인 마케팅 대행을 맡기는 것은 꿈도 못꿔요.
                </p>
              </div>

              {/* 2번 카드: 1~2인 부동산의 과중한 업무 (김성수 소장님) */}
              <div className={styles.painCard}>
                <div className={styles.painCardImgBox}>
                  <Image
                    src="/images/study/char-local-40s-busy.jpg"
                    alt="시간 부족으로 피로에 지친 동네 공인중개사 3D 캐릭터"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.painCardImg}
                  />
                  <div className={styles.painCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <span className={styles.painBadge}>시간 부족 · 야근 피로</span>
                <h3>1~2인 부동산의 과중한 업무</h3>
                <p>
                  &ldquo;하루 종일 일하고 들어와서 언제 컴퓨터 켜고 글을 쓰나요…&rdquo; 사진 정리하고 글 한 편 쓰려면 녹초가 되어 결국 작심삼일로 끝나고 맙니다.
                </p>
              </div>

              {/* 3번 카드: 제작 장벽 · 카메라 울렁증 (이미숙 소장님) */}
              <div className={styles.painCard}>
                <div className={styles.painCardImgBox}>
                  <Image
                    src="/images/study/char-local-40s-camera.jpg"
                    alt="스마트폰 카메라 울렁증으로 당황하는 동네 공인중개사 3D 캐릭터"
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.painCardImg}
                  />
                  <div className={styles.painCardIconOverlay}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>
                <span className={styles.painBadge}>제작 장벽 · 카메라 울렁증</span>
                <h3>스마트폰 앞에만 서면 멘붕</h3>
                <p>
                  &ldquo;스마트폰 앞에만 서면 무슨 말을 해야 할지 머릿속이 하얘집니다.&rdquo; 촬영 장비도 없고 편집 툴도 다룰 줄 몰라 시작부터 막막합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

                {/* ━━━ [4섹션] 공실뉴스 AI 1분 솔루션: 3단계 프로세스 (위치 이동: 3단 무료 혜택 상단) ━━━ */}
        <section className={styles.processSection} aria-labelledby="process-section-title">
          <div className={styles.contentWidth}>

            <header className={styles.processHeader}>
              <p className={styles.kicker}>공실뉴스 AI 원스톱 솔루션</p>
              <h2 id="process-section-title">
                <span className={styles.painTitleHighlight} style={{ color: "#ffffff" }}>오늘부터</span> 공실스터디멤버가 되시면,
                <br />
                <span>바로 시작하실 수 있습니다.</span>
              </h2>

              {/* 3명의 소장님 대형 배너 (마우스 오버 시 환호 표정으로 전환) */}
              <div className={styles.trioBannerWrap}>
                <div className={styles.trioBannerImgBox}>
                  <Image
                    src="/images/study/trio-brokers-amazed.jpg"
                    alt="공실스터디 이전 힘들어하던 3명의 공인중개사 소장님들"
                    fill
                    sizes="(max-width: 1200px) 100vw, 1100px"
                    className={styles.trioBannerImgDefault}
                    priority
                  />
                  <Image
                    src="/images/study/trio-brokers-cheering-v2.jpg"
                    alt="공실스터디 멤버가 되어 환호하고 기뻐하는 3명의 공인중개사 소장님들"
                    fill
                    sizes="(max-width: 1200px) 100vw, 1100px"
                    className={styles.trioBannerImgHover}
                    priority
                  />
                  <div className={styles.trioBannerBadgeDefault}>
                    <span className={styles.trioBadgePulse} />
                    <span>마우스를 올리면 소장님들의 변화를 볼 수 있어요! 👆</span>
                  </div>
                </div>
              </div>
            </header>
          </div>
        </section>

{/* ━━━ [신규 중간 브릿지] 내 지역/단지 공실만 등록하면 3대 무료 혜택 (부동산마케팅, SNS포스팅, 유튜브강의) ━━━ */}
        <section className={styles.freeOfferSection} aria-label="공실뉴스 등록 시 3대 무료 혜택">
          <div className={styles.contentWidth}>
            <header className={styles.freeOfferHeader}>
              <div className={styles.freeOfferBadge}>100% 무료 혜택</div>
              <h2 className={styles.freeOfferTitle}>
                내 지역/단지 공실만 등록하면<br />
                <span className={styles.freeOfferHighlight}>부동산마케팅, SNS포스팅, 유튜브 강의까지!</span>
              </h2>
              <p className={styles.freeOfferSub}>
                공실뉴스에 내 지역·단지 물건을 등록하기만 하면, 매매보고서, 홍보지출력, 부동산홈페이지까지... 자동으로 완성됩니다.
              </p>
            </header>

            <div className={styles.freeOfferList}>
              {/* 1단: 부동산마케팅 (이미지 좌측, 내용 우측) */}
              <div className={styles.freeOfferRow}>
                <Link
                  href="/study/benefits/vacancy-register"
                  className={styles.freeOfferImgBox}
                  title="부동산마케팅 원클릭 OK! 자세히 보기"
                >
                  <Image
                    src="/images/study/benefit_market_50s_broker_v3.jpg"
                    alt="동네 주택가 상가 부동산에서 거래완료 유리창 홍보지와 듀얼 모니터의 물건 지도를 갖춘 50대 남성 공인중개사 대표 소장님"
                    fill
                    sizes="(max-width: 900px) 100vw, 540px"
                    className={styles.freeOfferImg}
                    priority
                  />
                  <div className={styles.freeOfferLabelBadge}>부동산마케팅</div>
                  <div className={styles.freeOfferImgOverlay}>
                    <span className={styles.freeOfferDetailBadge}>
                      자세히 보기
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-6-6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
                <div className={styles.freeOfferContent}>
                  <span className={styles.freeOfferChip}>공실등록20건</span>
                  <h3 className={styles.freeOfferContentTitle}>부동산마케팅 원클릭 OK!</h3>
                  <ul className={styles.freeOfferCheckList}>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>공동중개 물건 홍보</strong>
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>AI 매매보고서</strong> 즉시 생성
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>유리창 홍보지</strong> 1초 자동 출력
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>부동산웹페이지</strong> (내 물건 자동연동)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2단: SNS 마케팅 (내용 좌측, 이미지 우측 - 지그재그) */}
              <div className={`${styles.freeOfferRow} ${styles.freeOfferRowReverse}`}>
                <div className={styles.freeOfferContent}>
                  <span className={styles.freeOfferChip}>공실등록하면</span>
                  <h3 className={styles.freeOfferContentTitle}>SNS 마케팅 원클릭 자동화</h3>
                  <ul className={styles.freeOfferCheckList}>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>AI 블로그 포스팅</strong> 초안 자동
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>페이스북, 인스타그램, 쓰레드</strong> 초안 자동
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>유튜브 대본</strong> 초안 작성
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>인테리어 / 리모델링 AI</strong> 예상 견적등등
                      </span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/study/benefits/blog-automation"
                  className={styles.freeOfferImgBox}
                  title="SNS 마케팅 원클릭 자동화 자세히 보기"
                >
                  <Image
                    src="/images/study/benefit_sns_40s_broker_v2.jpg"
                    alt="테헤란로 공인중개사 사무소에서 듀얼 모니터로 네이버 블로그 추천 매물 포스팅과 SNS 자동화 피드를 확인하는 40대 남녀 소장님"
                    fill
                    sizes="(max-width: 900px) 100vw, 540px"
                    className={styles.freeOfferImg}
                    priority
                  />
                  <div className={styles.freeOfferLabelBadge}>SNS 마케팅</div>
                  <div className={styles.freeOfferImgOverlay}>
                    <span className={styles.freeOfferDetailBadge}>
                      자세히 보기
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-6-6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </div>

              {/* 3단: AI 유튜브 강의 (이미지 좌측, 내용 우측) */}
              <div className={styles.freeOfferRow}>
                <Link
                  href="/study/benefits/ai-youtube"
                  className={styles.freeOfferImgBox}
                  title="부동산 유튜브 실습 & 커뮤니티 자세히 보기"
                >
                  <Image
                    src="/images/study/benefit_youtube_40s_female_broker.jpg"
                    alt="아파트 단지 상가 부동산에서 브루 AI로 매물 쇼츠를 제작하고 공실스터디 온라인 강의를 수강하는 40대 여성 공인중개사 대표 소장님"
                    fill
                    sizes="(max-width: 900px) 100vw, 540px"
                    className={styles.freeOfferImg}
                    priority
                  />
                  <div className={styles.freeOfferLabelBadge}>AI 유튜브 강의</div>
                  <div className={styles.freeOfferImgOverlay}>
                    <span className={styles.freeOfferDetailBadge}>
                      자세히 보기
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-6-6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
                <div className={styles.freeOfferContent}>
                  <span className={styles.freeOfferChip}>부동산 유튜브 강의</span>
                  <h3 className={styles.freeOfferContentTitle}>부동산 유튜브 실습 &amp; 커뮤니티</h3>
                  <ul className={styles.freeOfferCheckList}>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>동영상 편집 강의</strong> (브루AI, 캡컷등등)
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>AI 대본활용</strong>, 영상제작 강의
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>드론영상, Q&amp;A</strong>, 커뮤니티 활용
                      </span>
                    </li>
                    <li className={styles.freeOfferCheckItem}>
                      <span className={styles.freeOfferCheckIcon}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className={styles.freeOfferCheckText}>
                        <strong className={styles.freeOfferCheckStrong}>공실스터디 강의</strong> 등록권한 부여
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ [5섹션] 이런 부동산에게 추천합니다! ━━━ */}
        <section className={styles.problemSection} aria-labelledby="recommend-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.kicker}>RECOMMENDATION</p>
              <h2 id="recommend-title">
                이런 부동산에게 추천합니다!
              </h2>
              <p className={styles.sectionDescription}>
                바쁜 1~2인, 지역/단지 부동산 대표님에게 추천합니다.
              </p>
            </header>

            {/* 맞춤 매물별 추천 (RECOMMEND 01~03) */}
            <div className={styles.problemGrid}>
              {TARGET_AUDIENCE.map((item) => (
                <article key={item.title} className={styles.problemCard}>
                  <div className={styles.problemCharWrap}>
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      width={280}
                      height={280}
                      className={styles.problemCharImg}
                    />
                  </div>
                  <span className={styles.problemTag}>{item.tag}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className={styles.problemCardSolution}>
                    <span className={styles.problemCardSolutionBadge}>💡 맞춤 솔루션</span>
                    <p className={styles.problemCardSolutionText}>{item.solution}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-title">
          <div>
            <p>AI 시대, 부동산 맞춤 스터디</p>
            <h2 id="final-title">
              꾸준한 유튜브/블로그 포스팅~
              <br />
              <span>공실스터디로 바로 시작하세요!</span>
            </h2>
            <p className={styles.finalDescription}>
              공실을 등록하고, 콘텐츠를 만들고, 더 많은 공동중개 기회로 바로 실무에 활용할 수 있습니다!
            </p>
            <div className={styles.heroActions}>
              <Link href="/study/benefits/vacancy-register" className={styles.heroPrimary}>
                멤버쉽 혜택 &gt;&gt;
              </Link>
              <Link href="/study/apply" className={styles.heroSecondary}>
                멤버쉽 신청하기 &gt;&gt;
              </Link>
            </div>
            <p className={styles.heroNote}>물건 등록 한 번으로 자동 완성 · 전국 11만 부동산 네트워크 연동 · 초보자도 쉽게</p>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.faqInner}>
            <header>
              <p className={styles.kicker}>FAQ</p>
              <h2 id="faq-title">자주 묻는 질문</h2>
            </header>
            <div className={styles.faqList}>
              {FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                const answerId = `study-faq-${index}`;
                return (
                  <div className={styles.faqItem} key={faq.question}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      <span>{faq.question}</span>
                      <i aria-hidden="true">{isOpen ? "−" : "+"}</i>
                    </button>
                    {isOpen && <p id={answerId}>{faq.answer}</p>}
                  </div>
                );
              })}
              <Link href="/study/qna" className={styles.qnaLink}>
                다른 질문 남기기 <Arrow />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
