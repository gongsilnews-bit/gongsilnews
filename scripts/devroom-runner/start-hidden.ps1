# AI 개발실 Runner 를 창 없이 켠다 — Windows 시작 프로그램에서 부른다.
# 이미 켜져 있으면 다시 켜지 않는다 (둘이 같은 작업을 동시에 가져가지 않게).
# 기록은 scripts/devroom-runner/.work/runner.log

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$running = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*devroom-runner*runner.mjs*' }
if ($running) { exit 0 }

Start-Process -FilePath "node" -ArgumentList "scripts/devroom-runner/runner.mjs" `
  -WorkingDirectory $repo -WindowStyle Hidden
