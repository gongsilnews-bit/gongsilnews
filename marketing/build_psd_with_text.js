// psd_layers/manifest.json 을 읽어 이미지 레이어는 픽셀 레이어로,
// 텍스트 항목은 포토샵에서 더블클릭 편집 가능한 네이티브 텍스트 레이어로 조립한다.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { writePsdBuffer } = require("ag-psd");

const LAYER_DIR = path.join(__dirname, "psd_layers");
const manifest = JSON.parse(fs.readFileSync(path.join(LAYER_DIR, "manifest.json"), "utf-8"));

function loadPng(file) {
  const buf = fs.readFileSync(path.join(LAYER_DIR, file));
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

const FONT = "MalgunGothic";

function toTextLayer(item) {
  const lines = item.text.split("\n");
  const text = lines.join("\r");
  const [r, g, b] = item.color;

  let styleRuns;
  if (item.name === "헤드라인 텍스트") {
    // "AI로 완성하는 " 는 흰색, "매출형"만 하늘색 강조
    const line1 = lines[0];
    const idx = line1.indexOf("매출형");
    styleRuns = [
      { length: idx, style: { fillColor: { r: 255, g: 255, b: 255 } } },
      { length: 3, style: { fillColor: { r: 127, g: 215, b: 255 } } },
      { length: text.length - idx - 3, style: { fillColor: { r: 255, g: 255, b: 255 } } },
    ];
  }

  return {
    name: item.name,
    text: {
      text,
      transform: [1, 0, 0, 1, item.left, item.top + item.size],
      style: { font: { name: FONT }, fontSize: item.size, fillColor: { r, g, b } },
      ...(styleRuns ? { styleRuns } : {}),
      paragraphStyle: { justification: item.align === "center" ? "center" : "left" },
    },
  };
}

function toImageLayer(item) {
  const { width, height, data } = loadPng(item.file);
  return {
    name: item.name,
    top: item.top,
    left: item.left,
    imageData: { width, height, data },
  };
}

function buildGroup(name) {
  const items = manifest.layers.filter((l) => l.group === name);
  // manifest에 추가된 순서(배경이 먼저)를 그대로 사용하면 배경이 맨 위로 올라가므로 역순으로 뒤집는다.
  const children = items.map((item) => (item.type === "text" ? toTextLayer(item) : toImageLayer(item))).reverse();
  return { name, opened: true, children };
}

const psd = {
  width: manifest.width,
  height: manifest.height,
  children: [buildGroup("커리큘럼 섹션"), buildGroup("히어로 섹션")],
};

const buffer = writePsdBuffer(psd, { invalidateTextLayers: true });
fs.writeFileSync(path.join(__dirname, "ai-realestate-lecture-detail.psd"), buffer);
console.log("Saved PSD with native text layers.");
