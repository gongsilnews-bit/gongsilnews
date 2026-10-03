/* ══════════════════════════════════════════════════════════════
   영상 넣기 칸 — SNS(sns.js). 블로그 영상 넣기는 뺐다 (10월 03일 회의: 네이버 편집기 자동 조작을 늘리지 않는다)

   - 유튜브 주소: 페이스북·스레드는 글 끝에 "▶ 영상으로 보기"로 붙인다
   - 내 PC 영상 파일: 파일 이름만 기억한다. 영상 파일은 사용자가 각 사이트에 직접 올린다
     (메타는 자동 업로드 시 계정 제한 위험)
   - video = { youtubeUrl, fileName, ai } — ai: AI 로 만든 영상(SNS AI 레이블 안내용)
   ══════════════════════════════════════════════════════════════ */
function gwEmptyVideo() {
  return { youtubeUrl: "", fileName: "", ai: false };
}

function gwHasVideo(video) {
  return Boolean(video && (video.youtubeUrl || video.fileName));
}

/* ids: { url, fileBtn, file, info, ai? } · getVideo() · setVideo(next) · opts: { fileNote, toast } */
function gwBindVideoCard(ids, getVideo, setVideo, opts) {
  const $ = (id) => document.getElementById(id);
  const urlInput = $(ids.url);
  const fileButton = $(ids.fileBtn);
  const fileInput = $(ids.file);
  const info = $(ids.info);
  const aiBox = ids.ai ? $(ids.ai) : null;
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function render() {
    const video = getVideo() || gwEmptyVideo();
    urlInput.value = video.youtubeUrl || "";
    if (aiBox) aiBox.checked = Boolean(video.ai);
    const rows = [];
    if (video.youtubeUrl) {
      rows.push(`<div class="video-info-row">▶ 유튜브 <a href="${esc(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer">${esc(video.youtubeUrl)}</a></div>`);
    }
    if (video.fileName) {
      rows.push(`<div class="video-info-row">📁 <b>${esc(video.fileName)}</b> — ${esc(opts.fileNote)}</div>`);
    }
    info.innerHTML = rows.join("") +
      (rows.length ? '<button type="button" class="sns-mini" data-video-clear="1">영상 빼기</button>' : "");
    info.classList.toggle("hidden", !rows.length);
  }

  urlInput.addEventListener("change", () => {
    const raw = urlInput.value.trim();
    const url = GWNaverBlog.youtubeUrl(raw);
    if (raw && !url) {
      opts.toast("유튜브 주소만 넣을 수 있습니다 (youtube.com/watch · youtube.com/shorts · youtu.be).", "bad", 7000);
      urlInput.value = getVideo()?.youtubeUrl || "";
      return;
    }
    setVideo({ ...(getVideo() || gwEmptyVideo()), youtubeUrl: url });
    render();
  });

  fileButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    setVideo({ ...(getVideo() || gwEmptyVideo()), fileName: file.name });
    render();
  });

  aiBox?.addEventListener("change", () => {
    setVideo({ ...(getVideo() || gwEmptyVideo()), ai: aiBox.checked });
  });

  info.addEventListener("click", (event) => {
    if (!event.target.closest("[data-video-clear]")) return;
    setVideo(gwEmptyVideo());
    render();
  });

  return { render };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gwEmptyVideo, gwHasVideo };
}
