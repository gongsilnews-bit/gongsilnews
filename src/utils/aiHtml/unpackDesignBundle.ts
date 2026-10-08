// 클로드 디자인에서 내려받은 "묶음 페이지(Bundled Page)" HTML을 일반 HTML로 푼다. (브라우저 전용)
//  - 실제 화면 HTML은 <script type="__bundler/template">, 사진·글꼴·스크립트는 __bundler/manifest 에
//    고유번호(uuid)로 들어 있고, 열 때 스크립트가 조립한다 → 스크립트 없이 보이도록 미리 조립해 둔다
//  - 글꼴(대부분 Pretendard, 20MB 이상)은 버리고 CDN 글꼴로 대신한다
//  - <image-slot> 사진 칸 → <img>, {{ 값 }} 자리 → 디자인 스크립트에 적힌 값, style-hover → :hover CSS

type Asset = { mime: string; compressed?: boolean; data: string };

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function isDesignBundle(html: string): boolean {
  return html.includes('type="__bundler/manifest"') && html.includes('type="__bundler/template"');
}

function readBlock(html: string, type: string): string | null {
  const open = `<script type="__bundler/${type}">`;
  const start = html.indexOf(open);
  if (start < 0) return null;
  const end = html.indexOf("</script>", start + open.length);
  return end < 0 ? null : html.slice(start + open.length, end);
}

async function gunzipBase64(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function assetText(a: Asset): Promise<string> {
  const b64 = a.compressed ? await gunzipBase64(a.data) : a.data;
  return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(attrs);
  return m ? (m[2] ?? m[3] ?? "") : null;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function unpackDesignBundle(html: string): Promise<string> {
  const manifest: Record<string, Asset> = JSON.parse(readBlock(html, "manifest") || "{}");
  let page: string = JSON.parse(readBlock(html, "template") || '""');
  if (!page) throw new Error("묶음 파일 안에서 화면 HTML을 찾지 못했습니다.");

  // 1) 스크립트 자산 살펴보기: 아이콘(Phosphor) 불러오기 스크립트면 아이콘 CSS 링크로 바꾼다
  const links: string[] = [];
  for (const m of page.matchAll(/<script\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>\s*<\/script>/gi)) {
    const a = manifest[m[1]];
    if (!a || !/javascript/.test(a.mime)) continue;
    const code = await assetText(a).catch(() => "");
    const ph = /unpkg\.com\/@phosphor-icons\/web@([\d.]+)/.exec(code);
    if (ph) {
      const weights = new Set(["regular"]);
      for (const w of ["thin", "light", "bold", "fill", "duotone"]) if (new RegExp(`\\bph-${w}\\b`).test(page)) weights.add(w);
      for (const w of weights) links.push(`https://unpkg.com/@phosphor-icons/web@${ph[1]}/src/${w}/style.css`);
    }
  }
  page = page.replace(/<script\b[^>]*\bsrc\s*=\s*"[0-9a-f-]{36}"[^>]*>\s*<\/script>/gi, "");

  // 2) 글꼴은 버린다 (@font-face 안의 글꼴 자산). Pretendard면 CDN 글꼴을 붙인다
  page = page.replace(/@font-face\s*\{[^}]*\}/gi, block => {
    const ids = block.match(UUID) || [];
    return ids.some(id => manifest[id] && /font/.test(manifest[id].mime)) ? "" : block;
  });
  if (/pretendard/i.test(page)) links.push("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");

  // 3) <image-slot> 사진 칸 → <img>
  page = page.replace(/<image-slot\b([^>]*)>(?:\s*<\/image-slot>)?/gi, (_, attrs: string) => {
    const src = attr(attrs, "src");
    const alt = attr(attrs, "placeholder") || "";
    const shape = attr(attrs, "shape") || "rounded";
    const radius = shape === "circle" ? "50%" : shape === "pill" ? "9999px" : shape === "rect" ? "0" : `${Number(attr(attrs, "radius") || 12)}px`;
    const mask = attr(attrs, "mask");
    const own = attr(attrs, "style") || "";
    const style = `display:block;width:100%;height:100%;object-fit:${attr(attrs, "fit") === "contain" ? "contain" : "cover"};border-radius:${radius};${mask ? `clip-path:${mask};` : ""}${own}`;
    if (!src) return `<div style="${escAttr(style)}background:#e5e7eb;"></div>`;
    return `<img src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" style="${escAttr(style)}">`;
  });

  // 4) 사진 자산 고유번호 → data:image (이후 단계에서 압축·업로드되어 주소로 바뀐다)
  const ids = new Set(page.match(UUID) || []);
  for (const id of ids) {
    const a = manifest[id];
    if (!a || !a.mime.startsWith("image/")) continue;
    const b64 = a.compressed ? await gunzipBase64(a.data) : a.data;
    page = page.split(id).join(`data:${a.mime};base64,${b64}`);
  }

  // 5) {{ 값 }} 자리: 디자인 스크립트(renderVals)에 적힌 글자 값으로. 조건(?:)이면 PC 쪽 값
  const dcScript = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/i.exec(page)?.[1] || "";
  page = page.replace(/\{\{\s*([\w$]+)\s*\}\}/g, (_, name: string) => {
    const tern = new RegExp(`\\b${name}\\s*:[^,}]*?\\?\\s*(['"\`])(.*?)\\1\\s*:\\s*(['"\`])(.*?)\\3`).exec(dcScript);
    if (tern) return tern[4];
    const lit = new RegExp(`\\b${name}\\s*:\\s*(['"\`])(.*?)\\1`).exec(dcScript);
    return lit ? lit[2] : "";
  });

  // 6) style-hover="..." → 클래스 + :hover CSS
  const hoverCss: string[] = [];
  let n = 0;
  page = page.replace(/<([a-z][\w-]*)\b([^>]*?)\sstyle-hover\s*=\s*"([^"]*)"([^>]*)>/gi, (_, tag: string, a: string, hover: string, b: string) => {
    const cls = `dc-hover-${++n}`;
    hoverCss.push(`.${cls}:hover{${hover.replace(/;?\s*$/, "").split(";").map(d => d.trim() && `${d.trim()} !important`).filter(Boolean).join(";")}}`);
    const rest = `${a}${b}`;
    const withClass = /\sclass\s*=\s*"/i.test(rest) ? rest.replace(/\sclass\s*=\s*"/i, ` class="${cls} `) : `${rest} class="${cls}"`;
    return `<${tag}${withClass}>`;
  });

  // 7) 화면 HTML 앞(head)에 글꼴·아이콘 링크와 hover CSS를 붙인다
  const head = [...new Set(links)].map(h => `<link rel="stylesheet" href="${escAttr(h)}">`).join("\n")
    + (hoverCss.length ? `\n<style>${hoverCss.join("\n")}</style>` : "");
  page = /<head[^>]*>/i.test(page) ? page.replace(/<head[^>]*>/i, m => `${m}\n${head}`) : head + page;
  return page;
}
