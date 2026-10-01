"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import styles from "./mobileStudyAbout.module.css";

const FREE_LECTURES = [
  {
    id: "baf36095-b511-4575-9090-c03d5d5a901f",
    title: "AI 활용 부동산 유튜브 스터디 (12개월 과정)",
    description: "카메라 울렁증 없이 1인 부동산도 당일 촬영·업로드하는 AI 영상 제작 및 대본 실습",
    category: "유튜브영상",
    typeBadge: "VOD",
    discountBadge: "-100% 무료",
    originalPrice: "450,000원",
    tags: ["#유튜브스터디", "#AI대본", "#쇼츠제작"],
    thumbnail: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/lecture-media/thumbnails/baf36095-b511-4575-9090-c03d5d5a901f/1787398578281.webp",
  },
  {
    id: "7c54c3ca-6aa6-4663-978a-fea4a3ee74df",
    title: "부동산 전용 모바일 홈페이지 만들기",
    description: "코딩 없이 10분 만에 완성하는 내 매물 전용 모바일 랜딩페이지 & 홈페이지 구축",
    category: "AI중개활용",
    typeBadge: "디지털 콘텐츠",
    discountBadge: "100% 무료",
    originalPrice: "200,000원",
    tags: ["#홈페이지제작", "#노코드", "#매물홍보"],
    thumbnail: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/lecture-media/thumbnails/7c54c3ca-6aa6-4663-978a-fea4a3ee74df/1787525969554.webp",
  },
  {
    id: "a56fea6f-3443-4e8e-a081-44c400c80321",
    title: "브루(Vrew) AI 기초 매물 영상 완성",
    description: "음성 인식 자막 자동 생성부터 AI 보이스 나레이션까지 10분 컷으로 끝내는 실습",
    category: "영상편집",
    typeBadge: "VOD 60일",
    discountBadge: "무료",
    originalPrice: "150,000원",
    tags: ["#브루AI", "#AI자막", "#영상편집"],
    thumbnail: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/lecture-media/thumbnails/a56fea6f-3443-4e8e-a081-44c400c80321/1789520023690.webp",
  },
  {
    id: "d44e956f-20d2-4ebe-826c-b39f55efab0e",
    title: "캡컷으로 편집하는 부동산 매물 쇼츠",
    description: "스마트폰 하나로 끝내는 현장 임장 영상 컷편집 & 릴스 템플릿 실무 활용법",
    category: "마케팅",
    typeBadge: "디지털 콘텐츠",
    discountBadge: "무료",
    originalPrice: "210,000원",
    tags: ["#캡컷실무", "#임장영상", "#부동산쇼츠"],
    thumbnail: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/lecture-media/thumbnails/d44e956f-20d2-4ebe-826c-b39f55efab0e/1778102013041.webp",
  },
];

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
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container}>
      <MobileTopBarHeader activeTab="study" />

      {/* ── 상단 뒤로가기 바 ── */}
      <div className={styles.topNavBar}>
        <Link href="/m/study" className={styles.backBtn}>
          <span>‹</span>
          <span>특강 목록으로 돌아가기</span>
        </Link>
      </div>

      {/* ━━━ [1] 메인 히어로 ━━━ */}
      <section className={styles.hero} aria-labelledby="mobile-study-hero-title">
        <Image
          src="/images/study/hero-cheering-man.jpg"
          alt="공실스터디를 통해 성과를 올리고 환호하는 공인중개사"
          fill
          priority
          className={styles.heroBg}
          sizes="(max-width: 480px) 100vw, 448px"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span>정보를 주고받는 부동산 실무 스터디</span>
          </div>

          <h1 id="mobile-study-hero-title" className={styles.heroTitle}>
            부동산 유튜브·블로그,<br />
            <span className={styles.heroTitleHighlight}>선택이 아닌 필수!</span>
          </h1>

          <p className={styles.heroDesc}>
            정보를 주고 받는 부동산에게 유튜브/블로그는 선택이 아니라 필수입니다!<br />
            이제, 공실뉴스에 공실을 등록하시고, 공실스터디 멤버가 되시면 유튜브/블로그를 쉽게 운영할 수 있습니다!
          </p>

          <div className={styles.heroActions}>
            <Link href="/study/benefits/vacancy-register" className={styles.heroBtnPrimary}>
              멤버쉽 혜택 &gt;&gt;
            </Link>
            <Link href="/study/apply" className={styles.heroBtnSecondary}>
              멤버쉽 신청하기 &gt;&gt;
            </Link>
          </div>

          <p className={styles.heroNote}>
            물건 등록 한 번으로 자동 완성 · 전국 11만 부동산 네트워크 연동 · 초보자도 쉽게
          </p>

          {/* 히어로 내 강의 목록 가로 캐러셀 */}
          <div className={styles.lectureSection}>
            <div className={styles.lectureHeader}>
              <span className={styles.lectureHeaderTitle}>
                무료 특강 맛보기
              </span>
              <Link href="/m/study" className={styles.lectureHeaderLink}>
                전체보기 &gt;
              </Link>
            </div>

            <div className={styles.lectureTrack} ref={trackRef}>
              {FREE_LECTURES.map((lecture) => (
                <Link
                  href="/m/study"
                  key={lecture.id}
                  className={styles.lectureCard}
                >
                  <div className={styles.lectureThumbWrap}>
                    <Image
                      src={lecture.thumbnail}
                      alt={lecture.title}
                      fill
                      sizes="240px"
                      className={styles.lectureThumbImg}
                    />
                    <span className={styles.lectureBadgeDiscount}>{lecture.discountBadge}</span>
                  </div>

                  <div className={styles.lectureCardBody}>
                    <h3 className={styles.lectureCardTitle}>{lecture.title}</h3>
                    <p className={styles.lectureCardDesc}>{lecture.description}</p>

                    <div className={styles.lectureTags}>
                      {lecture.tags.map((tag) => (
                        <span key={tag} className={styles.lectureTag}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className={styles.lectureCardFooter}>
                      <span className={styles.lectureTypeBadge}>{lecture.typeBadge}</span>
                      <div className={styles.lecturePriceBox}>
                        <span className={styles.lectureOriginalPrice}>{lecture.originalPrice}</span>
                        <strong className={styles.lectureFreeText}>무료</strong>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [2] MARKET REALITY ━━━ */}
      <section className={`${styles.section} ${styles.marketSection}`} aria-labelledby="market-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>MARKET REALITY</p>
          <h2 id="market-title" className={styles.sectionTitle}>
            대형 부동산은 이미 마케팅담당자가<br />
            <span>유튜브·블로그를 꾸준히 운영하고 있습니다.</span>
          </h2>
          <p className={styles.sectionDesc}>
            전문 인력을 갖춘 대형 부동산들은 매일 마케팅 담당자가 유튜브영상과 블로그를 꾸준히 운영하며, 온라인 고객과 전속 매물을 꾸준히 선점하고 있습니다.
          </p>
        </header>

        <div className={styles.marketGrid}>
          <div className={styles.marketCard}>
            <div className={styles.marketIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className={styles.marketBadge}>전문 기획·촬영팀 상주</span>
            <h3>고화질 유튜브 영상 독점</h3>
            <p>
              전문 촬영 장비와 드론, 전담 PD를 배치해 매주 현장 임장 영상과 쇼츠를 쏟아내며 온라인 고객의 시선을 독점합니다.
            </p>
          </div>

          <div className={styles.marketCard}>
            <div className={styles.marketIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className={styles.marketBadge}>블로그 상위 노출 선점</span>
            <h3>네이버 검색 알고리즘 장악</h3>
            <p>
              스마트블록과 지역 타겟 키워드를 분석해 매일 수십 건의 포스팅을 올리며 발품 파는 매수·임차인의 첫 검색 화면을 장악합니다.
            </p>
          </div>

          <div className={styles.marketCard}>
            <div className={styles.marketIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className={styles.marketBadge}>압도적 계약 체결률</span>
            <h3>고객이 먼저 찾아오는 중개</h3>
            <p>
              영상을 보고 신뢰를 가진 고객들이 스스로 전화를 걸어오기 때문에, 별도 영업 없이도 전속 매물 확보와 빠른 계약이 가능합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ [3] LOCAL BROKER REALITY ━━━ */}
      <section className={`${styles.section} ${styles.painSection}`} aria-labelledby="pain-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>LOCAL BROKER REALITY</p>
          <h2 id="pain-title" className={styles.sectionTitle}>
            하지만, 1~2인 로컬 부동산은<br />
            <span>유튜브/블로그 할 여유가 많지 않습니다</span>
          </h2>
          <p className={styles.sectionDesc}>
            임장 가고, 손님 받고, 계약서 쓰기도 바쁜 하루… 중요성을 알면서도 포기할 수밖에 없었던 대표님들의 현실적인 이유입니다.
          </p>
        </header>

        <div className={styles.painStack}>
          {/* 1번 카드 */}
          <div className={styles.painCard}>
            <div className={styles.painCharRow}>
              <div className={styles.painCharImgWrap}>
                <Image
                  src="/images/study/char-broker-busy.jpg"
                  alt="시간 부족으로 고민하는 공인중개사 3D 캐릭터"
                  fill
                  sizes="76px"
                  className={styles.painCharImg}
                />
              </div>
              <div className={styles.painCharQuotes}>
                <span className={styles.painTag}>시간 부족</span>
                <p className={styles.painQuote}>
                  &ldquo;하루 종일 일하고 들어와서 언제 컴퓨터 켜고 글을 쓰나요…&rdquo;
                </p>
              </div>
            </div>
            <h4 className={styles.painSubTitle}>포스팅 하나에 1~2시간 소요</h4>
            <p className={styles.painDesc}>
              사진 정리하고 글 한 편 쓰려면 1~2시간이 훌쩍 지나갑니다. 하루 일과가 끝나면 녹초가 되어 결국 작심삼일로 끝나고 맙니다.
            </p>
          </div>

          {/* 2번 카드 */}
          <div className={styles.painCard}>
            <div className={styles.painCharRow}>
              <div className={styles.painCharImgWrap}>
                <Image
                  src="/images/study/char-broker-camera.jpg"
                  alt="유튜브 영상 촬영을 고민하는 공인중개사 3D 캐릭터"
                  fill
                  sizes="76px"
                  className={styles.painCharImg}
                />
              </div>
              <div className={styles.painCharQuotes}>
                <span className={styles.painTag}>제작 장벽</span>
                <p className={styles.painQuote}>
                  &ldquo;카메라 앞에만 서면 무슨 말을 해야 할지 머릿속이 하얘집니다.&rdquo;
                </p>
              </div>
            </div>
            <h4 className={styles.painSubTitle}>카메라 울렁증 &amp; 장비 부담</h4>
            <p className={styles.painDesc}>
              비싼 촬영 장비도 없고, 복잡한 편집 툴을 다룰 줄 몰라 유튜브를 시작하고 싶어도 어디서부터 손대야 할지 막막합니다.
            </p>
          </div>

          {/* 3번 카드 */}
          <div className={styles.painCard}>
            <div className={styles.painCharRow}>
              <div className={styles.painCharImgWrap}>
                <Image
                  src="/images/study/char-broker-present.jpg"
                  alt="지속적인 마케팅을 고민하는 공인중개사 3D 캐릭터"
                  fill
                  sizes="76px"
                  className={styles.painCharImg}
                />
              </div>
              <div className={styles.painCharQuotes}>
                <span className={styles.painTag}>외로운 마케팅</span>
                <p className={styles.painQuote}>
                  &ldquo;월 수백만 원짜리 대행사를 쓰자니 비용이 너무 부담스럽습니다.&rdquo;
                </p>
              </div>
            </div>
            <h4 className={styles.painSubTitle}>비싼 외주 비용 &amp; 지속성 부재</h4>
            <p className={styles.painDesc}>
              부동산 전문성 없는 대행사는 실망스럽고, 혼자서 꾸준히 하자니 피드백과 동기부여가 없어 지속하기가 어렵습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ [4] 공실뉴스 AI 3단계 솔루션 ━━━ */}
      <section className={`${styles.section} ${styles.processSection}`} aria-labelledby="process-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>공실뉴스 AI 원스톱 솔루션</p>
          <h2 id="process-title" className={styles.sectionTitle}>
            이제, 공실뉴스에 물건만 등록하시면<br />
            <span>AI 블로그 포스팅부터 실전 유튜브 영상 제작까지!</span>
          </h2>

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

      {/* ━━━ [5] 실무 3가지 상세 안내 ━━━ */}
      <section className={`${styles.section} ${styles.detailSection}`} aria-labelledby="detail-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>실전 AI 원스톱 솔루션</p>
          <h2 id="detail-title" className={styles.sectionTitle}>
            공실만 등록해도<br />
            <span>마케팅이 쉬워진다!</span>
          </h2>
          <p className={styles.sectionDesc}>
            단순한 툴 이론 설명이 아닙니다. 실제 내 매물을 등록하는 순간 물건보고서, 블로그 포스팅, 유튜브 영상 제작까지 현장 실무 결과물이 한 번에 나옵니다.
          </p>
        </header>

        <div className={styles.detailList}>
          {/* STEP 01 물건보고서 */}
          <div className={styles.detailCard}>
            <div className={styles.detailVisual}>
              <Image
                src="/images/study/property-report-sample.png"
                alt="스마트 물건 브리핑 보고서 샘플"
                width={700}
                height={450}
                className={styles.detailImage}
              />
            </div>
            <div className={styles.detailText}>
              <span className={styles.stepTag}>STEP 01</span>
              <h3 className={styles.detailCardTitle}>
                주소와 조건만 넣으면<br />
                <span>전문 매매·물건보고서</span>가 즉시 완성됩니다
              </h3>
              <p className={styles.detailCardDesc}>
                더 이상 매물 사진과 기본 스펙을 카톡에 어지럽게 붙여넣지 마세요. 공실뉴스에 물건을 등록하는 순간, 고객에게 바로 보낼 수 있는 고품격 브리핑 보고서가 자동으로 만들어집니다.
              </p>
              <ul className={styles.detailPoints}>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>카카오톡 원클릭 전송</strong>: 모바일 웹 링크 및 PDF 제공</span>
                </li>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>전국 11만 중개망 실시간 연동</strong>: 공실뉴스 공동중개망 자동 노출</span>
                </li>
              </ul>
            </div>
          </div>

          {/* STEP 02 블로그포스팅 */}
          <div className={styles.detailCard}>
            <div className={styles.detailVisual}>
              <Image
                src="/images/study/naver-blog-editor-sample.png"
                alt="AI 네이버 블로그 자동 포스팅 화면"
                width={700}
                height={450}
                className={styles.detailImage}
              />
            </div>
            <div className={styles.detailText}>
              <span className={styles.stepTag}>STEP 02</span>
              <h3 className={styles.detailCardTitle}>
                매물 정보를 AI가 분석해<br />
                <span>네이버 상위 노출 블로그 글</span>을 1초 만에 자동 작성
              </h3>
              <p className={styles.detailCardDesc}>
                등록된 데이터를 AI가 스스로 분석하여 네이버 검색 로직에 최적화된 포스팅을 1초 만에 작성해 줍니다. 지역명과 키워드가 타겟팅된 스토리라인이 자동 완성됩니다.
              </p>
              <ul className={styles.detailPoints}>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>스마트블록 알고리즘 반영</strong>: 키워드 밀도 최적화</span>
                </li>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>원클릭 복사</strong>: 블로그 붙여넣기 및 언론사 기사 초안 동시 생성</span>
                </li>
              </ul>
            </div>
          </div>

          {/* STEP 03 매물 접수 웹페이지 */}
          <div className={styles.detailCard}>
            <div className={styles.detailVisual}>
              <Image
                src="/images/study/partner-webpage-sample.png"
                alt="파트너 전용 단독 매물 접수 및 브리핑 웹페이지"
                width={700}
                height={450}
                className={styles.detailImage}
              />
            </div>
            <div className={styles.detailText}>
              <span className={styles.stepTag}>STEP 03</span>
              <h3 className={styles.detailCardTitle}>
                내가 등록한 공실과 기사가<br />
                <span>PC·모바일 웹페이지에 자동 등록됩니다</span>
              </h3>
              <p className={styles.detailCardDesc}>
                공실뉴스에 공실과 기사를 등록하는 즉시, 나만의 전문 브리핑 및 매물 접수 웹페이지가 자동으로 완성됩니다. 임대인·임차인이 스마트폰으로 24시간 언제 어디서나 매물을 접수할 수 있습니다.
              </p>
              <ul className={styles.detailPoints}>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>공실 &amp; 기사 실시간 동기화</strong>: 내 웹페이지 자동 반영</span>
                </li>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>24시간 모바일 매물 접수 폼</strong>: 고객이 직접 간편 접수</span>
                </li>
                <li>
                  <span className={styles.pointDot}>•</span>
                  <span><strong>PC &amp; 모바일 반응형 완벽 지원</strong>: 카톡 링크 1:1 맞춤 전달</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [6] 방송국 PD 출신 편집장 직강 ━━━ */}
      <section className={`${styles.section} ${styles.proofSection}`} aria-labelledby="proof-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>방송국 PD 출신 편집장 직강</p>
          <h2 id="proof-title" className={styles.sectionTitle}>
            방송국 PD 출신, 공실뉴스편집장이<br />
            <span>강남/서초 100여명의 부동산과 함께 했던 실전 강의!</span>
          </h2>
          <p className={styles.sectionDesc}>
            강남·서초 100여 개 부동산 실무자와 오프라인에서 함께 했던 생생한 경험을 온라인에서 누구나 쉽고 빠르게 따라 할 수 있도록 알려드립니다.
          </p>
        </header>

        <div className={styles.proofStatsGrid}>
          <div className={styles.proofStatItem}>
            <span className={styles.proofStatNumber}>2025</span>
            <span className={styles.proofStatOrg}>강남구청</span>
            <span className={styles.proofStatLabel}>ChatGPT·AI 실무특강</span>
          </div>
          <div className={styles.proofStatItem}>
            <span className={styles.proofStatNumber}>2025</span>
            <span className={styles.proofStatOrg}>서울벤처대학원</span>
            <span className={styles.proofStatLabel}>유튜브 제작 실습</span>
          </div>
          <div className={styles.proofStatItem}>
            <span className={styles.proofStatNumber}>11만</span>
            <span className={styles.proofStatOrg}>부동산 네트워크</span>
            <span className={styles.proofStatLabel}>공실뉴스 공동중개</span>
          </div>
          <div className={styles.proofStatItem}>
            <span className={styles.proofStatNumber}>1년</span>
            <span className={styles.proofStatOrg}>온라인 실무</span>
            <span className={styles.proofStatLabel}>무제한 반복 학습</span>
          </div>
        </div>

        <div className={styles.experienceCard}>
          <div className={styles.experiencePhoto}>
            <Image
              src="/images/study/seoul-venture-lecture-2025-blur.png"
              alt="2025년 서울벤처대학원대학교 강의 현장 단체사진"
              fill
              sizes="(max-width: 480px) 100vw, 448px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className={styles.experienceText}>
            <span className={styles.experienceBadge}>2025 서울벤처대학원대학교</span>
            <h3>유튜브 콘텐츠 제작 실습 교육</h3>
            <p>
              나이와 IT 경험에 상관없이 화면을 보며 하나씩 따라 하고, 수업이 끝날 때 직접 만든 결과물을 남기는 방식으로 진행했습니다.
            </p>
            <strong>이제 같은 과정을 온라인에서 반복해서 배울 수 있습니다.</strong>
          </div>
        </div>
      </section>

      {/* ━━━ [7] 이런 부동산에게 추천합니다! ━━━ */}
      <section className={`${styles.section} ${styles.recommendSection}`} aria-labelledby="recommend-title">
        <header className={styles.sectionHeader}>
          <p className={styles.kicker}>RECOMMENDATION</p>
          <h2 id="recommend-title" className={styles.sectionTitle}>
            이런 부동산에게 추천합니다!
          </h2>
          <p className={styles.sectionDesc}>
            주력 매물에 맞춘 자동 브리핑 리포트와 숏폼 콘텐츠로 실무 경쟁력을 높여보세요.
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

      {/* ━━━ [8] Final CTA ━━━ */}
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
          <Link href="/study/benefits/vacancy-register" className={styles.heroBtnPrimary}>
            멤버쉽 혜택 &gt;&gt;
          </Link>
          <Link href="/study/apply" className={styles.heroBtnSecondary}>
            멤버쉽 신청하기 &gt;&gt;
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
