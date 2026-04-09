export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 
        💡 공실열람 및 맵 기반 전체화면 전용 레이아웃 
        - 공용 Header와 Footer가 의도적으로 제외되어 있습니다.
      */}
      {children}
    </>
  );
}
