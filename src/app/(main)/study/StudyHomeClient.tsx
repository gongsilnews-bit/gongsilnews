"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import StudyHeader from "@/components/study/StudyHeader";
import styles from "./studyHome.module.css";

const FAQS = [
  {
    question: "컴퓨터나 AI를 잘 몰라도 따라갈 수 있나요?",
    answer:
      "네. 복잡한 이론보다 실제 매물을 가지고 화면을 보며 따라 하는 실습에 집중합니다. 필요한 부분은 온라인에서 반복해서 볼 수 있습니다.",
  },
  {
    question: "공실스터디에서는 무엇을 배우나요?",
    answer:
      "AI를 활용한 매물 설명과 블로그 글 작성, 유튜브 콘텐츠 제작, 공실 홍보 등 1~2인 부동산이 현장에서 바로 활용할 수 있는 내용을 배웁니다.",
  },
  {
    question: "스마트폰에서도 수강할 수 있나요?",
    answer: "네. PC는 물론 스마트폰과 태블릿에서도 강의를 볼 수 있습니다.",
  },
];

const PROCESS = [
  ["01", "물건 등록", "주소와 사진, 매물 정보를 공실뉴스에 등록합니다."],
  ["02", "AI 초안 완성", "매물의 장점을 정리한 블로그 포스팅 초안을 만듭니다."],
  ["03", "콘텐츠 활용", "블로그와 기사로 알리고 공동중개 기회를 넓힙니다."],
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function StudyHomeClient() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className={styles.page}>
      <StudyHeader />

      <main>
        <section className={styles.hero} aria-labelledby="study-title">
          <div className={styles.heroInner}>
            <p className={styles.overline}>공실뉴스 · 공실스터디</p>
            <h1 id="study-title">
              유튜브·블로그는
              <br />
              선택이 아니라 필수입니다.
            </h1>
            <div className={styles.heroBottom}>
              <p>
                시간도, 전문팀도 부족한 1~2인 로컬 부동산을 위한
                <br />
                가장 현실적인 콘텐츠 실무 강의.
              </p>
              <div className={styles.heroActions}>
                <Link href="/study/lectures" className={styles.primaryLink}>
                  강의 둘러보기 <Arrow />
                </Link>
                <a href="#story" className={styles.plainLink}>
                  공실스터디 소개
                </a>
              </div>
            </div>
          </div>
        </section>

        <figure className={styles.lecturePhoto}>
          <Image
            src="/images/study/gangnam-ai-lecture-2025.png"
            alt="2025년 강남구청 부동산 중개 실무 ChatGPT·AI 특강 현장"
            width={1797}
            height={866}
            preload
            sizes="(max-width: 1240px) 100vw, 1240px"
          />
          <figcaption>
            <span>2025. 05. 27.</span>
            <strong>강남구청 부동산 중개 실무 ChatGPT·AI 특강</strong>
          </figcaption>
        </figure>

        <section id="story" className={styles.story} aria-label="공실스터디가 필요한 이유">
          <article className={styles.storyItem}>
            <p className={styles.index}>01&nbsp;&nbsp; 변화</p>
            <div>
              <h2>
                이미 많은 대형 부동산은
                <br />
                콘텐츠로 고객을 만나고 있습니다.
              </h2>
              <p>
                전문팀이 유튜브와 블로그를 운영하고, 매물과 지역 정보를 꾸준히 알립니다.
                콘텐츠는 이제 새로운 고객을 만나는 기본적인 방법이 되었습니다.
              </p>
            </div>
          </article>

          <article className={styles.storyItem}>
            <p className={styles.index}>02&nbsp;&nbsp; 현실</p>
            <div>
              <h2>
                하지만 1~2인이 운영하는
                <br />
                로컬 부동산의 하루는 너무 짧습니다.
              </h2>
              <p>
                고객 상담과 현장 업무만으로도 바쁩니다. 중요하다는 것을 알면서도
                유튜브와 블로그를 꾸준히 운영할 여유는 많지 않습니다.
              </p>
            </div>
          </article>

          <article className={styles.storyItem}>
            <p className={styles.index}>03&nbsp;&nbsp; 방법</p>
            <div>
              <h2>
                이제 공실뉴스에
                <br />
                물건만 등록하세요.
              </h2>
              <p>
                AI가 매물 정보를 정리해 누구나 쉽고 빠르게 블로그 포스팅 초안을 만들 수 있습니다.
                공실스터디는 그 과정을 처음부터 차근차근 알려드립니다.
              </p>
            </div>
          </article>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionTitleRow}>
              <p>공실뉴스와 AI</p>
              <h2 id="process-title">
                물건 하나로 시작하는
                <br />
                가장 현실적인 방법
              </h2>
            </div>
            <ol className={styles.processList}>
              {PROCESS.map(([number, title, description]) => (
                <li key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.experience} aria-labelledby="experience-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionTitleRow}>
              <p>현장에서 온라인으로</p>
              <h2 id="experience-title">
                직접 가르치고,
                <br />
                함께 해봤습니다.
              </h2>
            </div>
            <div className={styles.experienceContent}>
              <p className={styles.experienceLead}>
                방송국 PD 출신 공실뉴스 편집장이 강남·서초 100여 명의 부동산 실무자와 함께했던
                오프라인 교육을 이제 온라인에서 쉽고 빠르게 알려드립니다.
              </p>
              <ul>
                <li>
                  <time>2025</time>
                  <span>강남구청 부동산 중개 실무 특강</span>
                  <small>ChatGPT·AI 활용 교육</small>
                </li>
                <li>
                  <time>2025</time>
                  <span>서울벤처대학원대학교 강의</span>
                  <small>유튜브 콘텐츠 제작 실습</small>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.statement} aria-labelledby="statement-title">
          <div className={styles.statementInner}>
            <p>배움이 실제 실무로 이어지는 곳</p>
            <h2 id="statement-title">
              공실을 알리고, 기사를 발행하고,
              <br />
              유튜브와 블로그를 꾸준히.
            </h2>
            <p className={styles.statementBody}>
              11만 부동산 네트워크가 이용하는 공실뉴스에서
              배운 내용을 내 매물에 바로 적용해 보세요.
            </p>
            <Link href="/study/lectures" className={styles.statementLink}>
              공실스터디 시작하기 <Arrow />
            </Link>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.faqInner}>
            <div className={styles.faqTitle}>
              <p>궁금한 점</p>
              <h2 id="faq-title">자주 묻는 질문</h2>
            </div>
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
                    {isOpen && (
                      <p id={answerId} className={styles.faqAnswer}>
                        {faq.answer}
                      </p>
                    )}
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
