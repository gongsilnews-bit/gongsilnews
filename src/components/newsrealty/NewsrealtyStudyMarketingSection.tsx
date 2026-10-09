"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import studyStyles from "./newsrealtyMarketingSection.module.css";

const TARGET_AUDIENCE = [
  {
    tag: "RECOMMEND 01",
    title: "사무실/상가 전문 부동산",
    image: "/images/study/recommend_real_teheran_man.jpg",
    imageAlt: "강남 테헤란로를 걸으며 스마트폰으로 공실뉴스를 열람하는 전문 남성 공인중개사",
    description: "빠른 공실계약이 필요한 사무실/상가 전문 부동산 대표님! 고객에게 브리핑이 꼭! 필요할때~",
    solution: "AI 매매보고서 초안 10초 완성!~공실뉴스에서 공실만 등록하면, 빠르게 완성할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    description: "단지 내 물건작업과 임장작업이 필수인 아파트/오피스텔 입점 부동산 대표님!~ 차별화된 서비스를 고객에게 제공하고 싶을때~",
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

export default function NewsrealtyStudyMarketingSection() {
  return (
    <div className={studyStyles.page} style={{ minHeight: "auto" }}>
      {/* ━━━ [1] 대형부동산 현황 (Market Reality) ━━━ */}
      <section className={studyStyles.marketSection} aria-labelledby="market-title">
        <div className={studyStyles.contentWidth}>
          <header className={studyStyles.sectionHeader}>
            <p className={studyStyles.kicker}>MARKET REALITY</p>
            <h2 id="market-title">
              대형 부동산은 매일 꾸준히
              <br />
              <span>유튜브·블로그, SNS마케팅을 운영하고 있습니다.</span>
            </h2>
            <p className={studyStyles.sectionDescription}>
              전문 인력을 갖춘 대형 부동산들은 매일 마케팅 담당자가 유튜브/ 블로그/SNS를 꾸준히 운영하며, 온라인 고객과 전속 매물을 꾸준히 선점하고 있습니다.
            </p>
          </header>

          <div className={studyStyles.marketGrid}>
            <div className={studyStyles.marketCard}>
              <div className={studyStyles.marketCardImgBox}>
                <Image
                  src="/images/study/study-real-corp-filming.webp"
                  alt="대형 부동산 사무실에서 촬영팀과 함께 매물 소개 유튜브 영상을 찍는 중개사"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.marketCardImg}
                />
                <div className={studyStyles.marketCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.marketBadge}>전문 기획·촬영팀 상주</span>
              <h3>부동산유튜브 채널 운영</h3>
              <p>
                전문 촬영 장비와 드론, 전담 PD를 배치해 매주 현장 임장 영상과 쇼츠를 쏟아내며 온라인 고객을 꾸준히 만납니다.
              </p>
            </div>

            <div className={studyStyles.marketCard}>
              <div className={studyStyles.marketCardImgBox}>
                <Image
                  src="/images/study/study-real-corp-report.webp"
                  alt="AI를 활용해 매매보고서와 홈페이지를 전문적으로 운영하는 모습"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.marketCardImg}
                />
                <div className={studyStyles.marketCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.marketBadge}>전문적인 온라인 작업</span>
              <h3>매매보고서, 홈페이지 운영</h3>
              <p>
                부동산 운영에 필요한 전문적인 매매보고서, 꾸준한 홈페이지 운영을 AI를 활용해 쉽게 빠르게 운영합니다.
              </p>
            </div>

            <div className={studyStyles.marketCard}>
              <div className={studyStyles.marketCardImgBox}>
                <Image
                  src="/images/study/study-real-corp-sns.webp"
                  alt="블로그 및 SNS 마케팅을 활발히 운영하는 대형 중개법인"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.marketCardImg}
                />
                <div className={studyStyles.marketCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.marketBadge} style={{ visibility: "hidden" }}>&nbsp;</span>
              <h3>SNS마케팅 채널 운영</h3>
              <p>
                AI 스마트폰시대, 부동산 정보를 빠르게 SNS로 젊은 고객에게 전달하며, 온라인으로 고객과 소통하며 오프라인에서 만납니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [2] 대조 브릿지 VS ━━━ */}
      <div className={studyStyles.vsDividerWrap} aria-hidden="true">
        <div className={studyStyles.contentWidth}>
          <div className={studyStyles.vsDividerInner}>
            <span className={studyStyles.vsLine} />
            <span className={studyStyles.vsBadge}>VS</span>
            <span className={studyStyles.vsLine} />
          </div>
        </div>
      </div>

      {/* ━━━ [3] 1~2인 로컬 부동산의 현실 고충 (Local Reality) ━━━ */}
      <section className={studyStyles.painSection} aria-labelledby="pain-title">
        <div className={studyStyles.contentWidth}>
          <header className={studyStyles.sectionHeader}>
            <p className={studyStyles.painKicker}>LOCAL REALTY AGENCY</p>
            <h2 id="pain-title">
              <span className={studyStyles.painTitleHighlight}>하지만</span> 1~2인 로컬 부동산은
              <br />
              <span>온라인마케팅 할 시간이 많지 않습니다</span>
            </h2>
            <p className={studyStyles.sectionDescription}>
              임장 가고, 손님 받고, 계약서 쓰기도 바쁜 하루… 중요성을 알면서도 포기할 수밖에 없었던 대표님들의 현실적인 이유입니다.
            </p>
          </header>

          <div className={studyStyles.painGrid}>
            <div className={studyStyles.painCard}>
              <div className={studyStyles.painCardImgBox}>
                <Image
                  src="/images/study/study-real-local-cost.webp"
                  alt="광고비 청구서를 보며 이마를 짚고 고민하는 동네 공인중개사 대표"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.painCardImg}
                />
                <div className={studyStyles.painCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6l3.5 12L12 9l4.5 9L20 6" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.painBadge}>비용 부담 · 고정비 증가</span>
              <h3>비싼 온라인광고비 &amp; 고정비용 증가</h3>
              <p>
                &ldquo;온라인광고비, 사무실임대료, 공실열람비용이 너무 부담스럽습니다.&rdquo; 고정비증가로 온라인 마케팅 대행을 맡기는 것은 꿈도 못꿔요.
              </p>
            </div>

            <div className={studyStyles.painCard}>
              <div className={studyStyles.painCardImgBox}>
                <Image
                  src="/images/study/study-real-local-busy.webp"
                  alt="밤늦게 서류 더미 앞에서 지쳐 눈을 비비는 동네 공인중개사 대표"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.painCardImg}
                />
                <div className={studyStyles.painCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.painBadge}>시간 부족 · 야근 피로</span>
              <h3>1~2인 부동산의 과중한 업무</h3>
              <p>
                &ldquo;하루 종일 일하고 들어와서 언제 컴퓨터 켜고 글을 쓰나요…&rdquo; 사진 정리하고 글 한 편 쓰려면 녹초가 되어 결국 작심삼일로 끝나고 맙니다.
              </p>
            </div>

            <div className={studyStyles.painCard}>
              <div className={studyStyles.painCardImgBox}>
                <Image
                  src="/images/study/study-real-local-camera.webp"
                  alt="스마트폰 카메라 앞에서 어색하게 웃으며 당황한 동네 공인중개사 대표"
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={studyStyles.painCardImg}
                />
                <div className={studyStyles.painCardIconOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>
              <span className={studyStyles.painBadge}>제작 장벽 · 카메라 울렁증</span>
              <h3>스마트폰 앞에만 서면 멘붕</h3>
              <p>
                &ldquo;스마트폰 앞에만 서면 무슨 말을 해야 할지 머릿속이 하얘집니다.&rdquo; 촬영 장비도 없고 편집 툴도 다룰 줄 몰라 시작부터 막막합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [4] 공실뉴스 AI 1분 솔루션: 3단계 프로세스 ━━━ */}
      <section className={studyStyles.processSection} aria-labelledby="process-section-title">
        <div className={studyStyles.contentWidth}>
          <header className={studyStyles.processHeader}>
            <p className={studyStyles.kicker}>공실뉴스 AI 원스톱 솔루션</p>
            <h2 id="process-section-title">
              <span className={studyStyles.painTitleHighlight} style={{ color: "#ffffff" }}>오늘부터</span> 공실뉴스부동산 파트너가 되시면,
              <br />
              <span>바로 시작하실 수 있습니다.</span>
            </h2>

            <div className={studyStyles.trioBannerWrap}>
              <div className={studyStyles.trioBannerImgBox}>
                <Image
                  src="/images/newsrealty/newsrealty_partner_trio_success.jpg"
                  alt="공실뉴스부동산 파트너가 되어 환호하고 기뻐하는 3명의 전문 공인중개사 대표님들"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1100px"
                  className={studyStyles.trioBannerImg}
                  priority
                />
              </div>
            </div>
          </header>
        </div>
      </section>

      {/* ━━━ [5] 내 지역/단지 공실만 등록하면 3대 무료 혜택 ━━━ */}
      <section className={studyStyles.freeOfferSection} aria-label="공실뉴스 등록 시 3대 무료 혜택">
        <div className={studyStyles.contentWidth}>
          <header className={studyStyles.freeOfferHeader}>
            <div className={studyStyles.freeOfferBadge}>100% 무료 혜택</div>
            <h2 className={studyStyles.freeOfferTitle}>
              내 지역/단지 공실만 등록하면<br />
              <span className={studyStyles.freeOfferHighlight} style={{ color: "#ea580c", WebkitTextFillColor: "#ea580c" }}>
                부동산마케팅, SNS포스팅, 유튜브 강의까지!
              </span>
            </h2>
            <p className={studyStyles.freeOfferSub}>
              공실뉴스에 내 지역·단지 물건을 등록하기만 하면, 매매보고서, 홍보지출력, 부동산홈페이지까지... 자동으로 완성됩니다.
            </p>
          </header>

          <div className={studyStyles.freeOfferList}>
            {/* 1단: 부동산마케팅 */}
            <div className={studyStyles.freeOfferRow}>
              <Link
                href="/newsrealty/benefits/brokerage-article"
                className={studyStyles.freeOfferImgBox}
                title="부동산마케팅 원클릭 OK! 자세히 보기"
              >
                <Image
                  src="/images/study/benefit_market_50s_broker_v3.jpg"
                  alt="동네 주택가 상가 부동산에서 거래완료 유리창 홍보지와 듀얼 모니터의 물건 지도를 갖춘 50대 남성 공인중개사 대표 소장님"
                  fill
                  sizes="(max-width: 900px) 100vw, 540px"
                  className={studyStyles.freeOfferImg}
                  priority
                />
                <div className={studyStyles.freeOfferLabelBadge}>부동산마케팅</div>
                <div className={studyStyles.freeOfferImgOverlay}>
                  <span className={studyStyles.freeOfferDetailBadge}>
                    자세히 보기
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
              <div className={studyStyles.freeOfferContent}>
                <span className={studyStyles.freeOfferChip}>공실등록20건</span>
                <h3 className={studyStyles.freeOfferContentTitle}>부동산마케팅 원클릭 OK!</h3>
                <ul className={studyStyles.freeOfferCheckList}>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>공동중개 물건 홍보</strong>
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>AI 매매보고서</strong> 즉시 생성
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>유리창 홍보지</strong> 1초 자동 출력
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>부동산웹페이지</strong> (내 물건 자동연동)
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 2단: SNS 마케팅 */}
            <div className={`${studyStyles.freeOfferRow} ${studyStyles.freeOfferRowReverse}`}>
              <div className={studyStyles.freeOfferContent}>
                <span className={studyStyles.freeOfferChip}>공실등록하면</span>
                <h3 className={studyStyles.freeOfferContentTitle}>SNS 마케팅 원클릭 자동화</h3>
                <ul className={studyStyles.freeOfferCheckList}>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>AI 블로그 포스팅</strong> 초안 자동
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>페이스북, 인스타그램, 쓰레드</strong> 초안 자동
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>유튜브 대본</strong> 초안 작성
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>인테리어 / 리모델링 AI</strong> 예상 견적등등
                    </span>
                  </li>
                </ul>
              </div>
              <Link
                href="/newsrealty/benefits/brokerage-article"
                className={studyStyles.freeOfferImgBox}
                title="SNS 마케팅 원클릭 자동화 자세히 보기"
              >
                <Image
                  src="/images/study/benefit_sns_40s_broker_v2.jpg"
                  alt="테헤란로 공인중개사 사무소에서 듀얼 모니터로 네이버 블로그 추천 매물 포스팅과 SNS 자동화 피드를 확인하는 40대 남녀 소장님"
                  fill
                  sizes="(max-width: 900px) 100vw, 540px"
                  className={studyStyles.freeOfferImg}
                  priority
                />
                <div className={studyStyles.freeOfferLabelBadge}>SNS 마케팅</div>
                <div className={studyStyles.freeOfferImgOverlay}>
                  <span className={studyStyles.freeOfferDetailBadge}>
                    자세히 보기
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>

            {/* 3단: AI 유튜브 강의 */}
            <div className={studyStyles.freeOfferRow}>
              <Link
                href="/newsrealty/benefits/youtube-lecture"
                className={studyStyles.freeOfferImgBox}
                title="부동산 유튜브 실습 & 커뮤니티 자세히 보기"
              >
                <Image
                  src="/images/study/benefit_youtube_40s_female_broker.jpg"
                  alt="아파트 단지 상가 부동산에서 브루 AI로 매물 쇼츠를 제작하고 공실스터디 온라인 강의를 수강하는 40대 여성 공인중개사 대표 소장님"
                  fill
                  sizes="(max-width: 900px) 100vw, 540px"
                  className={studyStyles.freeOfferImg}
                  priority
                />
                <div className={studyStyles.freeOfferLabelBadge}>AI 유튜브 강의</div>
                <div className={studyStyles.freeOfferImgOverlay}>
                  <span className={studyStyles.freeOfferDetailBadge}>
                    자세히 보기
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
              <div className={studyStyles.freeOfferContent}>
                <span className={studyStyles.freeOfferChip}>부동산 유튜브 강의</span>
                <h3 className={studyStyles.freeOfferContentTitle}>부동산 유튜브 실습 &amp; 커뮤니티</h3>
                <ul className={studyStyles.freeOfferCheckList}>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>동영상 편집 강의</strong> (브루AI, 캡컷등등)
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>AI 대본활용</strong>, 영상제작 강의
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>드론영상, Q&amp;A</strong>, 커뮤니티 활용
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 4단: 온라인 강의 개설 지원 */}
            <div className={`${studyStyles.freeOfferRow} ${studyStyles.freeOfferRowReverse}`}>
              <div className={studyStyles.freeOfferContent}>
                <span className={studyStyles.freeOfferChip}>온라인 강의 개설 지원</span>
                <h3 className={studyStyles.freeOfferContentTitle}>온라인 강의 개설 지원</h3>
                <ul className={studyStyles.freeOfferCheckList}>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>공실뉴스 강의</strong> 등록권한 부여
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>스마트폰 촬영 영상</strong> 간편 업로드
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>지역 상권·단지 분석</strong> 지식의 자산화
                    </span>
                  </li>
                  <li className={studyStyles.freeOfferCheckItem}>
                    <span className={studyStyles.freeOfferCheckIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className={studyStyles.freeOfferCheckText}>
                      <strong className={studyStyles.freeOfferCheckStrong}>전국 부동산 네트워크</strong> 홍보 및 수강 연결
                    </span>
                  </li>
                </ul>
              </div>
              <Link
                href="/newsrealty/benefits/youtube-lecture"
                className={studyStyles.freeOfferImgBox}
                title="온라인 강의 개설 지원 자세히 보기"
              >
                <Image
                  src="/images/study/real-estate-youtube-filming.png"
                  alt="스마트폰과 삼각대로 매물 분석 및 중개 노하우 온라인 강의를 촬영하여 공실뉴스에 업로드하는 공인중개사 대표님"
                  fill
                  sizes="(max-width: 900px) 100vw, 540px"
                  className={studyStyles.freeOfferImg}
                  priority
                />
                <div className={studyStyles.freeOfferLabelBadge}>온라인 강의 개설</div>
                <div className={studyStyles.freeOfferImgOverlay}>
                  <span className={studyStyles.freeOfferDetailBadge}>
                    자세히 보기
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ [6] 이런 부동산에게 추천합니다! ━━━ */}
      <section className={studyStyles.problemSection} style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }} aria-labelledby="recommend-title">
        <div className={studyStyles.contentWidth}>
          <header className={studyStyles.sectionHeader}>
            <p className={studyStyles.kicker}>RECOMMENDATION</p>
            <h2 id="recommend-title">
              이런 부동산에게 추천합니다!
            </h2>
            <p className={studyStyles.sectionDescription}>
              바쁜 1~2인, 지역/단지 부동산 대표님에게 추천합니다.
            </p>
          </header>

          <div className={studyStyles.problemGrid}>
            {TARGET_AUDIENCE.map((item) => (
              <article key={item.title} className={studyStyles.problemCard}>
                <div className={studyStyles.problemCharWrap}>
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    width={280}
                    height={280}
                    className={studyStyles.problemCharImg}
                  />
                </div>
                <span className={studyStyles.problemTag}>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className={studyStyles.problemCardSolution}>
                  <span className={studyStyles.problemCardSolutionBadge}>💡 맞춤 솔루션</span>
                  <p className={studyStyles.problemCardSolutionText}>{item.solution}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
