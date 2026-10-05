"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import styles from "./mobileStudyAbout.module.css";

const TARGET_AUDIENCE = [
  {
    tag: "RECOMMEND 01",
    title: "사무실/상가 전문 부동산",
    image: "/images/study/recommend_real_teheran_man.jpg",
    imageAlt: "강남 테헤란로를 걸으며 스마트폰으로 공실뉴스를 열람하는 전문 남성 공인중개사",
    description: "면적, 렌트프리, 권리금, 관리비 등 복잡한 상권·오피스 조건을 한눈에 보이는 브리핑 리포트와 상위 노출 콘텐츠로 완성합니다.",
    solution: "렌트프리·수익률이 정리된 프리미엄 제안서와 상위 노출 마케팅 기사가 1초 만에 자동 완성됩니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    description: "단지 내 급매물과 전월세 정보를 빠르게 블로그와 숏폼으로 제작하여 입주민과 외부 매수·임차 고객 문의를 선점합니다.",
    solution: "단지별 급매물 브리핑 보고서와 블로그 포스팅, 단지 투어 숏폼 영상이 즉시 자동 완성됩니다.",
  },
  {
    tag: "RECOMMEND 03",
    title: "빌라/주택 건물 부동산",
    image: "/images/study/recommend_real_villa.jpg",
    imageAlt: "신축 빌라와 주택 현장 영상 촬영 짐벌을 든 전문 공인중개사",
    description: "원룸·투룸 다가구부터 꼬마빌딩까지, 현장 영상 촬영 대본과 기사 발행으로 공실 해소와 공동중개 기회를 극대화합니다.",
    solution: "씬별 현장 촬영 대본과 전국 11만 부동산 실시간 공유로 빠른 공실 계약을 이끕니다.",
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

export default function MobileStudyAboutClient() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeProcessStep, setActiveProcessStep] = useState<number>(2);

  return (
    <div className={styles.container}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeMenu="about" />

      {/* ━━━ [1] 메인 히어로 ━━━ */}
      <section className={styles.hero} aria-labelledby="mobile-study-hero-title">
        <div className={styles.heroOverlay} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span>AI 스마트폰, SNS 시대!</span>
          </div>

          <h1 id="mobile-study-hero-title" className={styles.heroTitle}>
            유튜브, 블로그, SNS<br />
            <span className={styles.heroTitleHighlight}>부동산은 꼭! 해야 합니다.</span>
          </h1>

          <p className={styles.heroDesc}>
            정보를 주고 받는 부동산에게 유튜브/블로그/SNS 마케팅은 선택이 아니라 필수입니다!<br />
            이제, 공실스터디멤버가 되시면, 블로그/유튜브/SNS 마케팅 바로 시작하실 수 있습니다!
          </p>

          <div className={styles.heroActions}>
            <Link href="/m/study/benefits" className={styles.heroBtnPrimary}>
              멤버십 혜택 &gt;&gt;
            </Link>
            <Link href="/m/study/apply" className={styles.heroBtnSecondary}>
              멤버십 신청하기 &gt;&gt;
            </Link>
          </div>

          <p className={styles.heroNote}>
            물건 등록 한 번으로 자동 완성 · 전국 11만 부동산 네트워크 연동 · 초보자도 쉽게
          </p>
        </div>
      </section>

      {/* ━━━ [2] MARKET REALITY ━━━ */}
      <section className={`${styles.section} ${styles.marketSection}`} aria-labelledby="market-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>MARKET REALITY</p>
          <h2 id="market-title" className={styles.sectionTitle}>
            대형 부동산은 매일 꾸준히<br />
            <span>유튜브·블로그, SNS마케팅을 운영하고 있습니다.</span>
          </h2>
          <p className={styles.sectionDesc}>
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
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.marketCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.marketCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.marketCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
            </div>
            <span className={styles.marketBadge}>SNS마케팅 채널 운영</span>
            <h3>블로그, 인스타그램, 페이스북, 쓰레드</h3>
            <p>
              AI 스마트폰시대, 정보를 빠르게 젊은이에게 전달해, 무료로 마케팅하면, 온라인으로 고객과 소통하고 만납니다.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ [대조 브릿지] VS (가운데 라인 정렬) ━━━ */}
      <div className={styles.vsDividerWrap} aria-hidden="true">
        <div className={styles.vsDividerInner}>
          <span className={styles.vsLine} />
          <span className={styles.vsBadge}>VS</span>
          <span className={styles.vsLine} />
        </div>
      </div>

      {/* ━━━ [3] LOCAL BROKER REALITY ━━━ */}
      <section className={`${styles.section} ${styles.painSection}`} aria-labelledby="pain-title">
        <header className={styles.sectionHeader}>
          <p className={styles.painKicker}>LOCAL BROKER REALITY</p>
          <h2 id="pain-title" className={styles.sectionTitle}>
            <span className={styles.painTitleHighlight}>하지만</span> 1~2인 로컬 부동산은<br />
            <span>온라인마케팅 할 시간이 많지 않습니다</span>
          </h2>
          <p className={styles.sectionDesc}>
            임장 가고, 손님 받고, 계약서 쓰기도 바쁜 하루… 중요성을 알면서도 포기할 수밖에 없었던 대표님들의 현실적인 이유입니다.
          </p>
        </header>

        <div className={styles.marketGrid}>
          {/* 1번 카드: 비싼 온라인광고비 & 고정비용 증가 (대표 소장님) */}
          <div className={styles.painCard}>
            <div className={styles.marketCardImgBox}>
              <Image
                src="/images/study/char-local-40s-agency-won.jpg"
                alt="비싼 온라인 광고비와 고정비용 증가로 고민하는 동네 공인중개사와 나가는 마케팅 직원"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.painCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
            <div className={styles.marketCardImgBox}>
              <Image
                src="/images/study/char-local-40s-busy.jpg"
                alt="시간 부족으로 피로에 지친 동네 공인중개사 3D 캐릭터"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.painCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            <div className={styles.marketCardImgBox}>
              <Image
                src="/images/study/char-local-40s-camera.jpg"
                alt="스마트폰 카메라 울렁증으로 당황하는 동네 공인중개사 3D 캐릭터"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.marketCardImg}
              />
              <div className={styles.painCardIconOverlay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
            <span className={styles.painBadge}>제작 장벽 · 카메라 울렁증</span>
            <h3>카메라 앞에만 서면 멘붕</h3>
            <p>
              &ldquo;카메라 앞에만 서면 무슨 말을 해야 할지 머릿속이 하얘집니다.&rdquo; 비싼 촬영 장비도 없고 편집 툴도 다룰 줄 몰라 시작부터 막막합니다.
            </p>
          </div>
        </div>
      </section>

            {/* ━━━ [4] 공실뉴스 AI 1분 솔루션: 3단계 프로세스 (위치 이동: 3단 무료 혜택 상단) ━━━ */}
      <section className={`${styles.section} ${styles.processSection}`} aria-labelledby="process-section-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>공실뉴스 AI 원스톱 솔루션</p>
          <h2 id="process-section-title" className={styles.sectionTitle}>
            <span className={styles.painTitleHighlight} style={{ color: "#ffffff" }}>오늘부터</span> 공실스터디멤버가 되시면,<br />
            <span>바로 시작하실 수 있습니다.</span>
          </h2>

          {/* 3명의 소장님 대형 배너 */}
          <div className={styles.trioBannerWrap}>
            <div className={styles.trioBannerImgBox}>
              <Image
                src="/images/study/trio-brokers-amazed.jpg"
                alt="공실스터디 이전 힘들어하던 3명의 공인중개사 소장님들"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                className={styles.trioBannerImgDefault}
                priority
              />
              <Image
                src="/images/study/trio-brokers-cheering.jpg"
                alt="공실스터디 멤버가 되어 환호하는 3명의 공인중개사 소장님들"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                className={styles.trioBannerImgHover}
              />
              <div className={styles.trioBannerBadgeDefault}>
                <span className={styles.trioBadgePulse} />
                <span>터치하면 소장님들의 변화를 볼 수 있어요! 👆</span>
              </div>
              <div className={styles.trioBannerBadgeHover}>
                <span className={styles.trioBadgePulse} />
                <span>공실스터디와 함께라면 매일이 환호입니다! 🎉</span>
              </div>
            </div>
          </div>

          <div className={styles.processFlowSummary}>
            <span className={styles.flowItem}>공실등록</span>
            <span className={styles.flowArrow}>&gt;</span>
            <span className={styles.flowItem}>블로그포스팅</span>
            <span className={styles.flowArrow}>&gt;</span>
            <span className={styles.flowItem}>유튜브 영상 제작</span>
          </div>
        </header>

        <div className={styles.processGrid}>
          {/* STEP 01 */}
          <div
            className={`${styles.processCard} ${activeProcessStep === 0 ? styles.processCardHighlight : ""}`}
            onClick={() => setActiveProcessStep(0)}
          >
            <span className={styles.stepNum}>STEP 01</span>
            <div className={styles.stepCharBox}>
              <Image
                src="/images/study/step-char-register.jpg"
                alt="STEP 01 공실등록"
                fill
                sizes="90px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <h3 className={styles.processCardTitle}>공실등록</h3>
            <p className={styles.processCardTag}>11만 부동산 무료 열람 · 빠른 계약</p>
            <div className={styles.processDivider} />
            <p className={styles.processCardDesc}>
              공실뉴스에 주소·사진·임대조건을 한 번만 등록해도 전국 11만 부동산이 무료로 열람하는 공동중개 사이트에 즉시 노출되어 계약이 훨씬 빨라집니다.
            </p>
          </div>

          {/* STEP 02 */}
          <div
            className={`${styles.processCard} ${activeProcessStep === 1 ? styles.processCardHighlight : ""}`}
            onClick={() => setActiveProcessStep(1)}
          >
            <span className={styles.stepNum}>STEP 02</span>
            <div className={styles.stepCharBox}>
              <Image
                src="/images/study/step-char-blog.jpg"
                alt="STEP 02 블로그포스팅"
                fill
                sizes="90px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <h3 className={styles.processCardTitle}>블로그포스팅</h3>
            <p className={styles.processCardTag}>AI 툴 1분 완성 · 검색 노출 최적화</p>
            <div className={styles.processDivider} />
            <p className={styles.processCardDesc}>
              등록된 공실 데이터를 AI 툴이 분석하여 네이버 블로그 검색 노출에 최적화된 포스팅 글과 기사 초안을 1분 만에 쉽고 빠르게 자동 완성합니다.
            </p>
          </div>

          {/* STEP 03 */}
          <div
            className={`${styles.processCard} ${activeProcessStep === 2 ? styles.processCardHighlight : ""}`}
            onClick={() => setActiveProcessStep(2)}
          >
            <span className={styles.stepNum}>STEP 03</span>
            <div className={styles.stepCharBox}>
              <Image
                src="/images/study/step-char-youtube.jpg"
                alt="STEP 03 유튜브 영상 제작"
                fill
                sizes="90px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <h3 className={styles.processCardTitle}>유튜브 영상 제작</h3>
            <p className={styles.processCardTag}>공실뉴스 온라인 강의</p>
            <div className={styles.processDivider} />
            <p className={styles.processCardDesc}>
              공실스터디에서 다양한 온라인 강의를 통해 내가 등록한 물건을 유튜브 영상으로 쉽고 빠르게 제작합니다.
            </p>
          </div>
        </div>
      </section>

{/* ━━━ [신규 중간 브릿지] 내 지역/단지 물건만 등록하면 3대 무료 혜택 ━━━ */}
      <section className={styles.freeOfferSection} aria-label="공실뉴스 등록 시 3대 무료 혜택">
        <header className={styles.freeOfferHeader}>
          <div className={styles.freeOfferBadge}>100% 무료 혜택</div>
          <h2 className={styles.freeOfferTitle}>
            내 지역/단지 물건만 등록하면<br />
            <span className={styles.freeOfferHighlight}>부동산마케팅, SNS포스팅, 유튜브 강의 무료!</span>
          </h2>
          <p className={styles.freeOfferSub}>
            공실뉴스에 내 지역·단지 물건만 올려두면 AI 마케팅부터 유튜브 실습 강의까지 모두 무료!
          </p>
        </header>

        <div className={styles.freeOfferList}>
          {/* 1단: 부동산마케팅 */}
          <div className={styles.freeOfferRow}>
            <Link
              href="/m/study/benefits?tab=vacancy"
              className={styles.freeOfferImgBox}
              title="부동산마케팅 올인원 지원 자세히 보기"
            >
              <Image
                src="/images/study/benefit_market_50s_broker_v3.jpg"
                alt="동네 주택가 상가 부동산에서 거래완료 유리창 홍보지와 듀얼 모니터의 물건 지도를 갖춘 50대 남성 공인중개사 대표 소장님"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.freeOfferImg}
                priority
              />
              <div className={styles.freeOfferLabelBadge}>부동산마케팅</div>
              <span className={styles.freeOfferImgLinkBadge}>자세히 보기 →</span>
            </Link>
            <div className={styles.freeOfferContent}>
              <span className={styles.freeOfferChip}>공실등록하면</span>
              <h3 className={styles.freeOfferContentTitle}>부동산마케팅 올인원 지원</h3>
              <ul className={styles.freeOfferCheckList}>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>모든 부동산 무료 열람</strong> (가입비 없음)
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>AI 매매보고서</strong> 즉시 생성
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>유리창 홍보지</strong> 1초 자동 출력
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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

          {/* 2단: SNS 마케팅 */}
          <div className={styles.freeOfferRow}>
            <Link
              href="/m/study/benefits?tab=blog"
              className={styles.freeOfferImgBox}
              title="SNS 마케팅 원클릭 자동화 자세히 보기"
            >
              <Image
                src="/images/study/benefit_sns_40s_broker_v2.jpg"
                alt="테헤란로 공인중개사 사무소에서 듀얼 모니터로 네이버 블로그 추천 매물 포스팅과 SNS 자동화 피드를 확인하는 40대 남녀 소장님"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.freeOfferImg}
                priority
              />
              <div className={styles.freeOfferLabelBadge}>SNS 마케팅</div>
              <span className={styles.freeOfferImgLinkBadge}>자세히 보기 →</span>
            </Link>
            <div className={styles.freeOfferContent}>
              <span className={styles.freeOfferChip}>공실등록하면</span>
              <h3 className={styles.freeOfferContentTitle}>SNS 마케팅 원클릭 자동화</h3>
              <ul className={styles.freeOfferCheckList}>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>AI 블로그 포스팅</strong> 초안 자동
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>페이스북, 인스타그램, 쓰레드</strong> 초안 자동
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>유튜브 대본</strong> 초안 작성
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>인테리어 / 리모델링 AI</strong> 예상 견적
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* 3단: AI 유튜브 강의 */}
          <div className={styles.freeOfferRow}>
            <Link
              href="/m/study/benefits?tab=youtube"
              className={styles.freeOfferImgBox}
              title="부동산 유튜브 실습 & 커뮤니티 자세히 보기"
            >
              <Image
                src="/images/study/benefit_youtube_40s_female_broker.jpg"
                alt="아파트 단지 상가 부동산에서 브루 AI로 매물 쇼츠를 제작하고 공실스터디 온라인 강의를 수강하는 40대 여성 공인중개사 대표 소장님"
                fill
                sizes="(max-width: 480px) 100vw, 400px"
                className={styles.freeOfferImg}
                priority
              />
              <div className={styles.freeOfferLabelBadge}>AI 유튜브 강의</div>
              <span className={styles.freeOfferImgLinkBadge}>자세히 보기 →</span>
            </Link>
            <div className={styles.freeOfferContent}>
              <span className={styles.freeOfferChip}>부동산 유튜브 강의</span>
              <h3 className={styles.freeOfferContentTitle}>부동산 유튜브 실습 &amp; 커뮤니티</h3>
              <ul className={styles.freeOfferCheckList}>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>부동산 유튜브</strong> 전문 강의 무료 제공
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>AI 부동산 유튜브</strong> 10분 완성 제작법
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>목소리 X, 얼굴노출 X</strong> 자동편집 실습
                  </span>
                </li>
                <li className={styles.freeOfferCheckItem}>
                  <span className={styles.freeOfferCheckIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.freeOfferCheckText}>
                    <strong className={styles.freeOfferCheckStrong}>드론영상, Q&amp;A, 커뮤니티</strong> 적극 활용
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [8] Final CTA ━━━ */}
      {/* ━━━ 이런 부동산에게 추천합니다! ━━━ */}
      <section className={`${styles.section} ${styles.recommendSection}`} aria-labelledby="recommend-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>RECOMMENDATION</p>
          <h2 id="recommend-title" className={styles.sectionTitle}>
            이런 부동산에게 추천합니다!
          </h2>
          <p className={styles.sectionDesc}>
            바쁜 1~2인, 지역/단지 부동산 대표님에게 추천합니다.
          </p>
        </header>

        <div className={styles.recommendGrid}>
          {TARGET_AUDIENCE.map((item) => (
            <article key={item.title} className={styles.recommendCard}>
              <div className={styles.recommendImgWrap}>
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 480px) 100vw, 448px"
                  className={styles.recommendImg}
                />
              </div>
              <div className={styles.recommendBody}>
                <span className={styles.recommendTag}>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className={styles.recommendSolution}>
                  <span className={styles.recommendSolutionBadge}>💡 맞춤 솔루션</span>
                  <p className={styles.recommendSolutionText}>{item.solution}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <p className={styles.finalCtaKicker}>AI 시대, 1~2인 부동산을 위한 실무 강의</p>
        <h2 id="final-cta-title" className={styles.finalCtaTitle}>
          꾸준한 유튜브/블로그 포스팅~<br />
          <span>공실스터디로 바로 시작하세요!</span>
        </h2>
        <p className={styles.finalCtaDesc}>
          공실을 등록하고, 콘텐츠를 만들고, 더 많은 공동중개 기회로 바로 실무에 활용할 수 있습니다!
        </p>

        <div className={styles.heroActions} style={{ margin: "0 auto 16px" }}>
          <Link href="/m/study/benefits" className={styles.heroBtnPrimary}>
            멤버십 혜택 &gt;&gt;
          </Link>
          <Link href="/m/study/apply" className={styles.heroBtnSecondary}>
            멤버십 신청하기 &gt;&gt;
          </Link>
        </div>

        <p className={styles.heroNote} style={{ marginBottom: 0 }}>
          물건 등록 한 번으로 자동 완성 · 전국 11만 부동산 네트워크 연동 · 초보자도 쉽게
        </p>
      </section>

      {/* ━━━ [9] FAQ ━━━ */}
      <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>FAQ</p>
          <h2 id="faq-title" className={styles.sectionTitle}>
            자주 묻는 질문
          </h2>
        </header>

        <div className={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div className={styles.faqItem} key={faq.question}>
                <button
                  type="button"
                  className={styles.faqBtn}
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span className={styles.faqIcon}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.answer}</p>}
              </div>
            );
          })}

          <Link href="/study/qna" className={styles.qnaLink}>
            <span>다른 질문 남기기</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
