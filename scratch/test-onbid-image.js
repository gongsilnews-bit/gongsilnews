// Use native Node.js fetch

async function testImageKinds() {
  const baseUrl = "https://www.onbid.co.kr/op/cm/syc/filemng/filemngprcs/FileMngPrcsController/dnldFile.do?atchFileLstNo=12242123&atchSn=1&hashCrpsNo=MCHGJPDIBBMOIBMGGCLHFGIAHOJHEJFIMAJNKGEILHONKOEGDPPFLABJADIGPEBP";
  
  const kinds = [
    "THNL_NM",    // Thumbnail
    "ORIG_NM",    // Original (standard naming opposite to THNL)
    "IMG_NM",     // Image
    "FILE_NM",    // File
    "DETAIL_NM",  // Detail
    "LARGE_NM",   // Large
    "REAL_NM",    // Real
    ""            // Omit completely
  ];

  for (const kind of kinds) {
    const url = kind ? `${baseUrl}&downloadImageKind=${kind}` : baseUrl;
    try {
      const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
      const size = res.headers.get("content-length");
      const type = res.headers.get("content-type");
      console.log(`* downloadImageKind="${kind}": Status=${res.status}, Size=${size} bytes, Type=${type}`);
    } catch (err) {
      console.error(`* Error for "${kind}":`, err.message);
    }
  }
}

testImageKinds();
