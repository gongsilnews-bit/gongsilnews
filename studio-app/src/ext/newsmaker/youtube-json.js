/* AI가 작성한 유튜브 장면 JSON 검증·정규화 */
(() => {
  "use strict";

  function extract(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    return first >= 0 && last > first ? text.slice(first, last + 1) : "";
  }

  function hasCompleteObject(raw) {
    const text = String(raw || "");
    const first = text.indexOf("{");
    if (first < 0) return false;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = first; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) return true;
      }
    }
    return false;
  }

  function repair(raw) {
    let output = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (inString) {
        if (escaped) {
          output += char;
          escaped = false;
        } else if (char === "\\") {
          output += char;
          escaped = true;
        } else if (char === '"') {
          output += char;
          inString = false;
        } else if (char === "\n" || char === "\r") {
          if (char === "\r" && raw[i + 1] === "\n") i += 1;
          output += "\\n";
        } else if (char === "\t") output += "\\t";
        else output += char;
        continue;
      }
      if (char === '"') {
        inString = true;
        output += char;
        continue;
      }
      if (char === ",") {
        let next = i + 1;
        while (next < raw.length && /\s/.test(raw[next])) next += 1;
        if (raw[next] === "}" || raw[next] === "]") continue;
      }
      output += char;
    }
    return output;
  }

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeScene(scene, index) {
    if (!scene || typeof scene !== "object") return null;
    const narration = cleanText(scene.narration || scene.script || scene.voiceover || scene.text);
    const heading = cleanText(scene.heading || scene.title || `장면 ${index + 1}`);
    const caption = cleanText(scene.caption || scene.subtitle || scene.onScreenText);
    const visualPrompt = cleanText(scene.visualPrompt || scene.imagePrompt || scene.visual || scene.screen);
    const visualType = cleanText(scene.visualType || scene.shotType || "auto");
    if (!narration) return null;
    return {
      sceneId: cleanText(scene.sceneId),
      heading,
      narration,
      caption,
      visualType,
      visualPrompt,
    };
  }

  function normalize(data) {
    if (!data || typeof data !== "object") return null;
    const title = cleanText(data.title || data.videoTitle);
    const description = cleanText(data.description || data.videoDescription);
    const rawScenes = Array.isArray(data.scenes) ? data.scenes : [];
    const scenes = rawScenes.map(normalizeScene).filter(Boolean);
    if (!title || !scenes.length) return null;
    return { title, description, scenes };
  }

  function parse(raw) {
    const candidate = extract(raw);
    if (!candidate) return { ok: false, reason: "AI 응답에서 JSON을 찾지 못했습니다." };
    let data;
    let repaired = false;
    try {
      data = JSON.parse(candidate);
    } catch (_strictError) {
      try {
        data = JSON.parse(repair(candidate));
        repaired = true;
      } catch (error) {
        return { ok: false, reason: `AI JSON 형식이 깨져 있습니다: ${error.message}` };
      }
    }
    const script = normalize(data);
    if (!script) return { ok: false, reason: "제목 또는 유효한 장면 대본이 없습니다." };
    return { ok: true, script, repaired };
  }

  /* 모양을 따지지 않고 JSON 객체만 꺼낸다 — 완성 대본·장면 설명처럼 형식이 다른 답변에 쓴다 */
  function parseObject(raw) {
    const candidate = extract(raw);
    if (!candidate) return { ok: false, reason: "AI 응답에서 JSON을 찾지 못했습니다." };
    try {
      return { ok: true, data: JSON.parse(candidate), repaired: false };
    } catch (_strictError) {
      try {
        return { ok: true, data: JSON.parse(repair(candidate)), repaired: true };
      } catch (error) {
        return { ok: false, reason: `AI JSON 형식이 깨져 있습니다: ${error.message}` };
      }
    }
  }

  const api = { extract, hasCompleteObject, normalize, parse, parseObject };
  globalThis.GWYoutubeJson = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();

