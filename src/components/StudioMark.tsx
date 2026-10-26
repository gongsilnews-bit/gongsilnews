/**
 * 이름표·admin 버튼 옆 공실스튜디오 마크 — 공실스튜디오 멤버십 이용 중 (2026-10-26 사장님).
 * 글자 [Studio] 대신 공실스튜디오 앱 아이콘 (2026-10-26 사장님 "studio 대신 로고").
 * 등급(공실뉴스부동산·비즈니스회원)과 따로 붙는다. 이용 중인지는 permissionCheck isStudioMember.
 */
export default function StudioMark({ small = false }: { small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/studio-app-icon.png"
      alt="공실스튜디오"
      title="공실스튜디오 멤버십 이용 중"
      width={size}
      height={size}
      style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4, width: size, height: size, borderRadius: Math.round(size * 0.22), flexShrink: 0 }}
    />
  );
}
