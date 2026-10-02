"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import StudyHeader, { STUDY_HOME_HERO_BAR } from "@/components/study/StudyHeader";
import styles from "./studyHomeYun.module.css";

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

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function StudyHomeYunClient() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeProcessStep, setActiveProcessStep] = useState<number>(2);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={styles.page}>
      <StudyHeader background={STUDY_HOME_HERO_BAR} />

      <main>
        {/* ━━━ [1섹션] 메인 히어로 ━━━ */}
        <section className={styles.hero} aria-labelledby="study-hero-title">
          <Image
            src="/images/study/hero-cheering-man.jpg"
            alt="공실스터디를 통해 성과를 올리고 환호하는 공인중개사"
            fill
            priority
            className={styles.heroBackground}
            sizes="100vw"
          />
          <div className={styles.heroShade} aria-hidden="true" />

          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>정보를 주고받는 부동산 실무 스터디</p>
            <h1 id="study-hero-title">
              부동산 유튜브·블로그,
              <br />
              <span>선택이 아닌 필수!</span>
            </h1>
            <p className={styles.heroDescription}>
              정보를 주고 받는 부동산에게 유튜브/블로그는 선택이 아니라 필수입니다!
              <br />
              이제, 공실뉴스에 공실을 등록하시고, 공실스터디 멤버가 되시면 유튜브/블로그를 쉽게 운영할 수 있습니다!
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

          {/* 멘트 아래, 같은 이미지 안 하단 강의 목록 슬라이더 */}
          <div className={styles.heroCardsContainer}>
            <div className={styles.freeCardsWrapper}>
              <div className={styles.freeCardsTrack} ref={scrollContainerRef}>
                {FREE_LECTURES.map((lecture) => (
                  <Link
                    href="/study/lectures"
                    key={lecture.id}
                    className={styles.freeLectureCard}
                  >
                    <div className={styles.cardThumbnailWrap}>
                      <Image
                        src={lecture.thumbnail}
                        alt={lecture.title}
                        fill
                        sizes="(max-width: 768px) 280px, 320px"
                        className={styles.cardThumbnailImg}
                      />
                      <div className={styles.cardThumbBadges}>
                        <span className={styles.badgeDiscount}>{lecture.discountBadge}</span>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <h3 className={styles.cardLectureTitle}>{lecture.title}</h3>
                      <p className={styles.cardLectureDesc}>{lecture.description}</p>

                      <div className={styles.cardTagsRow}>
                        {lecture.tags.map((tag) => (
                          <span key={tag} className={styles.cardTagChip}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className={styles.cardBottomBar}>
                        <span className={styles.cardTypeBadge}>{lecture.typeBadge}</span>
                        <div className={styles.cardPriceBox}>
                          <span className={styles.cardOriginalPrice}>{lecture.originalPrice}</span>
                          <strong className={styles.cardFreeText}>무료</strong>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 좌우 이동 원형 버튼 */}
              <button
                type="button"
                className={`${styles.cardNavBtn} ${styles.cardNavPrev}`}
                onClick={() => handleScroll("left")}
                aria-label="이전 강의 보기"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.cardNavBtn} ${styles.cardNavNext}`}
                onClick={() => handleScroll("right")}
                aria-label="다음 강의 보기"
              >
                ›
              </button>
            </div>

            {/* 하단 무료강의 맛보기 흰색 텍스트 */}
            <div className={styles.heroFreeBottomNote}>
              <Link href="/study/lectures" className={styles.heroFreeBottomText}>
                무료강의 맛보기 &gt;
              </Link>
            </div>
          </div>
        </section>

        {/* ━━━ [2섹션] 대형부동산 현황 (Market Reality) ━━━ */}
        <section className={styles.marketSection} aria-labelledby="market-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.kicker}>MARKET REALITY</p>
              <h2 id="market-title">
                대형 부동산은 이미 마케팅담당자가
                <br />
                <span>유튜브·블로그를 꾸준히 운영하고 있습니다.</span>
              </h2>
              <p className={styles.sectionDescription}>
                전문 인력을 갖춘 대형 부동산들은 매일 마케팅 담당자가 유튜브영상과 블로그를 꾸준히 운영하며, 온라인 고객과 전속 매물을 꾸준히 선점하고 있습니다.
              </p>
            </header>

            <div className={styles.marketGrid}>
              <div className={styles.marketCard}>
                <div className={styles.marketIconBox}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </div>
        </section>

        {/* ━━━ [3섹션] 1~2인 로컬 부동산의 현실 고충 (Local Reality) ━━━ */}
        <section className={styles.painSection} aria-labelledby="pain-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.kicker}>LOCAL BROKER REALITY</p>
              <h2 id="pain-title">
                하지만, 1~2인 로컬 부동산은
                <br />
                <span>유튜브/블로그 할 여유가 많지 않습니다</span>
              </h2>
              <p className={styles.sectionDescription}>
                임장 가고, 손님 받고, 계약서 쓰기도 바쁜 하루… 중요성을 알면서도 포기할 수밖에 없었던 대표님들의 현실적인 이유입니다.
              </p>
            </header>

            <div className={styles.painStack}>
              {/* 1번 카드: 3D 캐릭터 좌측, 글씨 우측 */}
              <div className={styles.painWideCard}>
                <div className={styles.painCharWrap}>
                  <Image
                    src="/images/study/char-broker-busy.jpg"
                    alt="시간 부족으로 고민하는 공인중개사 3D 캐릭터"
                    width={210}
                    height={210}
                    className={styles.painCharImg}
                  />
                </div>
                <div className={styles.painTextContent}>
                  <span className={styles.painTag}>시간 부족</span>
                  <h3 className={styles.painMainQuote}>
                    &ldquo;하루 종일 일하고 들어와서 언제 컴퓨터 켜고 글을 쓰나요…&rdquo;
                  </h3>
                  <h4 className={styles.painSubTitle}>포스팅 하나에 1~2시간 소요</h4>
                  <p className={styles.painDesc}>
                    사진 정리하고 글 한 편 쓰려면 1~2시간이 훌쩍 지나갑니다. 하루 일과가 끝나면 녹초가 되어 결국 작심삼일로 끝나고 맙니다.
                  </p>
                </div>
              </div>

              {/* 2번 카드: 글씨 좌측, 3D 캐릭터 우측 (지그재그 배치) */}
              <div className={`${styles.painWideCard} ${styles.painWideCardReverse}`}>
                <div className={styles.painTextContent}>
                  <span className={styles.painTag}>제작 장벽</span>
                  <h3 className={styles.painMainQuote}>
                    &ldquo;카메라 앞에만 서면 무슨 말을 해야 할지 머릿속이 하얘집니다.&rdquo;
                  </h3>
                  <h4 className={styles.painSubTitle}>카메라 울렁증 &amp; 장비 부담</h4>
                  <p className={styles.painDesc}>
                    비싼 촬영 장비도 없고, 복잡한 편집 툴을 다룰 줄 몰라 유튜브를 시작하고 싶어도 어디서부터 손대야 할지 막막합니다.
                  </p>
                </div>
                <div className={styles.painCharWrap}>
                  <Image
                    src="/images/study/char-broker-camera.jpg"
                    alt="유튜브 영상 촬영을 고민하는 공인중개사 3D 캐릭터"
                    width={210}
                    height={210}
                    className={styles.painCharImg}
                  />
                </div>
              </div>

              {/* 3번 카드: 3D 캐릭터 좌측, 글씨 우측 */}
              <div className={styles.painWideCard}>
                <div className={styles.painCharWrap}>
                  <Image
                    src="/images/study/char-broker-present.jpg"
                    alt="지속적인 마케팅을 고민하는 공인중개사 3D 캐릭터"
                    width={210}
                    height={210}
                    className={styles.painCharImg}
                  />
                </div>
                <div className={styles.painTextContent}>
                  <span className={styles.painTag}>외로운 마케팅</span>
                  <h3 className={styles.painMainQuote}>
                    &ldquo;월 수백만 원짜리 대행사를 쓰자니 비용이 너무 부담스럽습니다.&rdquo;
                  </h3>
                  <h4 className={styles.painSubTitle}>비싼 외주 비용 &amp; 지속성 부재</h4>
                  <p className={styles.painDesc}>
                    부동산 전문성 없는 대행사는 실망스럽고, 혼자서 꾸준히 하자니 피드백과 동기부여가 없어 지속하기가 어렵습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ [4섹션] 공실뉴스 AI 1분 솔루션: 3단계 프로세스 ━━━ */}
        <section className={styles.processSection} aria-labelledby="process-section-title">
          <div className={styles.contentWidth}>
            <header className={styles.processHeader}>
              <p className={styles.kicker}>공실뉴스 AI 원스톱 솔루션</p>
              <h2 id="process-section-title">
                이제, 공실뉴스에 물건만 등록하시면
                <br />
                <span>AI 블로그 포스팅부터 실전 유튜브 영상 제작까지!</span>
              </h2>
              <div className={styles.processFlowSummary}>
                <span className={styles.flowItem}>공실등록</span>
                <span className={styles.flowArrow} aria-hidden="true">&gt;</span>
                <span className={styles.flowItem}>블로그포스팅</span>
                <span className={styles.flowArrow} aria-hidden="true">&gt;</span>
                <span className={styles.flowItem}>유튜브 영상 제작</span>
              </div>
            </header>

            <div className={styles.processGrid}>
              {/* 1단계: 공실등록 */}
              <div
                className={`${styles.processCard} ${activeProcessStep === 0 ? styles.processCardHighlight : ""}`}
                onMouseEnter={() => setActiveProcessStep(0)}
              >
                <div className={styles.cardTop}>
                  <span className={`${styles.stepNum} ${activeProcessStep === 0 ? styles.stepNumHighlight : ""}`}>STEP 01</span>
                </div>
                <div className={styles.stepCharBox}>
                  <Image
                    src="/images/study/step-char-register.jpg"
                    alt="STEP 01 공실등록 3D 캐릭터"
                    width={116}
                    height={116}
                    className={styles.stepCharImg}
                  />
                </div>
                <h3 className={styles.cardTitle}>공실등록</h3>
                <p className={styles.cardTag}>11만 부동산 무료 열람 · 빠른 계약</p>
                <div className={styles.cardDivider} />
                <p className={styles.cardDesc}>
                  공실뉴스에 주소·사진·임대조건을 한 번만 등록해도 전국 11만 부동산이 무료로 열람하는 공동중개 사이트에 즉시 노출되어 계약이 훨씬 빨라집니다.
                </p>
              </div>

              {/* 연결 화살표 1 */}
              <div className={styles.processArrow} aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* 2단계: 블로그포스팅 */}
              <div
                className={`${styles.processCard} ${activeProcessStep === 1 ? styles.processCardHighlight : ""}`}
                onMouseEnter={() => setActiveProcessStep(1)}
              >
                <div className={styles.cardTop}>
                  <span className={`${styles.stepNum} ${activeProcessStep === 1 ? styles.stepNumHighlight : ""}`}>STEP 02</span>
                </div>
                <div className={styles.stepCharBox}>
                  <Image
                    src="/images/study/step-char-blog.jpg"
                    alt="STEP 02 AI 툴 블로그 포스팅 3D 캐릭터"
                    width={116}
                    height={116}
                    className={styles.stepCharImg}
                  />
                </div>
                <h3 className={styles.cardTitle}>블로그포스팅</h3>
                <p className={styles.cardTag}>AI 툴 1분 완성 · 검색 노출 최적화</p>
                <div className={styles.cardDivider} />
                <p className={styles.cardDesc}>
                  등록된 공실 데이터를 AI 툴이 분석하여 네이버 블로그 검색 노출에 최적화된 포스팅 글과 기사 초안을 1분 만에 쉽고 빠르게 자동 완성합니다.
                </p>
              </div>

              {/* 연결 화살표 2 */}
              <div className={styles.processArrow} aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* 3단계: 유튜브 영상 제작 */}
              <div
                className={`${styles.processCard} ${activeProcessStep === 2 ? styles.processCardHighlight : ""}`}
                onMouseEnter={() => setActiveProcessStep(2)}
              >
                <div className={styles.cardTop}>
                  <span className={`${styles.stepNum} ${activeProcessStep === 2 ? styles.stepNumHighlight : ""}`}>STEP 03</span>
                </div>
                <div className={styles.stepCharBox}>
                  <Image
                    src="/images/study/step-char-youtube.jpg"
                    alt="STEP 03 유튜브 영상 제작 3D 캐릭터"
                    width={116}
                    height={116}
                    className={styles.stepCharImg}
                  />
                </div>
                <h3 className={styles.cardTitle}>유튜브 영상 제작</h3>
                <p className={styles.cardTag}>공실뉴스 온라인 강의</p>
                <div className={styles.cardDivider} />
                <p className={styles.cardDesc}>
                  공실스터디에서 다양한 온라인 강의를 통해 내가 등록한 물건을 유튜브 영상으로 쉽고 빠르게 제작합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3가지 핵심 실무 상세 안내 (좌 이미지 우 설명 / 우 이미지 좌 설명 / 좌 이미지 우 설명) */}
        <section className={styles.detailSection} aria-labelledby="detail-title">
          <div className={styles.contentWidth}>
            <header className={styles.detailHeader}>
              <p className={styles.kicker}>실전 AI 원스톱 솔루션</p>
              <h2 id="detail-title">
                공실만 등록해도
                <br />
                <span>마케팅이 쉬워진다!</span>
              </h2>
              <p className={styles.detailHeaderDesc}>
                단순한 툴 이론 설명이 아닙니다. 실제 내 매물을 등록하는 순간
                <br />
                물건보고서, 블로그 포스팅, 유튜브 영상 제작까지 현장 실무 결과물이 한 번에 나옵니다.
              </p>
            </header>

            <div className={styles.detailList}>
              {/* 1. 물건보고서: 좌 이미지, 우 설명 */}
              <div className={styles.detailRow}>
                <div className={styles.detailVisual}>
                  <div className={styles.reportImageContainer}>
                    <Image
                      src="/images/study/property-report-sample.png"
                      alt="공실뉴스 스마트 매매·임대 물건 브리핑 보고서 (논현동 단독/다가구 매매 50억)"
                      width={1000}
                      height={700}
                      className={styles.reportImage}
                      priority
                    />
                  </div>
                </div>

                <div className={styles.detailText}>
                  <span className={styles.stepTag}>STEP 01</span>
                  <h3>
                    주소와 조건만 넣으면
                    <br />
                    <span>전문 매매·물건보고서</span>가 즉시 완성됩니다
                  </h3>
                  <p>
                    더 이상 매물 사진과 기본 스펙을 카톡에 어지럽게 붙여넣지 마세요.
                    공실뉴스에 물건을 등록하는 순간, 고객에게 바로 보낼 수 있는 고품격 브리핑 보고서가 자동으로 만들어집니다.
                  </p>
                  <p>
                    건축물 현황, 전용면적, 룸 구조, 무료 주차 대수, 렌트프리 조건까지 한 장으로 일목요연하게 정리되어 고객 상담 시간이 절반으로 줄어듭니다.
                  </p>
                  <ul className={styles.detailPoints}>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>카카오톡 원클릭 전송</strong>: 모바일 최적화 웹 링크 및 깔끔한 브리핑 PDF 제공</span>
                    </li>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>전국 11만 중개망 실시간 연동</strong>: 등록 즉시 공실뉴스 공동중개망에 자동 노출</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. 블로그포스팅: 우 이미지, 좌 설명 */}
              <div className={`${styles.detailRow} ${styles.detailRowReverse}`}>
                <div className={styles.detailText}>
                  <span className={styles.stepTag}>STEP 02</span>
                  <h3>
                    매물 정보를 AI가 분석해
                    <br />
                    <span>네이버 상위 노출 블로그 글</span>을 1초 만에 자동 작성
                  </h3>
                  <p>
                    매물 등록 후 1시간씩 머리를 쥐어짜며 블로그 포스팅을 고민할 필요가 없습니다.
                    등록된 데이터를 AI가 스스로 분석하여 네이버 검색 로직에 최적화된 포스팅을 1초 만에 작성해 줍니다.
                  </p>
                  <p>
                    지역명과 업종 키워드가 타겟팅된 소제목 구조, 자연스러운 본문 스토리라인, 연관 해시태그까지 한 번에 완성되어 복사 후 등록만 하면 끝납니다.
                  </p>
                  <ul className={styles.detailPoints}>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>스마트블록 알고리즘 반영</strong>: 검색 유입을 끌어오는 체계적 소제목과 키워드 밀도</span>
                    </li>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>원클릭 복사 & 보도자료 기사</strong>: 블로그 붙여넣기 및 언론사 기사 초안 동시 생성</span>
                    </li>
                  </ul>
                </div>

                <div className={styles.detailVisual}>
                  <div className={styles.reportImageContainer}>
                    <Image
                      src="/images/study/naver-blog-editor-sample.png"
                      alt="공실뉴스 AI 네이버 블로그 자동 포스팅 및 스마트에디터 실시간 작성 화면"
                      width={1000}
                      height={560}
                      className={styles.reportImage}
                    />
                  </div>
                </div>
              </div>

              {/* 3. 매물 접수 웹페이지: 좌 이미지, 우 설명 */}
              <div className={styles.detailRow}>
                <div className={styles.detailVisual}>
                  <div className={styles.reportImageContainer}>
                    <Image
                      src="/images/study/partner-webpage-sample.png"
                      alt="공실뉴스 파트너 전용 단독 매물 접수 및 브리핑 웹페이지 화면 (서초공인중개사사무소)"
                      width={1000}
                      height={560}
                      className={styles.reportImage}
                    />
                  </div>
                </div>

                <div className={styles.detailText}>
                  <span className={styles.stepTag}>STEP 03</span>
                  <h3>
                    내가 등록한 공실과 기사가
                    <br />
                    <span>PC·모바일 웹페이지에 자동 등록됩니다</span>
                  </h3>
                  <p>
                    비싼 홈페이지를 제작하거나 복잡한 관리 툴을 배울 필요가 없습니다.
                    공실뉴스에 공실과 기사를 등록하는 즉시, 나만의 전문 브리핑 및 매물 접수 웹페이지가 자동으로 완성됩니다.
                  </p>
                  <p>
                    PC와 모바일 화면에 최적화된 반응형 웹페이지로, 임대인·임차인이 스마트폰으로 24시간 언제 어디서나 매물을 접수하고,
                    중개사는 연동된 보도 기사와 매물 정보를 카톡 링크 하나로 고객에게 전달하여 신뢰도와 계약률을 극대화합니다.
                  </p>
                  <ul className={styles.detailPoints}>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>공실 &amp; 보도기사 실시간 동기화</strong>: 등록 즉시 내 웹페이지에 최신 물건과 기사가 자동 반영</span>
                    </li>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>원스톱 24시간 매물 접수 폼</strong>: 고객이 모바일에서 주소와 사진을 바로 올려 접수하는 간편 시스템</span>
                    </li>
                    <li>
                      <span className={styles.pointDot}>•</span>
                      <span><strong>PC &amp; 모바일 반응형 완벽 지원</strong>: 카카오톡·문자 링크로 스마트하게 전달하는 1:1 맞춤 브리핑</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ [5섹션] 방송국 PD 출신 편집장 직강 & 오프라인 검증 ━━━ */}
        <section className={styles.proof} aria-labelledby="proof-title">
          <div className={styles.contentWidth}>
            <p className={styles.kicker}>방송국 PD 출신 편집장 직강</p>
            <h2 id="proof-title">
              방송국 PD 출신, 공실뉴스편집장이
              <br />
              <span>강남/서초 100여명의 부동산과 함께 했던 실전 강의!</span>
            </h2>
            <p className={styles.sectionDescription}>
              강남·서초 100여 개 부동산 실무자와 오프라인에서 함께 했던 생생한 경험을
              <br />
              이제 온라인에서 누구나 쉽고 빠르게 따라 할 수 있도록 알려드립니다.
            </p>

            <div className={styles.proofStats}>
              <div>
                <strong>2025</strong>
                <span>강남구청</span>
                <small>ChatGPT·AI 실무특강</small>
              </div>
              <div>
                <strong>2025</strong>
                <span>서울벤처대학원대학교</span>
                <small>유튜브 콘텐츠 제작 실습</small>
              </div>
              <div>
                <strong>11만</strong>
                <span>부동산 네트워크</span>
                <small>공실뉴스 공동중개 기반</small>
              </div>
              <div>
                <strong>1년</strong>
                <span>온라인 실무 스터디</span>
                <small>필요할 때 반복 학습</small>
              </div>
            </div>

            {/* 온라인 실무 스터디 하단으로 배치된 강의 현장 사진 카드 */}
            <div className={styles.experienceCard}>
              <div className={styles.experiencePhoto}>
                <Image
                  src="/images/study/seoul-venture-lecture-2025-blur.png"
                  alt="2025년 서울벤처대학원대학교 강의 현장 단체사진 (개인정보 보호 모자이크 적용)"
                  fill
                  sizes="(max-width: 820px) 100vw, 46vw"
                />
              </div>
              <div className={styles.experienceText}>
                <span>2025 서울벤처대학원대학교</span>
                <h3>유튜브 콘텐츠 제작 실습 교육</h3>
                <p>
                  나이와 IT 경험에 상관없이 화면을 보며 하나씩 따라 하고,
                  수업이 끝날 때 직접 만든 결과물을 남기는 방식으로 진행했습니다.
                </p>
                <strong>이제 같은 과정을 온라인에서 반복해서 배울 수 있습니다.</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ [6섹션] 이런 부동산에게 추천합니다! ━━━ */}
        <section className={styles.problemSection} aria-labelledby="recommend-title">
          <div className={styles.contentWidth}>
            <header className={styles.sectionHeader}>
              <p className={styles.kicker}>RECOMMENDATION</p>
              <h2 id="recommend-title">
                이런 부동산에게 추천합니다!
              </h2>
              <p className={styles.sectionDescription}>
                주력 매물에 맞춘 자동 브리핑 리포트와 숏폼 콘텐츠로 실무 경쟁력을 높여보세요.
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
            <p>AI 시대, 1~2인 부동산을 위한 실무 강의</p>
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
