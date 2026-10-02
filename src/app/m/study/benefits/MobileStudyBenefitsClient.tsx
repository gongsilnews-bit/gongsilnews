"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import styles from "./mobileStudyBenefits.module.css";

type BenefitTabKey = "vacancy" | "youtube" | "blog" | "community";

const TABS: { key: BenefitTabKey; label: string }[] = [
  { key: "vacancy", label: "공실등록20건" },
  { key: "youtube", label: "AI 유튜브제작" },
  { key: "blog", label: "블로그자동화" },
  { key: "community", label: "커뮤니티·자료실" },
];

export default function MobileStudyBenefitsClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as BenefitTabKey) || "vacancy";
  const [activeTab, setActiveTab] = useState<BenefitTabKey>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as BenefitTabKey;
    if (tabParam && ["vacancy", "youtube", "blog", "community"].includes(tabParam)) {
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
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#062828" }}>멤버십 혜택</span>
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
              <span className={styles.pointText}>AI 유튜브</span> 영상 제작 &amp;<br />
              4K 드론 저작권 제공
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
              { step: "03", tag: "7~9개월차", title: "프리미어 & 4K 드론 영상", desc: "무료 제공되는 4K 드론 항공 영상을 활용해 대형 임장 전문 채널 수준의 영상을 만듭니다." },
              { step: "04", tag: "10~12개월차", title: "바이브코딩 홈페이지 제작", desc: "코딩 없이 AI로 내 부동산 전용 접수 웹페이지를 내 마음대로 직접 만듭니다." },
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
                alt="4K 드론 항공 영상 샘플"
                fill
                sizes="(max-width: 480px) 100vw, 448px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.mediaBody}>
              <h3 className={styles.mediaTitle}>4K 드론 영상 상업적 무료 라이선스</h3>
              <p className={styles.mediaDesc}>
                드론 조종 자격증이나 장비 없이도 고화질 항공 영상을 내 유튜브 영상 배경으로 마음껏 사용하실 수 있습니다.
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
              <h3 className={styles.mediaTitle}>매물 입력 후 원클릭 끝!</h3>
              <p className={styles.mediaDesc}>
                더 이상 빈 화면 앞에서 고민하지 마세요. 클릭 한 번으로 가독성 높은 맞춤형 블로그 글이 쏟아집니다.
              </p>
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
        </div>
      )}

      {/* ━━━ [4] 커뮤니티 & 자료실 탭 ━━━ */}
      {activeTab === "community" && (
        <div>
          <section className={styles.hero}>
            <div className={styles.badge}>핵심 혜택 04</div>
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
          <Link href="/m/study/apply" className={styles.floatingBtn}>
            공실스터디 멤버십 신청하기 (월 3만원)
          </Link>
        </div>
      </aside>
    </div>
  );
}
