"use client";

import React, { useState } from "react";
import Link from "next/link";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import styles from "./mobileStudyPricing.module.css";

const FAQS = [
  {
    q: "1년 36만원 외에 가입비나 교재비 등 추가 비용이 있나요?",
    a: "전혀 없습니다. 가입비 0원, 교재비 0원이며 1년 36만원(월 3만원꼴, VAT 포함)으로 1년 365일 모든 VOD 특강과 실무 자료, AI 프로그램을 무제한 이용하실 수 있습니다.",
  },
  {
    q: "언제부터 수강할 수 있고, 기간은 얼마나 되나요?",
    a: "신청 완료 후 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의를 무제한 시청하실 수 있으며, 매달 새로 업데이트되는 신규 특강도 추가 비용 없이 이용하실 수 있습니다.",
  },
  {
    q: "할부 결제가 가능한가요?",
    a: "네, 주요 카드사 무이자 할부(최대 12개월 등)를 지원하여 월 3만원대로 부담 없이 시작하실 수 있습니다.",
  },
  {
    q: "강의 자료와 계약서 양식, AI 프롬프트도 받을 수 있나요?",
    a: "네. 각 강의실의 [강의자료 다운로드] 탭과 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 원본을 횟수 제한 없이 다운로드하실 수 있습니다.",
  },
  {
    q: "세금계산서나 현금영수증 발행이 가능한가요?",
    a: "네. 결제 시 입력하신 사업자등록번호로 매월 전자세금계산서 또는 지출증빙 현금영수증이 자동 발행됩니다.",
  },
];

const VALUE_STATS = [
  { title: "공실 등록 월 20건", highlight: "무료 포함" },
  { title: "AI 매물보고서", highlight: "무제한 생성" },
  { title: "기사 4건 포털 송고", highlight: "무료 포함" },
  { title: "광고영업권 (최대 50%)", highlight: "권한 부여" },
];

const RIVAL_COMPARE = [
  { rival: "150만 ~ 300만원대", study: "연 36만원 (월 3만원꼴)" },
  { rival: "오프라인/이론 위주", study: "실무 즉시 활용 100% VOD" },
  { rival: "종이 교재 수십 권", study: "클릭 한 번 AI 자동화 툴" },
  { rival: "종강 후 지원 종료", study: "1년 365일 무제한 다시보기" },
  { rival: "신규 강좌 추가 결제", study: "매월 신규 특강 무료 업데이트" },
];

export default function MobileStudyPricingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className={styles.container}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeMenu="pricing" />

      {/* ━━━ [1] 히어로 섹션 ━━━ */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <span>🎓 11만 부동산 실무 성장 패키지</span>
        </div>
        <h1 className={styles.heroTitle}>
          공실등록 + 유튜브/블로그 실습<br />
          월 <span className={styles.pointText}>3만원</span>이면 OK!
        </h1>
        <p className={styles.heroDesc}>
          12개월 동안 블로그 포스팅과 유튜브 채널을 확실하게 구축하실 수 있습니다.
        </p>

        {/* 4대 혜택 뱃지 그리드 */}
        <div className={styles.statsGrid}>
          {VALUE_STATS.map((stat) => (
            <div key={stat.title} className={styles.statCard}>
              <span className={styles.statHighlight}>{stat.highlight}</span>
              <p className={styles.statTitle}>{stat.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ [2] 1년 멤버십 패스 카드 ━━━ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>MEMBERSHIP PLAN</p>
          <h2 className={styles.sectionTitle}>부담 없는 1년 무제한 패스</h2>
        </div>

        <div className={styles.planCard}>
          <div className={styles.popularBadge}>추천 플랜</div>
          <h3 className={styles.planName}>공실스터디 1년 멤버십</h3>
          <p className={styles.planSub}>1년 365일 전 강좌 VOD + 자동화 프로그램 무제한</p>

          <div className={styles.priceWrap}>
            <div>
              <span className={styles.priceMonthly}>월 30,000원</span>
              <span className={styles.priceUnit}> / 월</span>
            </div>
            <span className={styles.priceYearly}>1년 360,000원 (VAT 포함)</span>
          </div>

          <ul className={styles.featureList}>
            {[
              "AI 유튜브 영상 제작 & 쇼츠 실무 전 강좌 무제한 시청",
              "네이버 블로그 포스팅 원클릭 자동 작성 프로그램 지원",
              "11만 부동산 열람 공실뉴스 공실 20건 무료 등록 권한",
              "손님 카톡 전송용 AI 매물보고서 & 쇼윈도 전단지 무제한 출력",
              "내 부동산 단독 물건접수 웹페이지 실시간 자동 연동",
              "매달 4회 신규 VOD 특강 추가 비용 없이 무료 업데이트",
              "드론 항공 영상 상업적 무료 라이선스 및 계약서 양식 제공",
              "주요 카드사 최대 12개월 무이자 할부 지원",
            ].map((text) => (
              <li key={text} className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <Link href="/m/study/apply" style={{
            display: "block",
            width: "100%",
            padding: "15px 0",
            textAlign: "center",
            background: "linear-gradient(135deg, #059669, #047857)",
            color: "#ffffff",
            fontSize: "15.5px",
            fontWeight: 800,
            borderRadius: "12px",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
            boxSizing: "border-box"
          }}>
            1년 36만원으로 멤버십 신청하기 →
          </Link>
        </div>

        {/* ━━━ [3] 시중 학원 대비 비교 ━━━ */}
        <div className={styles.sectionHeader} style={{ marginTop: "36px" }}>
          <p className={styles.sectionKicker}>COMPARE</p>
          <h2 className={styles.sectionTitle}>시중 실무 교육과 비교해 보세요</h2>
        </div>

        <div className={styles.compareWrap}>
          <div className={styles.compareHeader}>
            <div className={`${styles.compareColTitle} ${styles.colRival}`}>시중 오프라인 교육</div>
            <div className={`${styles.compareColTitle} ${styles.colStudy}`}>공실스터디</div>
          </div>
          {RIVAL_COMPARE.map((row) => (
            <div key={row.rival} className={styles.compareRow}>
              <div className={styles.rivalCell}>{row.rival}</div>
              <div className={styles.studyCell}>{row.study}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ [4] 자주 묻는 질문 FAQ ━━━ */}
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>FAQ</p>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
        </div>

        <div>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqBtn}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <span className={styles.faqIcon}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ [5] 하단 고정 플로팅 바 ━━━ */}
      <aside className={styles.floatingBar}>
        <div className={styles.floatingInner}>
          <div className={styles.floatingPriceWrap}>
            <span className={styles.floatingKicker}>1년 365일 무제한</span>
            <span className={styles.floatingPrice}>월 3만원<small style={{ fontSize: "11.5px", fontWeight: 500, color: "#64748b" }}> (연 36만)</small></span>
          </div>
          <Link href="/m/study/apply" className={styles.floatingBtn}>
            멤버십 신청하기
          </Link>
        </div>
      </aside>
    </div>
  );
}
