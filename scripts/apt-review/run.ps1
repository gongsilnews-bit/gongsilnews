# 시세 지도 캡처 요청 자동 심사 — 윈도우 작업 스케줄러가 1시간마다 실행 (2026-11-02 사장님: A안, PC 의 클로드가 심사)
#  수동 실행: powershell -ExecutionPolicy Bypass -File scripts\apt-review\run.ps1
#  기록: scripts\apt-review\logs\날짜.log
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ((Get-Date -Format "yyyy-MM-dd") + ".log")

# 기다리는 요청이 없으면 클로드를 켜지 않는다 (사용량 아끼기)
$pending = node scripts/apt-review/review.mjs list 2>&1 | Out-String
if ($pending.Trim() -eq "[]") { Add-Content $log "$(Get-Date -Format HH:mm) 기다리는 요청 없음" -Encoding UTF8; exit 0 }

# 한글 지시문을 명령줄로 넘기면 Windows PowerShell 5.1 이 글자를 깨뜨린다 (2026-11-02) — 영문 한 줄로 파일을 읽게 한다
$prompt = "Read scripts/apt-review/prompt.md and follow every step in it exactly. Reply in Korean."
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Content $log "$(Get-Date -Format HH:mm) 심사 시작" -Encoding UTF8
# 쓸 수 있는 도구를 좁힌다 — 캡처 읽기(Read) · 결과 파일 쓰기(Write) · 이 도구 실행만
claude -p $prompt --allowedTools "Read" "Write" "Bash(node scripts/apt-review/review.mjs:*)" 2>&1 | Add-Content $log -Encoding UTF8
Add-Content $log "$(Get-Date -Format HH:mm) 끝" -Encoding UTF8
