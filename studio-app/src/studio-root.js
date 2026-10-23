// 회원 저장 폴더 — 모두 문서\공실스튜디오 하나에, 메뉴 순서대로 번호 (2026-10-23 사장님, docs/2026-10-23_folder_plan.md)
//
//   문서\공실스튜디오\
//     01 뉴스SNS발행\   매물\ 칼럼\ 시뮬레이션\
//     02 공실마케팅\    AI매물보고서\ AI인테리어\ AI리모델링\   (안에서 날짜별)
//     03 문서편집\      내템플릿\
//     04 이미지제작\    내템플릿\
//     05 동영상제작\    내템플릿\ 프로젝트\ (날짜 폴더 없이 파일만 — 이름 앞이 20261023, 대본\ 휴지통\ — 쓸 때)
//     06 완성영상\      20261023\
//     07 녹화파일\      녹화영상\20261023\ 녹음파일\ (캡쳐\ — 쓸 때)
//     08 AI생성물\      AI이미지\ AI영상\ AI보이스\              (안에서 날짜별)
//     09 받은자료\      무료영상\ 무료사진\ BGM\ 효과음\
//
// 예전 폴더(문서\공실뉴스 스튜디오 · 공실뉴스 이미지 · 공실뉴스 문서)의 파일은 아직 옮기지 않는다 —
// 내 자료·녹화·음악·내 템플릿 목록은 예전 폴더도 같이 본다.
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const docs = () => app.getPath("documents");
// 기본은 문서\공실스튜디오 — 회원이 [저장 위치]에서 D 드라이브·외장하드로 옮길 수 있다 (storage-place.js)
const root = () => require("./storage-place").root();

/** 번호 붙은 큰 폴더 이름 — 이름을 바꿀 때는 여기만 */
const F = {
  sns: "01 뉴스SNS발행",
  mkt: "02 공실마케팅",
  doc: "03 문서편집",
  img: "04 이미지제작",
  vid: "05 동영상제작",
  done: "06 완성영상",
  rec: "07 녹화파일",
  ai: "08 AI생성물",
  asset: "09 받은자료",
};
/** 큰 폴더(F 열쇠) 아래 경로 — 만들지는 않는다. 예: dir("ai", "AI이미지") */
const dir = (key, ...subs) => path.join(root(), F[key], ...subs);
/** 공실스튜디오 안의 폴더 (없으면 만든다) */
function sub(name) {
  const d = path.join(root(), name);
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
}
/* 예전 폴더 (읽기만) */
const oldRoot = () => path.join(docs(), "공실뉴스 스튜디오");
const oldImage = () => path.join(docs(), "공실뉴스 이미지");
const oldDoc = () => path.join(docs(), "공실뉴스 문서");

/** 앱을 켤 때 주요 폴더를 미리 만들어 둔다 (처음 열어도 전체 모양이 보이게). 대본·휴지통·캡쳐·매물·칼럼 등은 쓸 때 생긴다 */
const MAIN = [
  ["sns", "프로젝트"],
  ["mkt", "프로젝트"], ["mkt", "AI매물보고서"], ["mkt", "AI인테리어"], ["mkt", "AI리모델링"],
  ["doc", "내템플릿"],
  ["img", "내템플릿"],
  ["vid", "내템플릿"], ["vid", "프로젝트"],
  ["done"],
  ["rec", "녹화영상"], ["rec", "녹음파일"],
  ["ai", "AI이미지"], ["ai", "AI영상"], ["ai", "AI보이스"],
  ["asset", "무료영상"], ["asset", "무료사진"], ["asset", "BGM"], ["asset", "효과음"],
];
function ensureAll() {
  for (const [k, ...s] of MAIN) { try { fs.mkdirSync(dir(k, ...s), { recursive: true }); } catch {} }
}

module.exports = { root, sub, dir, F, oldRoot, oldImage, oldDoc, ensureAll };
