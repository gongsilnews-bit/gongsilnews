# AI 매물보고서 — 공실 등록 없이 만들기 (2026-10-23 사장님 회의)

## 정한 것
- 공실을 등록하지 않아도 AI 매물보고서를 만들 수 있다. **공실스터디 멤버십(유료) 회원만**. 스튜디오 앱 안에서만.
- 공유 링크는 없다. 대신 **PC에 저장**하고 다시 열어 고친다 (PDF·이미지·인쇄는 그대로).
- 시작하는 방법: **매물 글 붙여넣기**(문자·메모·다른 사이트 설명 → AI가 가격·면적·층 정리) · **사진 올리기** · **직접 입력**.
- 중개사 정보는 로그인한 회원 중개사무소 정보로 자동.
- 숨긴 임시 공실은 만들지 않는다 (공실 목록·지도·통계에 섞일 위험).

## 화면
공실마케팅 › AI 매물보고서
- 공실 고르는 칸 옆 **[+ 공실 없이 새로 만들기]** → 창: 매물 글 붙여넣기(선택) · 사진(선택, 7장까지) → [만들기]
- 공실 고르는 칸에 "공실 없이 만든 보고서" 묶음이 함께 나온다 (최근 것부터). 고르면 이어서 고친다. [삭제]
- 무료 회원이 누르면 "멤버십 전용" 안내 + 공실스터디(/study) 링크.

## 저장
- 보고서 내용(글·색·레이아웃·쪽·사진)은 앱 저장소 `userData\local-reports\<id>.json` 에 한 묶음으로.
  사진은 서버에 올리지 않고 그림 데이터(webp)로 같이 저장.
- [저장하기]·Ctrl+S → PC에 저장. 저장 안 한 고침은 이 PC 임시본으로 남아 다시 열 때 "이어서 할까요?"를 묻는다.
- PDF·이미지 내보내기는 `문서\공실뉴스 스튜디오\<20261023 매물 이름>\매물보고서\` 로.

## 만드는 곳
- 앱: `studio-app/src/report-local.js`(저장소·붙여넣기 정리), `marketing-writer.js`(공실 없는 보고서 AI 채우기), `out-folder.js`(폴더 이름), `main.js`·`preload.js`(`gongsilStudio.report`)
- 프롬프트: `marketing/shared/marketing-prompt.js` `gwBuildExtractPrompt`·`gwParseExtract` (서버 묶음 — 웹 배포 필요)
- 도구: `marketing/report/App.tsx` `?local=<id>` 모드 (빌드 → public/marketing/report)
- 화면: `src/components/admin/sections/StudioMarketingSection.tsx`
- 유료 확인: `/api/studio/usage` 의 `simAllowed`(= 멤버십) — 화면과 앱(AI 쓰기 전) 두 곳에서.

## 나중에
- 사진을 AI가 읽어 매물 정보 채우기 (지금은 사진은 보고서에 넣기만).
- 이 보고서로 공실 등록하기 단추 (정보 넘겨 주기).
