// 한글(.hwp) 변환기 gongsil-hwp.jar 만들기 (2026-10-22)
//  node studio-app/hwp-tool/build.mjs
//  1) .build/ 에 JDK 21(빌드용) · hwplib · hwpxlib · hwp2hwpx 원본을 받는다 (이미 있으면 건너뜀)
//  2) hwp2hwpx + src/kr/gongsil/hwp/*.java 를 컴파일하고, 라이브러리까지 한 jar 로 묶는다 → gongsil-hwp.jar
//  라이선스: hwplib · hwpxlib · hwp2hwpx = Apache-2.0 (NOTICE.txt). 앱은 회원 PC 에 JRE 만 받는다 (src/doc/java.js)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(here, ".build");
const HWPLIB = "1.1.10", HWPXLIB = "1.0.9"; // hwp2hwpx pom.xml 과 같게
fs.mkdirSync(B, { recursive: true });

async function get(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  console.log("받는 중", url);
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
// 윈도우 기본 tar(bsdtar)는 zip 도 푼다 — Git 의 GNU tar 는 "C:" 를 원격 주소로 읽어 쓰지 않는다
const TAR = process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
const unzip = (zip, dir) => { fs.mkdirSync(dir, { recursive: true }); execFileSync(TAR, ["-xf", zip, "-C", dir], { stdio: "inherit" }); };

const jdkZip = path.join(B, "jdk.zip"), jdkDir = path.join(B, "jdk");
await get("https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk", jdkZip);
if (!fs.existsSync(jdkDir)) unzip(jdkZip, jdkDir);
const jdkHome = path.join(jdkDir, fs.readdirSync(jdkDir)[0]);
const bin = (n) => path.join(jdkHome, "bin", process.platform === "win32" ? `${n}.exe` : n);

const lib = path.join(B, "lib");
fs.mkdirSync(lib, { recursive: true });
const hwplibJar = path.join(lib, `hwplib-${HWPLIB}.jar`), hwpxlibJar = path.join(lib, `hwpxlib-${HWPXLIB}.jar`);
await get(`https://repo1.maven.org/maven2/kr/dogfoot/hwplib/${HWPLIB}/hwplib-${HWPLIB}.jar`, hwplibJar);
await get(`https://repo1.maven.org/maven2/kr/dogfoot/hwpxlib/${HWPXLIB}/hwpxlib-${HWPXLIB}.jar`, hwpxlibJar);
const h2xZip = path.join(B, "hwp2hwpx.zip"), h2xDir = path.join(B, "h2x");
await get("https://codeload.github.com/neolord0/hwp2hwpx/zip/refs/heads/main", h2xZip);
if (!fs.existsSync(h2xDir)) unzip(h2xZip, h2xDir);

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".java") ? [path.join(d, e.name)] : []));
const srcs = [...walk(path.join(h2xDir, fs.readdirSync(h2xDir)[0], "src", "main", "java")), ...walk(path.join(here, "src"))];
const classes = path.join(B, "classes");
fs.rmSync(classes, { recursive: true, force: true });
fs.mkdirSync(classes, { recursive: true });
const list = path.join(B, "sources.txt");
fs.writeFileSync(list, srcs.map((s) => `"${s.replace(/\\/g, "/")}"`).join("\n"));
console.log(`컴파일 ${srcs.length}개 파일`);
execFileSync(bin("javac"), ["-encoding", "UTF-8", "--release", "17", "-nowarn", "-cp", [hwplibJar, hwpxlibJar].join(path.delimiter), "-d", classes, `@${list}`], { stdio: "inherit" });
for (const j of [hwplibJar, hwpxlibJar]) execFileSync(TAR, ["-xf", j, "-C", classes, "--exclude", "META-INF/*"], { stdio: "inherit" });
fs.mkdirSync(path.join(classes, "META-INF"), { recursive: true });
fs.copyFileSync(path.join(here, "NOTICE.txt"), path.join(classes, "META-INF", "NOTICE.txt"));
const manifest = path.join(B, "manifest.txt");
fs.writeFileSync(manifest, "Main-Class: kr.gongsil.hwp.Main\n");
const out = path.join(here, "gongsil-hwp.jar");
execFileSync(bin("jar"), ["cfm", out, manifest, "-C", classes, "."], { stdio: "inherit" });
console.log("만듦:", out, `${Math.round(fs.statSync(out).size / 1024)}KB`);
execFileSync(bin("java"), ["-jar", out, "version"], { stdio: "inherit" });
