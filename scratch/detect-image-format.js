// Use native Node.js fetch to read magic bytes of the image
async function detectImageFormat() {
  const url = "https://www.onbid.co.kr/op/cm/syc/filemng/filemngprcs/FileMngPrcsController/dnldFile.do?atchFileLstNo=12242123&atchSn=1&hashCrpsNo=MCHGJPDIBBMOIBMGGCLHFGIAHOJHEJFIMAJNKGEILHONKOEGDPPFLABJADIGPEBP&downloadImageKind=ORIG_NM";
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    
    // Convert to hex
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    console.log(`💎 Hex Magic Bytes: ${hex}`);

    // Detect format
    if (hex.startsWith("FF D8 FF")) {
      console.log("👉 Detected Format: JPEG (JPG)");
    } else if (hex.startsWith("89 50 4E 47")) {
      console.log("👉 Detected Format: PNG");
    } else if (hex.startsWith("52 49 46 46") && hex.includes("57 45 42 50")) {
      console.log("👉 Detected Format: WebP");
    } else if (hex.startsWith("47 49 46 38")) {
      console.log("👉 Detected Format: GIF");
    } else {
      console.log("👉 Detected Format: Unknown Binary");
    }
  } catch (err) {
    console.error("❌ Error detecting format:", err.message);
  }
}

detectImageFormat();
