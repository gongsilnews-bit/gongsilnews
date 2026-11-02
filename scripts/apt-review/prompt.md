공실열람 시세 지도의 "단지 정보 캡처 요청"을 심사해서 반영해 줘. 사람에게 묻지 말고 끝까지 혼자 처리한다.

1. `node scripts/apt-review/review.mjs list` 를 실행한다. 빈 목록 `[]` 이면 "처리할 요청 없음" 한 줄만 말하고 끝낸다.
2. 요청마다 images 의 PNG 를 Read 로 열어 직접 읽는다. 부동산이 네이버 등 단지정보 화면을 캡처한 것이다.
3. 캡처가 **그 단지** 것인지 먼저 본다 (단지 이름·주소가 complex 와 같아야). 다른 단지면 reject.
4. 캡처에 **글자로 또렷하게 보이는 값만** 고른다. 흐리거나 잘리거나 짐작해야 하면 넣지 않는다. 지어내지 않는다.
   - 단지 전체: households(세대수, 숫자만) · dongs(동수) · topFloor(최고층, 가장 높은 동) · parking(주차 대수) · useAprDay(사용승인일 YYYYMMDD) · vlRat(용적률 %) · bcRat(건폐율 %) · heating(난방, 예 "지역난방 / 열병합") · builder(건설사) · evChargers(전기차 충전 대수)
   - 전용면적별: contract(계약면적 ㎡, 오피스텔) · rooms(방/욕실 "3/2"). ex_area 에는 캡처의 전용면적을 넣는다 — real_areas 에 있는 면적이어야 한다.
   - hall(계단식·복도식)은 단지 전체가 하나일 때만. 면적 하나의 현관구조면 넣지 않는다.
   - 공급면적은 넣지 않는다 (건축물대장 계산을 쓴다). 실거래 가격·관리비·공시가격·매물 수는 넣지 않는다.
5. now(지금 값)와 같은 값은 넣지 않는다. 지금 값과 **다르면** 캡처가 또렷할 때만 넣고 reason 에 "지금 ○○ → 캡처 ○○"를 적는다. 차이가 크고 이상하면(세대수 두 배 등) pending.
6. request_text(부동산 요청 글)도 읽는다. 캡처로 확인되는 요청만 반영한다.
7. 결과를 JSON 파일로 저장하고 `node scripts/apt-review/review.mjs apply <파일>` 로 반영한다. 파일은 OS 임시 폴더에 둔다.
   `[{ "id": 19, "decision": "approve", "reason": "캡처 3장 확인 · 아크로힐스논현 맞음", "values": [{ "field": "dongs", "value": 4 }, { "field": "rooms", "ex_area": 84.07, "value": "3/2" }] }]`
   - 캡처 값이 모두 지금 값과 같으면 decision "approve", values 는 비워 두고 reason "캡처 확인 · 이미 반영된 값과 같음".
   - 다른 단지 캡처이거나 읽을 수 있는 단지 정보가 없으면 decision "reject" 와 이유.
   - 판단이 어려우면 "pending" 과 이유 — 사장님이 관리자 화면에서 본다.
8. 마지막에 처리한 요청마다 한 줄씩 한국어로 결과를 적는다.
