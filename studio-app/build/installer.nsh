; 공실스튜디오 설치 프로그램에 더하는 것 (electron-builder nsis.include) — 2026-10-23 사장님
; PSD: 포토샵이 없는 회원이 많다 → 기본 프로그램이 없는 PC 에서만 PSD 를 공실스튜디오(이미지제작)로 연다.
;      포토샵이 있으면 그대로 두고, 오른쪽 클릭 › 연결 프로그램 목록에만 공실스튜디오를 넣는다.
;      앱은 실행 인자의 .psd 를 받아 이미지제작에서 연다 (src/main.js findPsd / openPsd).

!macro customInstall
  WriteRegStr HKCU "Software\Classes\GongsilStudio.psd" "" "포토샵 파일 (공실마케팅studio 포토studio)"
  WriteRegStr HKCU "Software\Classes\GongsilStudio.psd\DefaultIcon" "" "$INSTDIR\resources\psd.ico"
  WriteRegStr HKCU "Software\Classes\GongsilStudio.psd\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  ; 연결 프로그램 목록에는 늘
  WriteRegStr HKCU "Software\Classes\.psd\OpenWithProgids" "GongsilStudio.psd" ""
  WriteRegStr HKCU "Software\Classes\.psb\OpenWithProgids" "GongsilStudio.psd" ""
  ; 기본 프로그램은 PSD 를 여는 프로그램이 하나도 없을 때만 (HKCR = 이 PC 전체 + 이 사용자)
  ReadRegStr $0 HKCR ".psd" ""
  ${If} $0 == ""
    WriteRegStr HKCU "Software\Classes\.psd" "" "GongsilStudio.psd"
  ${EndIf}
  ; 이름을 "공실마케팅studio" 로 바꿨다 (2026-10-30) — 예전 이름의 바로가기가 남아 두 개가 되지 않게 지운다
  Delete "$DESKTOP\공실마케팅.lnk"
  Delete "$SMPROGRAMS\공실마케팅.lnk"
  Delete "$DESKTOP\공실마케팅App.lnk"
  Delete "$SMPROGRAMS\공실마케팅App.lnk"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\GongsilStudio.psd"
  DeleteRegValue HKCU "Software\Classes\.psd\OpenWithProgids" "GongsilStudio.psd"
  DeleteRegValue HKCU "Software\Classes\.psb\OpenWithProgids" "GongsilStudio.psd"
  ReadRegStr $0 HKCU "Software\Classes\.psd" ""
  ${If} $0 == "GongsilStudio.psd"
    DeleteRegValue HKCU "Software\Classes\.psd" ""
  ${EndIf}
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
