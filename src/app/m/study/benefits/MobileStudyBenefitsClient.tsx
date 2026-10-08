"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import styles from "./mobileStudyBenefits.module.css";

type BenefitTabKey = "vacancy" | "blog" | "youtube" | "upload" | "community";

const TABS: { key: BenefitTabKey; label: string }[] = [
  { key: "vacancy", label: "공실등록20건" },
  { key: "blog", label: "블로그자동화" },
  { key: "youtube", label: "AI 유튜브제작" },
  { key: "upload", label: "강의영상업로딩" },
  { key: "community", label: "커뮤니티·자료실" },
];

export default function MobileStudyBenefitsClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as BenefitTabKey) || "vacancy";
  const [activeTab, setActiveTab] = useState<BenefitTabKey>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as BenefitTabKey;
    if (tabParam && ["vacancy", "blog", "youtube", "upload", "community"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className={styles.container}>
      {/* 심플 뒤로가기 바 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "#ffffff", borderBottom: "1px solid #e5e7eb",
        padding: "0 12px", height: "48px",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#1c1917" }}>멤버십 혜택</span>
      </div>

      {/* ━━━ 혜택 세부 탭 바 ━━━ */}
      <div className={styles.benefitTabs}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              {isActive && <div className={styles.tabIndicator} />}
            </button>
          );
        })}
      </div>

      {/* ━━━ [1] 공실등록 & 기사발행 탭 ━━━ */}
      {activeTab === "vacancy" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 01</div>
            <h1 className={styles.heroTitle}>
              공실 등록 <span className={styles.pointText}>월 20건</span> &amp;<br />
              기사 발행 <span className={styles.pointText}>월 4편</span>
            </h1>
            <p className={styles.heroDesc}>
              전국 11만 부동산이 매일 열람하는 공실뉴스에 내 매물을 등록하고, 실전 언론 기사로 포털에 동시 송고합니다.
            </p>
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit_vacancy_hero_final.jpg"
                alt="공실뉴스 등록 및 공동중개 체결"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>11만 부동산과의 실시간 공동중개</h3>
              <p className={styles.mediaDesc}>
                매물을 등록하는 즉시 다른 중개사와 임차인에게 노출되어 계약 체결 확률이 극대화됩니다.
              </p>
            </div>
          </div>

          {/* 5단계 실무 워크플로우 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>WORKFLOW</p>
              <h2 className={styles.sectionTitle}>5단계 올인원 실무 프로세스</h2>
            </div>

            {[
              { step: "01", tag: "블로그 · 유튜브", title: "콘텐츠 제작", desc: "스터디에서 배운 대로 블로그 글을 쓰거나 유튜브 영상을 업로드합니다." },
              { step: "02", tag: "월 20건 · 월 4편", title: "공실등록 & 기사발행", desc: "11만 부동산 공실뉴스에 공실 20건을 등록하고 내 콘텐츠로 기사 4편을 발행합니다." },
              { step: "03", tag: "보고서 출력 · 전단지", title: "보고서 & 전단지 즉시 출력", desc: "등록 즉시 생성된 AI 매물보고서와 쇼윈도 유리창 전단지를 1초 만에 인쇄합니다." },
              { step: "04", tag: "100% 자동 동기화", title: "내 웹페이지 자동 연동", desc: "등록한 공실과 기사가 나만의 단독 물건접수 웹페이지에 실시간 자동 진열됩니다." },
              { step: "05", tag: "고객 유입", title: "카톡 전달 & 매물접수", desc: "손님에게 카톡 문자로 홈페이지 링크를 보내고, 유튜브·블로그로 매물을 접수받습니다." },
            ].map((s) => (
              <div key={s.step} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.step}</div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTag}>{s.tag}</span>
                  <h4 className={styles.stepTitle}>{s.title}</h4>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </section>

          {/* 연계 솔루션 3종 비주얼 */}
          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/property-report-sample.png"
                alt="AI 매물보고서 샘플"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>전문가 수준의 AI 매물보고서</h3>
              <p className={styles.mediaDesc}>
                터치 한 번으로 깔끔한 물건 브리핑 리포트가 생성되어 손님 카톡이나 문자로 즉시 발송됩니다.
              </p>
            </div>
          </div>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit_window_flyer.jpg"
                alt="쇼윈도 유리창 전단지 홍보물"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>쇼윈도 워크인 전단지 인쇄</h3>
              <p className={styles.mediaDesc}>
                부동산 사무소 유리창에 바로 부착할 수 있는 깔끔한 전단지 디자인이 자동으로 완성됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ [2] AI 유튜브 제작 탭 ━━━ */}
      {activeTab === "youtube" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 02</div>
            <h1 className={styles.heroTitle}>
              <span className={styles.pointText}>유튜브 &amp; 릴스</span> 영상 제작 &amp;<br />
              드론 영상 저작권 제공
            </h1>
            <p className={styles.heroDesc}>
              대본 작성부터 자막, 컷편집, 썸네일까지! 스마트폰과 AI로 콜 부르는 임장 영상을 완성합니다.
            </p>
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit_youtube_hero.jpg"
                alt="유튜브 영상 강의"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>방송국 PD 출신 편집장의 실전 강의</h3>
              <p className={styles.mediaDesc}>
                강남/서초 부동산에서 수백만 원에 진행되던 실무 비법을 모바일과 PC에서 365일 무제한 수강하세요.
              </p>
            </div>
          </div>

          {/* 4단계 성장 로드맵 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>ROADMAP</p>
              <h2 className={styles.sectionTitle}>12개월 단계별 마스터 로드맵</h2>
            </div>

            {[
              { step: "01", tag: "1~3개월차", title: "기초 영상 & 숏폼 마스터", desc: "Vrew 음성인식 자막과 캡컷으로 스마트폰 하나로 3분 만에 첫 숏폼 영상을 완성합니다." },
              { step: "02", tag: "4~6개월차", title: "콜 부르는 대본 & AI 기획", desc: "챗GPT와 제미나이로 고객 심리를 사로잡는 대본을 쓰고 클릭률 높은 썸네일을 제작합니다." },
              { step: "03", tag: "7~9개월차", title: "프리미어 & 드론 영상", desc: "무료 제공되는 드론 항공 영상을 활용해 대형 임장 전문 채널 수준의 영상을 만듭니다." },
              { step: "04", tag: "10~12개월차", title: "고급 쇼츠 · 릴스 실습", desc: "AI 툴을 활용해 숏폼 영상을 빠르게 제작하고, 계약으로 연결되는 채널 브랜딩을 완성합니다." },
            ].map((s) => (
              <div key={s.step} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.step}</div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTag}>{s.tag}</span>
                  <h4 className={styles.stepTitle}>{s.title}</h4>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit_drone_sample.jpg"
                alt="드론 항공 영상 샘플"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>드론 영상 상업적 무료 라이선스</h3>
              <p className={styles.mediaDesc}>
                드론 조종 자격증이나 장비 없이도 고화질 항공 영상을 내 유튜브 영상 배경으로 마음껏 사용하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* ━━━ 방송국 PD 출신 편집장 직강 & 오프라인 검증 (PC 드론 하단 섹션과 동일) ━━━ */}
          <section style={{ padding: "32px 16px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: "#059669", letterSpacing: "0.5px", margin: "0 0 6px" }}>
              방송국 PD 출신 편집장 직강
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#241d19", lineHeight: 1.4, letterSpacing: "-0.5px", margin: "0 0 10px", wordBreak: "keep-all" }}>
              방송국 PD 출신, 공실뉴스편집장이<br />
              <span style={{ color: "#059669" }}>강남/서초 100여명의 부동산과 함께 했던 실전 강의!</span>
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px", wordBreak: "keep-all" }}>
              강남·서초 100여 개 부동산 실무자와 오프라인에서 함께 했던 생생한 경험을 온라인에서 누구나 쉽고 빠르게 따라 할 수 있도록 알려드립니다.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                borderTop: "1px solid #e2e8f0",
                borderLeft: "1px solid #e2e8f0",
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              {[
                { num: "2025", org: "강남구청", label: "ChatGPT·AI 실무특강" },
                { num: "2025", org: "서울벤처대학원대학교", label: "유튜브 콘텐츠 제작 실습" },
                { num: "11만", org: "부동산 네트워크", label: "공실뉴스 회원·독자 기준" },
                { num: "1년", org: "온라인 실무 스터디", label: "맞춤형 피드백 제공" },
              ].map((s) => (
                <div
                  key={s.org}
                  style={{
                    padding: "14px 12px",
                    borderRight: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <strong style={{ fontSize: 20, fontWeight: 900, color: "#059669" }}>{s.num}</strong>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", wordBreak: "keep-all" }}>{s.org}</span>
                  <small style={{ fontSize: 11.5, color: "#64748b", wordBreak: "keep-all" }}>{s.label}</small>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/seoul-venture-lecture-2025-blur.png"
                alt="2025년 서울벤처대학원대학교 강의 현장 단체사진 (개인정보 보호 모자이크 적용)"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#059669", margin: "0 0 4px" }}>2025 서울벤처대학원대학교</p>
              <h3 className={styles.mediaTitle}>유튜브 콘텐츠 제작 실습 교육</h3>
              <p className={styles.mediaDesc}>
                나이와 IT 경험에 상관없이 화면을 보며 하나씩 따라 하고, 수업이 끝날 때 직접 만든 결과물을 남기는 방식으로 진행했습니다.
              </p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#047857", margin: "8px 0 0" }}>
                이제 같은 과정을 온라인에서 배울 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ [3] 블로그 자동화 탭 ━━━ */}
      {activeTab === "blog" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 03</div>
            <h1 className={styles.heroTitle}>
              네이버 블로그 포스팅<br />
              <span className={styles.pointText}>원클릭 전자동 완성</span>
            </h1>
            <p className={styles.heroDesc}>
              공실 정보만 있으면 전문 기사 초안과 네이버 블로그 포스팅이 3초 만에 작성됩니다.
            </p>
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit_blog_hero.jpg"
                alt="블로그 자동화 솔루션"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>
                매물 정보를 AI가 분석해<br />
                네이버 상위 노출 블로그 글을 1초 만에 자동 작성
              </h3>
              <p className={styles.mediaDesc}>
                매물 등록 후 1시간씩 머리를 쥐어짜며 블로그 포스팅을 고민할 필요가 없습니다. 등록된 데이터를 AI가 스스로 분석하여 네이버 검색 로직에 최적화된 포스팅을 1초 만에 작성해 줍니다.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <li style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>
                  <span style={{ color: "#059669", fontWeight: 900 }}>✔</span> <strong>스마트블록 알고리즘 반영</strong> — 검색 유입을 끌어오는 소제목과 키워드 밀도
                </li>
                <li style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>
                  <span style={{ color: "#059669", fontWeight: 900 }}>✔</span> <strong>원클릭 복사 & 보도자료 기사</strong> — 블로그 붙여넣기 및 언론사 기사 초안 동시 생성
                </li>
              </ul>
            </div>
          </div>

          {/* 블로그 5단계 프로세스 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>PROCESS</p>
              <h2 className={styles.sectionTitle}>원클릭 포스팅 진행 과정</h2>
            </div>

            {[
              { step: "01", tag: "공실뉴스 등록", title: "공실 매물 등록", desc: "공실뉴스에 내 부동산 매물의 기본 정보(위치, 면적, 가격 등)를 입력합니다." },
              { step: "02", tag: "원클릭 확장프로그램", title: "크롬 작성기 실행", desc: "크롬 웹스토어에서 무료 다운로드한 '공실뉴스 기사 작성기'를 클릭합니다." },
              { step: "03", tag: "3초 완성", title: "기사 & 블로그 생성", desc: "버튼 한 번으로 언론 기사 초안과 매력적인 블로그 글이 즉시 생성됩니다." },
              { step: "04", tag: "팩트 체크", title: "작성자 검토 & 확인", desc: "AI가 작성한 금액과 면적 등 핵심 팩트를 1분간 가볍게 확인합니다." },
              { step: "05", tag: "고객 문의", title: "블로그 발행 & 유입", desc: "네이버 블로그에 붙여넣어 발행하고 잠재 고객의 매물 문의를 받습니다." },
            ].map((s) => (
              <div key={s.step} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.step}</div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTag}>{s.tag}</span>
                  <h4 className={styles.stepTitle}>{s.title}</h4>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </section>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/naver-blog-editor-sample.png"
                alt="네이버 블로그 에디터 연동 샘플"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>네이버 스마트에디터 최적화</h3>
              <p className={styles.mediaDesc}>
                제목 추천, 서론, 본문 소제목 구조, 해시태그까지 네이버 검색 알고리즘에 맞게 구성됩니다.
              </p>
            </div>
          </div>

          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb}>
              <Image
                src="/images/study/benefit-sns-posting-real.jpg"
                alt="인스타, 쓰레드, 페이스북 SNS 자동 포스팅"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>인스타 · 쓰레드 · 페북 원클릭 포스팅</h3>
              <p className={styles.mediaDesc}>
                각 SNS 감성에 맞는 감각적인 문구와 이모지, 핵심 해시태그까지 자동으로 작성되어 피드에 바로 등록할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ [4] 강의영상업로딩 탭 ━━━ */}
      {activeTab === "upload" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 04</div>
            <h1 className={styles.heroTitle}>
              내 지역정보, 단지 정보<br />
              <span className={styles.pointText}>이제 유튜브 강의로!</span>
            </h1>
            <p className={styles.heroDesc}>
              부동산 대표님도 강사가 될 수 있습니다! 머릿속 노하우를 온라인 인강으로 자산화하세요.
            </p>
          </section>

          {/* 실사 배너 미디어 카드 */}
          <div className={styles.mediaCard}>
            <div className={styles.mediaThumb} style={{ aspectRatio: "1024 / 409", height: "auto" }}>
              <Image
                src="/images/study/benefit-lecture-upload-process.png"
                alt="강의 개설 및 영상 업로드 프로세스"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>
                대표님만의 단독 인강 채널 개설 &amp; 플랫폼 업로드 지원
              </h3>
              <p className={styles.mediaDesc}>
                스마트폰 하나로 촬영한 지역 분석, 매물 브리핑 영상을 공실스터디 플랫폼에 정식 업로드하고, 전국 11만 부동산 네트워크와 고객에게 지역 1등 전문가로 독점 브랜딩됩니다.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                  공동중개 20건
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                  유튜브 영상 제작 무료
                </span>
                <span style={{ fontSize: "11.5px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", background: "#059669", color: "#ffffff" }}>
                  강의 영상 플랫폼 업로드
                </span>
              </div>
            </div>
          </div>

          {/* 4단계 로드맵 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>STEP BY STEP</p>
              <h2 className={styles.sectionTitle}>강사 데뷔 &amp; 업로드 4단계</h2>
            </div>

            {[
              { step: "01", tag: "주제 선정", title: "지역·단지 정보 기획", desc: "내가 가장 잘 아는 우리 동네 학군, 교통, 아파트 단지 분석 노하우를 주제로 정합니다." },
              { step: "02", tag: "스마트폰 촬영", title: "스마트폰으로 쉽게 촬영", desc: "고가의 장비 없이 스마트폰과 핀마이크 하나로 현장 임장 영상을 촬영합니다." },
              { step: "03", tag: "인강 개설", title: "플랫폼 영상 업로드", desc: "촬영한 영상을 공실스터디에 등록하면 대표님 전용 온라인 강의로 즉시 개설됩니다." },
              { step: "04", tag: "독점 브랜딩", title: "전국 11만 네트워크 노출", desc: "전국 중개사와 포털 방문자에게 지역 1등 강사로 독점 노출되어 수익과 문의가 증가합니다." },
            ].map((s) => (
              <div key={s.step} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.step}</div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTag}>{s.tag}</span>
                  <h4 className={styles.stepTitle}>{s.title}</h4>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </section>

          {/* 상세 인포그래픽 가이드 목업 */}
          <section style={{ padding: "16px", background: "#f8fafc" }}>
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#059669" }}>OFFICIAL GUIDE</span>
              <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#111827", margin: "4px 0 0" }}>
                강사 개설 &amp; 영상 업로드 상세 안내
              </h3>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "153 / 1024", borderRadius: "16px", overflow: "hidden", border: "1px solid #dce9e5", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
              <Image
                src="/images/study/benefit-lecture-upload-detail.png"
                alt="강의영상업로딩 상세 안내"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "contain", objectPosition: "top center" }}
              />
            </div>
          </section>
        </div>
      )}

      {/* ━━━ [5] 커뮤니티 & 자료실 탭 ━━━ */}
      {activeTab === "community" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 05</div>
            <h1 className={styles.heroTitle}>
              전국 11만 부동산 네트워크 &amp;<br />
              <span className={styles.pointText}>실무 서식 자료실</span>
            </h1>
            <p className={styles.heroDesc}>
              혼자 고민하지 마세요. 전국의 실무 대표님들과 노하우를 공유하고 엄선된 실무 서식을 무료로 다운로드하세요.
            </p>
          </section>

          <section className={styles.section} style={{ paddingTop: "20px" }}>
            <div className={styles.mediaCard} style={{ margin: "0 0 16px" }}>
              <div className={styles.mediaBody}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
                <h3 className={styles.mediaTitle}>실무 서식 &amp; AI 프롬프트 자료실</h3>
                <p className={styles.mediaDesc}>
                  특수 계약서 양식, 중개 확인설명서 체크리스트, 제미나이/챗GPT 매물 브리핑 프롬프트 원본을 무제한 제공합니다.
                </p>
                <Link href="/m/study?tab=board" style={{ display: "inline-block", marginTop: "12px", color: "#059669", fontWeight: 700, fontSize: "13px" }}>
                  자료실 바로가기 →
                </Link>
              </div>
            </div>

            <div className={styles.mediaCard} style={{ margin: "0 0 16px" }}>
              <div className={styles.mediaBody}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>💬</div>
                <h3 className={styles.mediaTitle}>정회원 전용 Q&amp;A 및 소통</h3>
                <p className={styles.mediaDesc}>
                  강의를 보며 막히는 부분이나 부동산 실무, 세무, 법률 이슈를 언제든 문의하고 답변받으실 수 있습니다.
                </p>
                <Link href="/m/board?id=free" style={{ display: "inline-block", marginTop: "12px", color: "#059669", fontWeight: 700, fontSize: "13px" }}>
                  커뮤니티 둘러보기 →
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ━━━ 하단 고정 CTA 바 ━━━ */}
      <aside className={styles.floatingBar}>
        <div className={styles.floatingInner}>
          <Link href="/m/study/apply" className={styles.floatingBtn} style={{ color: "#ffffff" }}>
            공실스터디 멤버십 신청하기
          </Link>
        </div>
      </aside>
    </div>
  );
}

