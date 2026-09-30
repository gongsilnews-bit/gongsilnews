/* ══════════════════════════════════════════════════════════════
   무료 체험 — 3번 블로그 작성 · 4번 유튜브 대본

   공실뉴스부동산·공실스터디부동산·최고관리자는 무제한.
   그 외 로그인 회원은 기능별로 매월 3번 (서버 /api/extension/trial 이 세고 막는다).
   1·2번 기사 작성은 누구나 무료라 여기서 다루지 않는다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* auth/me 응답 → 이 기능을 쓸 수 있는지
     unlimited: 유료 회원 · trial: { remaining, limit } (무료 회원) · canUse: 탭을 열어도 되는지 */
  /* 서버가 canRemodel 을 아직 모르면(배포 전) 기존 유료회원 권한(블로그·유튜브)으로 대신 판단한다.
     비즈니스회원은 새 서버가 배포돼야 열린다. */
  function canRemodelFrom(data) {
    if (data && typeof data.canRemodel === "boolean") return data.canRemodel;
    return Boolean(data && (data.canBlog || data.canYoutubeWriter));
  }

  function accessFrom(data, feature, origin) {
    /* 인테리어 작성기도 리모델링 작성기와 같은 유료회원 전용 — 기능과 상관없이 canRemodel 하나로 가르고, 무료 체험은 없다 */
    const can = canRemodelFrom(data);
    return {
      origin,
      unlimited: can,
      isLoggedIn: Boolean(data?.isLoggedIn),
      trial: null,
      canUse: can,
      name: data?.user?.name || "",
      planLabel: data?.user?.planLabel || "",
    };
  }

  /* (기사 작성기에서 가져온 원래 판정 — 쓰지 않는다) */
  function accessFromWriter(data, feature, origin) {
    const unlimited = Boolean(feature === "blog" ? data?.canBlog : data?.canYoutubeWriter);
    const isLoggedIn = Boolean(data?.isLoggedIn);
    const status = data?.trial?.[feature] || null;
    const trial = !unlimited && isLoggedIn && status
      ? { remaining: Number(status.remaining) || 0, limit: Number(status.limit) || 3 }
      : null;
    return {
      origin,
      unlimited,
      isLoggedIn,
      trial,
      canUse: unlimited || Boolean(trial),
      name: data?.user?.name || "",
      planLabel: data?.user?.planLabel || "",
    };
  }

  const exhausted = (access) => Boolean(access && !access.unlimited && access.trial && access.trial.remaining <= 0);

  /* 인테리어 작성기는 체험 횟수를 세지 않는다 — 유료회원만 여기까지 온다 */
  async function consume() {
    return { ok: true, unlimited: true };
  }

  /* (기사 작성기의 체험 차감 — 쓰지 않는다) */
  async function consumeWriter(origin, feature) {
    const response = await fetch(`${origin}/api/extension/trial`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    if (!data) return { ok: false, error: "무료 체험 횟수를 확인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요." };
    if (!data.success) return { ok: false, exhausted: Boolean(data.exhausted), error: data.error || "무료 체험을 쓸 수 없습니다." };
    return { ok: true, unlimited: Boolean(data.unlimited), remaining: data.remaining, limit: data.limit };
  }

  /* 남은 횟수 안내 — 유료 회원이면 숨긴다. 다 쓰면 가입 안내 카드로 바뀐다. */
  function render(box, access, featureName) {
    if (!box) return;
    if (!access || access.unlimited || !access.trial) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    const { remaining, limit } = access.trial;
    const origin = access.origin || "https://www.gongsilnews.com";
    box.classList.remove("hidden");
    if (remaining > 0) {
      box.className = "gw-trial";
      box.innerHTML =
        `<strong>🎁 이번 달 무료 체험 ${remaining}/${limit}회 남음</strong>` +
        `<small>${esc(featureName)}은(는) [작성]을 누를 때 1회로 셉니다. 수정·가져오기·전송은 세지 않습니다. ` +
        `공실뉴스부동산·공실스터디부동산 회원은 무제한입니다.</small>`;
      return;
    }
    box.className = "gw-trial is-exhausted";
    box.innerHTML =
      `<strong>🔒 이번 달 ${esc(featureName)} 무료 체험 ${limit}회를 모두 사용했습니다</strong>` +
      `<small>횟수 제한 없이 쓰려면 공실스터디부동산 회원이 되어 주세요. ` +
      `다음 달 1일에 무료 체험 ${limit}회가 다시 생깁니다. 이미 만든 글은 계속 고치고 보낼 수 있습니다.</small>` +
      `<div class="gw-trial-links">` +
      `<a href="${esc(origin)}/study" target="_blank" rel="noopener noreferrer">공실스터디부동산 알아보기</a>` +
      `</div>`;
  }

  globalThis.GWTrial = { accessFrom, canRemodelFrom, exhausted, consume, render, accessFromWriter, consumeWriter };
})();
