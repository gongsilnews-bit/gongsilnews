"use client";

// 멤버십혜택 상세: 블로그·SNS 자동화. 공통 틀(StudyBenefitDetail)로 다시 만든 첫 페이지 (2026-10-12).
import React from "react";
import StudyHeader from "@/components/study/StudyHeader";
import StudyBenefitDetail, { type BenefitDetailContent } from "@/components/study/StudyBenefitDetail";

const S = "/images/study/";

const content: BenefitDetailContent = {
  kicker: "멤버십 혜택 · 블로그 · SNS",
  title: "내가 등록한 공실로\n블로그 · SNS 글을 1분 만에",
  lead: "공실을 등록하고 공실뉴스 기사작성기를 누르면 블로그 글과 인스타그램 · 쓰레드 · 페이스북 원고 초안이 바로 만들어집니다. 대표님은 사실 확인만 하고 올리시면 됩니다.",
  chips: ["블로그 포스팅 초안", "인스타 · 쓰레드 · 페북 원고", "AI 인테리어 예측", "프로그램 이용료 0원"],
  heroImg: S + "benefit-blog-hero-real.webp",
  heroAlt: "모니터에 SNS 게시물을 올리고 스마트폰을 보며 기뻐하는 공인중개사",
  problems: [
    "매물 하나 올릴 때마다 블로그 글 쓰느라 1시간씩 걸립니다",
    "인스타 · 쓰레드 · 페북까지 채널마다 글을 따로 쓰기 벅찹니다",
    "꾸준히 올려야 하는 건 알지만, 바빠서 매번 멈춥니다",
  ],
  features: [
    {
      label: "블로그 포스팅",
      title: "매물 정보로 블로그 글 초안을 자동으로",
      body: "등록한 공실의 위치 · 면적 · 가격 · 사진 정보를 바탕으로 소제목, 본문, 해시태그까지 블로그 글 초안을 만들어 드립니다. 복사해서 네이버 블로그에 붙여 넣으면 됩니다.",
      points: ["지역명 · 매물 키워드를 넣은 소제목 구성", "공실뉴스 기사 초안도 함께 생성"],
      img: S + "naver-blog-editor-sample.png",
      alt: "공실뉴스 기사작성기로 만든 네이버 블로그 글 작성 화면",
    },
    {
      label: "SNS 원고",
      title: "인스타그램 · 쓰레드 · 페이스북 원고도 한 번에",
      body: "같은 공실 정보로 채널마다 어울리는 말투와 길이의 원고를 만들어 드립니다. 지역명, 역세권, 매물 용도에 맞는 해시태그도 함께 추천합니다.",
      points: ["채널별 말투와 길이에 맞춘 문구", "지역 · 역세권 · 용도 해시태그 추천"],
      img: S + "benefit-sns-posting-real.jpg",
      alt: "인스타그램, 쓰레드, 페이스북, 블로그에 매물을 함께 올리는 공인중개사",
    },
    {
      label: "AI 인테리어 예측",
      title: "리모델링 후 모습을 미리 보여 주세요",
      body: "건물 외관과 아파트 실내의 리모델링 후 모습을 실사처럼 보여 주는 AI 인테리어 예측기를 함께 드립니다. 고객 상담과 쇼츠 · 릴스 영상에 바로 쓰실 수 있습니다.",
      points: ["Before & After 비교 이미지", "상담 자료와 숏폼 영상에 활용"],
      img: S + "benefit-interior-before-after.jpg",
      alt: "AI 인테리어 예측기의 시공 전 · 시공 후 비교 이미지",
    },
    {
      label: "이용 비용",
      title: "추가 요금 없이, 쓰시던 챗GPT · 제미나이로",
      body: "프로그램 이용료나 건당 요금이 없습니다. 대표님이 구독 중인 챗GPT 또는 제미나이 계정을 연결해 그대로 쓰시면 됩니다. 기능은 계속 업데이트됩니다.",
      points: ["프로그램 이용료 0원", "본인 챗GPT · 제미나이 구독 계정 필요"],
      img: S + "benefit-chatgpt-gemini-sample.png",
      alt: "챗GPT · 제미나이 계정을 연결해 블로그 글을 만드는 화면",
    },
  ],
  steps: [
    { t: "공실 등록", d: "위치 · 면적 · 가격 · 사진을 공실뉴스에 등록합니다." },
    { t: "기사작성기 실행", d: "크롬에 설치한 공실뉴스 기사작성기를 엽니다." },
    { t: "초안 만들기", d: "버튼 한 번으로 블로그 · SNS 원고 초안이 나옵니다." },
    { t: "사실 확인", d: "금액 · 면적 · 연락처를 1분 정도 확인합니다." },
    { t: "올리기", d: "블로그와 SNS에 붙여 넣어 바로 올립니다." },
  ],
  faqs: [
    { q: "챗GPT나 제미나이가 꼭 있어야 하나요?", a: "네. 초안은 대표님 본인의 챗GPT 또는 제미나이 계정으로 만듭니다. 구독 중인 계정이 필요합니다." },
    { q: "AI가 쓴 글을 그대로 올려도 되나요?", a: "초안입니다. 금액, 면적, 연락처 같은 사실은 꼭 한 번 확인하신 뒤 올려 주세요." },
    { q: "설치와 사용법은 어디서 배우나요?", a: "크롬 확장프로그램 설치부터 블로그 · SNS에 올리는 방법까지 부동산특강 강의에서 순서대로 안내합니다." },
    { q: "글을 몇 번까지 만들 수 있나요?", a: "프로그램 쪽 횟수 제한은 없습니다. 대표님 챗GPT · 제미나이 계정의 사용 한도 안에서 쓰실 수 있습니다." },
  ],
  ctaTitle: "블로그 · SNS, 이제 꾸준히 올릴 수 있습니다.",
};

export default function StudyBlogAutomationClient() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <StudyHeader />
      <StudyBenefitDetail c={content} />
    </div>
  );
}
