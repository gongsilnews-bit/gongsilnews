// 문서편집 — 글 ↔ 편집기: 마크다운(AI 답) → HTML · 일반 텍스트 → HTML · 문서 → 텍스트/웹 페이지
import { esc } from "./model";

const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');

/** 마크다운 (제목 # · 목록 - / 1. · 표 | · 인용 > · 굵게 **) → HTML */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let h = "";
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { const lv = Math.min(4, m[1].length); h += `<h${lv}>${inline(m[2])}</h${lv}>`; i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { h += "<hr>"; i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      h += `<table>${rows.map((r, ri) => `<tr>${r.map((c) => (ri === 0 ? `<th><p>${inline(c)}</p></th>` : `<td><p>${inline(c)}</p></td>`)).join("")}</tr>`).join("")}</table>`;
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]/.test(l);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && /^\s*\d+[.)]/.test(lines[i]) === ordered) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      h += `<${ordered ? "ol" : "ul"}>${items.map((t) => `<li><p>${inline(t)}</p></li>`).join("")}</${ordered ? "ol" : "ul"}>`;
      continue;
    }
    if (/^\s*>/.test(l)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      h += `<blockquote>${q.map((t) => `<p>${inline(t)}</p>`).join("")}</blockquote>`;
      continue;
    }
    h += `<p>${inline(l)}</p>`;
    i++;
  }
  return h || "<p></p>";
}

/** 일반 텍스트 → 줄마다 문단 */
export const textToHtml = (t: string) => t.replace(/\r/g, "").split("\n").map((l) => `<p>${esc(l) || ""}</p>`).join("");

/** 웹 페이지 HTML 에서 본문만 */
export function htmlBody(html: string): string {
  const d = new DOMParser().parseFromString(html, "text/html");
  d.querySelectorAll("script,style,link,meta,noscript,iframe").forEach((e) => e.remove());
  return d.body ? d.body.innerHTML : html;
}

/** 웹 페이지로 저장 — 편집기 HTML 을 종이 너비로 */
export function docHtmlFile(title: string, bodyHtml: string, font: string, widthMm: number) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;background:#f3f3f3}main{max-width:${widthMm}mm;margin:24px auto;background:#fff;padding:25mm;box-sizing:border-box;font-family:'${font}',sans-serif;font-size:11pt;line-height:1.6;color:#000}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:4px 6px;vertical-align:top}img{max-width:100%}p{margin:0}h1,h2,h3,h4{margin:0 0 6pt}</style></head>
<body><main>${bodyHtml}</main></body></html>`;
}
