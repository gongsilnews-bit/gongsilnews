// 앱 화면(connect.html, ai.html)과 공실뉴스 사이트에만 좁게 열어 둔다
// 앱 창은 다른 사이트로 넘어가지 않지만(외부 링크는 평소 브라우저), 혹시 모를 경우를 막는다.
const { contextBridge, ipcRenderer } = require("electron");

const baseOrigin = ipcRenderer.sendSync("studio:base-origin");
const allowed = location.protocol === "file:" || location.origin === baseOrigin;

if (allowed) {
  contextBridge.exposeInMainWorld("gongsilStudio", {
    openConnect: () => ipcRenderer.invoke("studio:open-connect"),
    info: () => ipcRenderer.invoke("studio:info"),
    checkUpdate: () => ipcRenderer.invoke("studio:check-update"), // 새 버전 받기 → 준비되면 [지금 다시 시작]
    openAiConnect: () => ipcRenderer.invoke("studio:open-ai-window"),
    openInBrowser: (url) => ipcRenderer.invoke("studio:open-external", url),
    // 누르는 순간부터 덮개 — 준비 단계(캡쳐 등)를 덮개에 보여 주기
    busy: {
      hold: (text, sub) => ipcRenderer.invoke("studio:busy-hold", text, sub),
      text: (text, sub) => ipcRenderer.invoke("studio:busy-text", text, sub),
      release: () => ipcRenderer.invoke("studio:busy-release"),
    },
    // 공실마케팅 저장 위치 — 보기 · 바꾸기(옮기고 다시 켜기) · 폴더 열기
    storage: {
      get: () => ipcRenderer.invoke("studio:storage-get"),
      choose: () => ipcRenderer.invoke("studio:storage-choose"),
      open: () => ipcRenderer.invoke("studio:storage-open"),
    },
    vacancy: {
      analyze: (vacancyId) => ipcRenderer.invoke("studio:vacancy-analyze", vacancyId),
      load: (vacancyId) => ipcRenderer.invoke("studio:vacancy-load", vacancyId),
      list: () => ipcRenderer.invoke("studio:vacancy-list"), // [공실 바꾸기] 목록
      captures: (vacancyId) => ipcRenderer.invoke("studio:vacancy-captures", vacancyId), // AI 매물보고서 [공실뉴스 캡처 사진 넣기]
      media: (vacancyId, op) => ipcRenderer.invoke("studio:vacancy-media", vacancyId, op), // 분석 사진 정리 — 빼기·되살리기·순서·AI 이미지 (2026-10-28)
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:vacancy-progress", h);
        return () => ipcRenderer.removeListener("studio:vacancy-progress", h);
      },
    },
    // 홍보현황 — 도우미가 잡은 발행 글 주소를 서버에 저장했을 때 (2026-10-27)
    promo: {
      onSaved: (fn) => {
        const h = (_e, info) => fn(info);
        ipcRenderer.on("studio:promo-saved", h);
        return () => ipcRenderer.removeListener("studio:promo-saved", h);
      },
      // [링크체크]을 누르면 — 도우미 확장에게 인스타·페북 지운 글 확인을 바로 부탁 (2026-10-29)
      verifyNow: (urls) => ipcRenderer.invoke("studio:promo-verify-now", urls),
    },
    sns: {
      channels: () => ipcRenderer.invoke("studio:sns-channels"),
      get: (vacancyId) => ipcRenderer.invoke("studio:sns-get", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:sns-write", opts),
      // 한 번에 모두 쓰기 — 기사·블로그·SNS 를 AI 한 번에 (진행 글은 blog.onProgress)
      writeAll: (opts) => ipcRenderer.invoke("studio:all-write", opts),
      save: (opts) => ipcRenderer.invoke("studio:sns-save", opts),
      revise: (opts) => ipcRenderer.invoke("studio:sns-revise", opts),
      exportChannel: (opts) => ipcRenderer.invoke("studio:sns-export", opts),
      // 평소 크롬 + 공실마케팅 도우미 확장으로 그 채널에 사진·글 넣기 (2026-10-23)
      fillByHelper: (opts) => ipcRenderer.invoke("studio:sns-helper-fill", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:sns-progress", h);
        return () => ipcRenderer.removeListener("studio:sns-progress", h);
      },
    },
    // 작업 파일(.gsn·.gsm) — [저장하기] · [불러오기] · 저장 상태 · 폴더 열기 (2026-10-23)
    work: {
      save: (id) => ipcRenderer.invoke("studio:work-save", id),
      saveAs: (id) => ipcRenderer.invoke("studio:work-save-as", id),
      status: (id) => ipcRenderer.invoke("studio:work-status", id),
      show: (file) => ipcRenderer.invoke("studio:work-show", file),
      open: () => ipcRenderer.invoke("studio:work-open"),
    },
    naver: {
      designs: () => ipcRenderer.invoke("studio:naver-designs"),
      fill: (opts) => ipcRenderer.invoke("studio:naver-fill", opts),
      openMyBlog: () => ipcRenderer.invoke("studio:naver-open-blog"),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:naver-progress", h);
        return () => ipcRenderer.removeListener("studio:naver-progress", h);
      },
    },
    article: {
      options: (vacancyId) => ipcRenderer.invoke("studio:article-options", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:article-write", opts),
      exportDraft: (vacancyId) => ipcRenderer.invoke("studio:article-export", vacancyId),
    },
    blog: {
      styles: (vacancyId) => ipcRenderer.invoke("studio:blog-styles", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:blog-write", opts),
      get: (vacancyId, doc) => ipcRenderer.invoke("studio:blog-get", vacancyId, doc),
      save: (patch) => ipcRenderer.invoke("studio:blog-save", patch),
      revise: (opts) => ipcRenderer.invoke("studio:blog-revise", opts),
      addPhoto: (opts) => ipcRenderer.invoke("studio:blog-add-photo", opts),
      imageStyles: (vacancyId) => ipcRenderer.invoke("studio:blog-image-styles", vacancyId),
      makeImage: (opts) => ipcRenderer.invoke("studio:blog-make-image", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:blog-progress", h);
        return () => ipcRenderer.removeListener("studio:blog-progress", h);
      },
    },
    marketing: {
      fill: (opts) => ipcRenderer.invoke("studio:marketing-fill", opts),
      /** 그림·PDF 를 문서\공실마케팅\01 뉴스SNS발행·02 공실마케팅 … (out-folder.js) 에 저장하고 탐색기로 보여 준다 */
      saveFile: (opts) => ipcRenderer.invoke("studio:save-file", opts),
      openFolder: () => ipcRenderer.invoke("studio:open-out-folder"),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:marketing-progress", h);
        return () => ipcRenderer.removeListener("studio:marketing-progress", h);
      },
    },
    // 공실 없이 만드는 AI 매물보고서 — PC 저장 (2026-10-23, 멤버십 전용). 진행 글은 marketing.onProgress 로
    report: {
      create: (opts) => ipcRenderer.invoke("studio:report-create", opts),
      get: (id) => ipcRenderer.invoke("studio:report-get", id),
      list: () => ipcRenderer.invoke("studio:report-list"),
      save: (opts) => ipcRenderer.invoke("studio:report-save", opts),
      remove: (id) => ipcRenderer.invoke("studio:report-remove", id),
    },
    sim: {
      options: (kind) => ipcRenderer.invoke("studio:sim-options", kind),
      estimate: (kind, costBase, design) => ipcRenderer.invoke("studio:sim-estimate", kind, costBase, design),
      create: (kind) => ipcRenderer.invoke("studio:sim-create", kind),
      get: (id) => ipcRenderer.invoke("studio:sim-get", id),
      list: (kind) => ipcRenderer.invoke("studio:sim-list", kind),
      useVacancy: (opts) => ipcRenderer.invoke("studio:sim-use-vacancy", opts),
      addPhotos: (opts) => ipcRenderer.invoke("studio:sim-add-photos", opts),
      update: (opts) => ipcRenderer.invoke("studio:sim-update", opts),
      run: (id) => ipcRenderer.invoke("studio:sim-run", id),
      exportResult: (opts) => ipcRenderer.invoke("studio:sim-export", opts),
      // 공실마케팅 예측 보고서 (2026-10-22)
      reportMedia: (id) => ipcRenderer.invoke("studio:sim-report-media", id),
      saveReport: (opts) => ipcRenderer.invoke("studio:sim-report-save", opts),
      reportText: (id) => ipcRenderer.invoke("studio:sim-report-text", id),
      projCreate: (kind) => ipcRenderer.invoke("studio:sim-proj-create", kind),
      projGet: (id) => ipcRenderer.invoke("studio:sim-proj-get", id),
      projList: (kind) => ipcRenderer.invoke("studio:sim-proj-list", kind),
      projSave: (opts) => ipcRenderer.invoke("studio:sim-proj-save", opts),
      projAddSpace: (opts) => ipcRenderer.invoke("studio:sim-proj-add-space", opts),
      projText: (id) => ipcRenderer.invoke("studio:sim-proj-text", id),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:sim-progress", h);
        return () => ipcRenderer.removeListener("studio:sim-progress", h);
      },
    },
    youtube: {
      options: (vacancyId) => ipcRenderer.invoke("studio:youtube-options", vacancyId),
      get: (vacancyId) => ipcRenderer.invoke("studio:youtube-get", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:youtube-write", opts),
      revise: (opts) => ipcRenderer.invoke("studio:youtube-revise", opts),
      save: (opts) => ipcRenderer.invoke("studio:youtube-save", opts),
      exportText: (vacancyId) => ipcRenderer.invoke("studio:youtube-export", vacancyId),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:youtube-progress", h);
        return () => ipcRenderer.removeListener("studio:youtube-progress", h);
      },
    },
    column: {
      fetchNews: (url) => ipcRenderer.invoke("studio:column-fetch-news", url),
      openNews: () => ipcRenderer.invoke("studio:column-open-news"),
      openUrl: (url) => ipcRenderer.invoke("studio:column-open-url", url),
      grabNews: () => ipcRenderer.invoke("studio:column-grab-news"),
      create: (source) => ipcRenderer.invoke("studio:column-create", source),
      get: (id) => ipcRenderer.invoke("studio:column-get", id),
      setUrl: (id, url) => ipcRenderer.invoke("studio:column-set-url", id, url), // 내 기사 칼럼의 기사 주소 바꾸기 (2026-10-31)
      refetch: (id) => ipcRenderer.invoke("studio:column-refetch", id), // [다시 가져오기]
      list: (limit) => ipcRenderer.invoke("studio:column-list", limit), // limit 없으면 최근 8개
      media: (id, op) => ipcRenderer.invoke("studio:column-media", id, op), // 기사 화면 정리 — 빼기·순서·AI 이미지·내 사진 (2026-10-28)
    },
    /* 화면캡처·녹화 (2026-10-24) — 스튜디오 창을 내리고 오른쪽 막대. 찍은 그림을 [이미지제작에서 열기]하면 onPhoto(파일) */
    snap: {
      open: () => ipcRenderer.invoke("snap:open"),
      onPhoto: (fn) => {
        const h = (_e, file) => fn(file);
        ipcRenderer.on("snap:photo", h);
        return () => ipcRenderer.removeListener("snap:photo", h);
      },
    },
    /* 영상 편집기 (동영상제작) — PC 파일은 studio-media:// 주소로 바로 재생 */
    video: {
      lib: {
        list: (opts) => ipcRenderer.invoke("video:lib-list", opts),
        pick: (opts) => ipcRenderer.invoke("video:lib-pick", opts),
        /** 다운로드 폴더에서 since(ms) 이후 받은 소리 파일 · 그 파일들을 내 음악에 넣기 (0.1.11부터) */
        downloadsAudio: (since) => ipcRenderer.invoke("video:lib-downloads-audio", since),
        addDownloads: (files, source) => ipcRenderer.invoke("video:lib-add-downloads", files, source),
        fav: (id, fav) => ipcRenderer.invoke("video:lib-fav", id, fav),
        // 내 폴더 (이름표 — 원본 파일은 그대로)
        tags: () => ipcRenderer.invoke("video:lib-tags"),
        tagAdd: (name) => ipcRenderer.invoke("video:lib-tag-add", name),
        tagRename: (id, name) => ipcRenderer.invoke("video:lib-tag-rename", id, name),
        tagRemove: (id) => ipcRenderer.invoke("video:lib-tag-remove", id),
        tagSet: (ids, tag, on) => ipcRenderer.invoke("video:lib-tag-set", ids, tag, on),
        remove: (id) => ipcRenderer.invoke("video:lib-remove", id),
        folders: () => ipcRenderer.invoke("video:lib-folders"),
        addFolder: () => ipcRenderer.invoke("video:lib-add-folder"),
        removeFolder: (dir) => ipcRenderer.invoke("video:lib-remove-folder", dir),
        musicFolder: () => ipcRenderer.invoke("video:lib-music-folder"),
        aiFolder: () => ipcRenderer.invoke("video:lib-ai-folder"), // AI 그림 모음 폴더 (0.1.11부터)
        saveImage: (dir, dataUrl, name) => ipcRenderer.invoke("video:lib-save-image", dir, dataUrl, name), // 스티커 (0.1.10부터)
      },
      project: {
        create: (opts) => ipcRenderer.invoke("video:project-create", opts),
        open: (dir, choice) => ipcRenderer.invoke("video:project-open", dir, choice), // choice: "work" 이어서 / "file" 마지막 저장
        openPick: () => ipcRenderer.invoke("video:project-open-pick"),
        // 가져오기 — 캡컷 · 클로드(AI) 설계도 (0.1.15부터)
        importList: () => ipcRenderer.invoke("video:import-list"),
        importAny: (target) => ipcRenderer.invoke("video:import", target),
        importPick: () => ipcRenderer.invoke("video:import-pick"),
        importOpenInbox: () => ipcRenderer.invoke("video:import-open-inbox"),
        importGuide: () => ipcRenderer.invoke("video:import-guide"),
        importText: (text) => ipcRenderer.invoke("video:import-text", text), // 설계도 붙여넣기
        motionRender: (o) => ipcRenderer.invoke("video:motion-render", o), // 모션그래픽 틀 굽기 (0.1.15부터)
        motionOptions: (vacancyId) => ipcRenderer.invoke("video:motion-options", vacancyId),
        motionPreview: (o) => ipcRenderer.invoke("video:motion-preview", o),
        motionPickBg: () => ipcRenderer.invoke("video:motion-pick-bg"),
        motionScene: (o) => ipcRenderer.invoke("video:motion-scene", o), // 장면에 모션 입히기
        aiDesignVacancies: () => ipcRenderer.invoke("video:ai-design-vacancies"),
        aiDesign: (o) => ipcRenderer.invoke("video:ai-design", o), // 연결된 AI 에게 영상 설계 맡기기
        save: (p) => ipcRenderer.invoke("video:project-save", p),
        flush: (p) => ipcRenderer.invoke("video:project-flush", p), // [저장] — .gss 로 묶기
        defaultDir: () => ipcRenderer.invoke("video:project-dir"), // 새 프로젝트 기본 폴더 (0.1.11부터)
        discard: (p) => ipcRenderer.invoke("video:project-discard", p), // [저장 안 함]
        setDirty: (v, dir, file) => ipcRenderer.invoke("video:set-dirty", v, dir, file),
        backup: (p) => ipcRenderer.invoke("video:backup", p), // 자동 저장본 (5분마다)
        backups: (p) => ipcRenderer.invoke("video:backups", p),
        closeNow: () => ipcRenderer.invoke("video:close-now"),
        onWantClose: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:want-close", h);
          return () => ipcRenderer.removeListener("video:want-close", h);
        },
        convert: (p) => ipcRenderer.invoke("video:project-convert", p), // 예전 폴더 → .gss
        packageInfo: (p) => ipcRenderer.invoke("video:package-info", p),
        makePackage: (p) => ipcRenderer.invoke("video:package-make", p), // 프로젝트 패키지 (원본을 한 폴더에)
        relink: (p, assetId) => ipcRenderer.invoke("video:relink", p, assetId), // 없어진 원본 다시 연결
        pendingFile: () => ipcRenderer.invoke("video:pending-file"),
        onOpenFile: (fn) => {
          const h = (_e, f) => fn(f);
          ipcRenderer.on("video:open-file", h);
          return () => ipcRenderer.removeListener("video:open-file", h);
        },
        saveAs: (p, name, parent) => ipcRenderer.invoke("video:project-save-as", p, name, parent),
        pickFolder: (title, defaultPath) => ipcRenderer.invoke("video:pick-folder", title, defaultPath),
        recent: () => ipcRenderer.invoke("video:project-recent"),
        folders: () => ipcRenderer.invoke("video:folders-get"), // 저장 폴더 설정
        setFolders: (patch) => ipcRenderer.invoke("video:folders-set", patch),
        rename: (dir, name) => ipcRenderer.invoke("video:project-rename", dir, name), // 이름만 바꾸기 (폴더는 그대로)
        trash: (dir) => ipcRenderer.invoke("video:trash", dir), // 휴지통으로 옮기기
        trashList: () => ipcRenderer.invoke("video:trash-list"),
        restore: (id) => ipcRenderer.invoke("video:trash-restore", id),
        purge: (id) => ipcRenderer.invoke("video:trash-purge", id), // 영구 삭제 (id 또는 "all")
        addAsset: (libId) => ipcRenderer.invoke("video:project-add-asset", libId),
        exportText: (p, kind, outFile) => ipcRenderer.invoke("video:project-export-text", p, kind, outFile),
      },
      voice: (dir, text, voiceId, opts) => ipcRenderer.invoke("video:voice", dir, text, voiceId, opts), // opts.fresh = 다시 만들기 (0.1.10부터)
      // 성우 요청이 몰려 기다리는 중 — { who, sec } (sec 0 = 다시 만드는 중). 끄는 함수를 돌려준다 (2026-10-31)
      onVoiceWait: (fn) => {
        const h = (_e, d) => fn(d);
        ipcRenderer.on("studio:voice-wait", h);
        return () => ipcRenderer.removeListener("studio:voice-wait", h);
      },
      // 타입캐스트 성우 — 회원 자기 키 (키는 이 PC 에만, 0.1.11부터)
      typecast: {
        status: () => ipcRenderer.invoke("video:tc-status"),
        setKey: (k) => ipcRenderer.invoke("video:tc-set-key", k),
        clear: () => ipcRenderer.invoke("video:tc-clear"),
        voices: (refresh) => ipcRenderer.invoke("video:tc-voices", refresh),
      },
      // 일레븐랩스 성우 — 회원 자기 키 (0.1.11부터)
      eleven: {
        status: () => ipcRenderer.invoke("video:el-status"),
        setKey: (k) => ipcRenderer.invoke("video:el-set-key", k),
        clear: () => ipcRenderer.invoke("video:el-clear"),
        voices: (refresh) => ipcRenderer.invoke("video:el-voices", refresh),
        addPopular: (n) => ipcRenderer.invoke("video:el-add-popular", n), // 인기 한국어 성우 넣기 (2026-10-30)
        ranked: (refresh) => ipcRenderer.invoke("video:el-ranked", refresh), // 한국어 인기 순위 50
        addRanked: (ids) => ipcRenderer.invoke("video:el-add-ranked", ids),
        sample: (voiceId, emotion, text) => ipcRenderer.invoke("video:el-sample", voiceId, emotion, text), // 세부 설정 들어 보기 (2026-10-20)
      },
      sttWords: { add: (pairs) => ipcRenderer.invoke("video:stt-words-add", pairs) }, // 받아쓰기 낱말장 (0.1.10부터)
      myVoice: {
        // 내 목소리 성우 (0.1.10부터) — PC 에서 무료로 내 목소리 읽기
        status: () => ipcRenderer.invoke("video:myvoice-status"),
        install: () => ipcRenderer.invoke("video:myvoice-install"),
        record: (bytes, text) => ipcRenderer.invoke("video:myvoice-record", bytes, text),
        file: () => ipcRenderer.invoke("video:myvoice-file"),
        sample: () => ipcRenderer.invoke("video:myvoice-sample"),
        remove: () => ipcRenderer.invoke("video:myvoice-remove"),
        update: (patch) => ipcRenderer.invoke("video:myvoice-update", patch), // 이름·녹음한 글자 고치기
        onProgress: (fn) => {
          const h = (_e, t, f) => fn(t, f);
          ipcRenderer.on("video:myvoice-progress", h);
          return () => ipcRenderer.removeListener("video:myvoice-progress", h);
        },
      },
      voiceJoin: (dir, files) => ipcRenderer.invoke("video:voice-join", dir, files), // 단어마다 목소리가 다를 때 조각 잇기 (0.1.8부터)
      transcribe: (p, assetId) => ipcRenderer.invoke("video:transcribe", p, assetId),
      split: (p, assetId) => ipcRenderer.invoke("video:split", p, assetId),
      speech: (p, assetIds) => ipcRenderer.invoke("video:speech", p, assetIds), // 무음 줄이기 — 실제 말소리 구간 (PC에서)
      peaks: (p, assetId) => ipcRenderer.invoke("video:peaks", p, assetId), // 상세 편집 — 소리 파형 (1초 100칸, 0.1.8부터)
      realign: (p, items) => ipcRenderer.invoke("video:realign", p, items), // 자막 시각 맞추기 — 글은 그대로, 시각만 (무료)
      transcribeClips: (p, targets) => ipcRenderer.invoke("video:transcribe-clips", p, targets), // 자동 자막 — 지금 클립에 글만 채우기
      ai: {
        script: (opts) => ipcRenderer.invoke("video:ai-script", opts),
        scenes: (lines, opts) => ipcRenderer.invoke("video:ai-scenes", lines, opts),
        shorts: (clips, opts) => ipcRenderer.invoke("video:ai-shorts", clips, opts),
        footage: (lines, items, opts) => ipcRenderer.invoke("video:ai-footage", lines, items, opts), // 대본 + 내 영상 → 문장마다 장면 (0.1.10부터)
        edit: (lines, items, opts) => ipcRenderer.invoke("video:ai-edit", lines, items, opts), // [AI 편집] 편집 계획 (0.1.10부터)
        group: (lines) => ipcRenderer.invoke("video:ai-group", lines), // [씬 정리] (0.1.10부터)
        image: (dir, prompt, opts) => ipcRenderer.invoke("video:ai-image", dir, prompt, opts),
        video: (dir, prompt, opts) => ipcRenderer.invoke("video:ai-video", dir, prompt, opts), // AI 영상 — 회원 Gemini API 키 (0.1.12부터)
        clipPrompts: (lines, opts) => ipcRenderer.invoke("video:ai-clip-prompts", lines, opts), // 이미지 + 동영상 프롬프트 한 번에 (0.1.12부터)
        imagePrompts: (lines, opts) => ipcRenderer.invoke("video:ai-image-prompts", lines, opts), // 클립별 AI 그림 영어 장면 설명 (0.1.11부터)
      },
      vacancy: (vacancyId) => ipcRenderer.invoke("video:vacancy", vacancyId),
      capturePage: (url, opts) => ipcRenderer.invoke("video:capture-page", url, opts), // 기사·보도자료 화면 캡쳐 (2026-10-20)
      stock: {
        search: (q, type, orientation, page) => ipcRenderer.invoke("video:stock-search", q, type, orientation, page),
        get: (dir, item) => ipcRenderer.invoke("video:stock-get", dir, item),
      },
      musicGet: (dir, rel) => ipcRenderer.invoke("video:music-get", dir, rel),
      musicUse: (dir, libId) => ipcRenderer.invoke("video:music-use", dir, libId),
      sfxUse: (dir, libId) => ipcRenderer.invoke("video:sfx-use", dir, libId),
      fonts: { ensure: (family) => ipcRenderer.invoke("video:font-ensure", family) },
      render: (p, opts) => ipcRenderer.invoke("video:render", p, opts),
      exportPick: (p, kind) => ipcRenderer.invoke("video:export-pick", p, kind), // 저장할 곳 고르기 (0.1.11부터)
      saveText: (name, text) => ipcRenderer.invoke("video:save-text", name, text), // 대본 텍스트로 내려받기 (2026-10-20)
      voiceSave: (texts, voiceId, opts) => ipcRenderer.invoke("video:voice-save", texts, voiceId, opts), // 목소리만 mp3·wav 로 (2026-10-20)
      animFrames: (dir, key, start, urls) => ipcRenderer.invoke("video:anim-frames", dir, key, start, urls), // 애니메이션 칸 그림 (0.1.10부터)
      features: ["kf", "adj", "trx"], // trx = 고급 화면전환 (2026-10-20) · 완성 영상에 그릴 수 있는 것 — 키프레임·화면 돌리기·진하기·초 단위 구간 / 색 보정·필터 (2026-10-20 키프레임 앱부터)
      renderCancel: (id) => ipcRenderer.invoke("video:render-cancel", id),
      exportAudio: (p, kind, opts) => ipcRenderer.invoke("video:export-audio", p, kind, opts),
      snapshot: (p, file, at) => ipcRenderer.invoke("video:snapshot", p, file, at),
      record: {
        sources: () => ipcRenderer.invoke("video:record-sources"),
        choose: (id) => ipcRenderer.invoke("video:record-choose", id),
        start: (name, opt) => ipcRenderer.invoke("video:record-start", name, opt),
        defaultDir: () => ipcRenderer.invoke("video:record-default-dir"),
        pickDir: (cur) => ipcRenderer.invoke("video:record-pick-dir", cur),
        chunk: (token, buf) => ipcRenderer.invoke("video:record-chunk", token, buf),
        stop: (token) => ipcRenderer.invoke("video:record-stop", token),
        // 녹화 중 작게 하기 — 큰 창은 내려가고 작은 막대(녹화에 안 찍힘)가 뜬다. 끝나면 다시 크게
        live: (on, startedAt, opt) => ipcRenderer.invoke("video:record-live", on, startedAt, opt),
        // 녹화 조정실 창 — drag-start·drag(dx, dy)·opacity(0.3~1)·min·max·show (0.1.8부터)
        console: (act, a, b, c, d, e) => ipcRenderer.invoke("video:console", act, a, b, c, d, e),
        // 녹화 중 스튜디오 창을 내렸다·올렸다 (작은 녹화 창을 띄우고 닫으려고)
        onMinimized: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:record-min", h);
          return () => ipcRenderer.removeListener("video:record-min", h);
        },
        tiny: () => ipcRenderer.invoke("video:record-tiny"), // [더 작게 하기] — 얇은 막대
        onTinyExpand: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:record-mini-expand", h);
          return () => ipcRenderer.removeListener("video:record-mini-expand", h);
        },
        onRestored: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:record-restore", h);
          return () => ipcRenderer.removeListener("video:record-restore", h);
        },
        minimize: () => ipcRenderer.invoke("video:record-minimize"),
        // 프롬프터 — 녹화하는 모니터 위쪽에 뜨는 대본 창 (녹화에 안 찍힘, 0.1.8부터)
        prompterOpen: (opts) => ipcRenderer.invoke("video:prompter-open", opts),
        prompterClose: () => ipcRenderer.invoke("video:prompter-close"),
        prompterShow: () => ipcRenderer.invoke("video:prompter-show"),
        // 판서(F9) · 마우스 강조 — prefs · set-prefs · try · toggle · state (2026-10-24)
        ink: (act, arg) => ipcRenderer.invoke("video:ink", act, arg),
        onPrompterClosed: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:prompter-closed", h);
          return () => ipcRenderer.removeListener("video:prompter-closed", h);
        },
        onPrompterPrefs: (fn) => {
          const h = (_e, o) => fn(o);
          ipcRenderer.on("video:prompter-prefs", h);
          return () => ipcRenderer.removeListener("video:prompter-prefs", h);
        },
        onMiniStop: (fn) => {
          const h = () => fn();
          ipcRenderer.on("video:record-mini-stop", h);
          return () => ipcRenderer.removeListener("video:record-mini-stop", h);
        },
      },
      showFile: (file) => ipcRenderer.invoke("video:show-file", file),
      // 완성 영상 SNS 올리기 — 반자동 (0.1.11부터)
      post: {
        draft: (o) => ipcRenderer.invoke("video:post-draft", o),
        thumbs: (o) => ipcRenderer.invoke("video:post-thumbs", o),
        fill: (o) => ipcRenderer.invoke("video:post-fill", o),
        login: (ch) => ipcRenderer.invoke("video:post-login", ch),
        finishLogin: () => ipcRenderer.invoke("video:post-finish-login"),
        open: (ch, what) => ipcRenderer.invoke("video:post-open", ch, what),
        urls: () => ipcRenderer.invoke("video:post-urls"),
        setUrl: (file, ch, url) => ipcRenderer.invoke("video:post-url-set", file, ch, url),
        check: (file) => ipcRenderer.invoke("video:post-check", file),
      },
      openSettings: (what) => ipcRenderer.invoke("video:open-settings", what), // 윈도우 카메라·마이크 권한 화면
      openDeviceSettings: (what) => ipcRenderer.invoke("video:open-device-settings", what), // 윈도우 카메라·마이크 장치 설정 (0.1.8부터)
      openPath: (p) => ipcRenderer.invoke("video:open-path", p),
      onProgress: (fn) => {
        const h = (_e, text, frac) => fn(text, frac);
        ipcRenderer.on("video:progress", h);
        return () => ipcRenderer.removeListener("video:progress", h);
      },
      onRender: (fn) => {
        const h = (_e, text, frac, x) => fn(text, frac, undefined, x);
        const j = (_e, id) => fn("", 0, id);
        ipcRenderer.on("video:render-progress", h);
        ipcRenderer.on("video:render-job", j);
        return () => {
          ipcRenderer.removeListener("video:render-progress", h);
          ipcRenderer.removeListener("video:render-job", j);
        };
      },
    },
    /* 이미지 편집 (포토랩) — PSD 는 편집 화면이 읽고 쓴다. 여기는 파일만 */
    /** 내 PC 글꼴 (윈도우에 설치된 글꼴 이름 목록 — 문서·이미지·영상 편집 글꼴 고르기) */
    fonts: {
      pcList: (refresh) => ipcRenderer.invoke("fonts:pc-list", refresh),
    },
    /** 문서편집 (워드·한글) — .docx·.hwpx 는 편집 화면이 읽고 쓴다. 여기는 파일 · PDF · 인쇄 · .hwp 변환(Java) · AI */
    doc: {
      open: () => ipcRenderer.invoke("doc:open"),
      read: (file) => ipcRenderer.invoke("doc:read", file),
      pickImages: () => ipcRenderer.invoke("doc:pick-images"),
      save: (opts) => ipcRenderer.invoke("doc:save", opts),
      recent: () => ipcRenderer.invoke("doc:recent"),
      recentRemove: (file) => ipcRenderer.invoke("doc:recent-remove", file),
      recentPin: (file, pinned) => ipcRenderer.invoke("doc:recent-pin", file, pinned),
      reveal: (file) => ipcRenderer.invoke("doc:reveal", file),
      openExternal: (file) => ipcRenderer.invoke("doc:open-external", file),
      info: (file) => ipcRenderer.invoke("doc:info", file),
      setDirty: (n) => ipcRenderer.invoke("doc:set-dirty", n),
      autosaveWrite: (o) => ipcRenderer.invoke("doc:autosave-write", o),
      autosaveList: () => ipcRenderer.invoke("doc:autosave-list"),
      autosaveRead: (id) => ipcRenderer.invoke("doc:autosave-read", id),
      autosaveClear: (id) => ipcRenderer.invoke("doc:autosave-clear", id),
      pdf: (o) => ipcRenderer.invoke("doc:pdf", o),
      printers: () => ipcRenderer.invoke("doc:printers"),
      print: (o) => ipcRenderer.invoke("doc:print", o),
      libAdd: (o) => ipcRenderer.invoke("doc:lib-add", o),
      ai: (o) => ipcRenderer.invoke("doc:ai", o),
      onAiProgress: (fn) => {
        const h = (_e, t) => fn(t);
        ipcRenderer.on("doc:ai-progress", h);
        return () => ipcRenderer.removeListener("doc:ai-progress", h);
      },
      javaStatus: () => ipcRenderer.invoke("doc:java-status"),
      javaInstall: () => ipcRenderer.invoke("doc:java-install"),
      javaRemove: () => ipcRenderer.invoke("doc:java-remove"),
      onJavaProgress: (fn) => {
        const h = (_e, t, f) => fn(t, f);
        ipcRenderer.on("doc:java-progress", h);
        return () => ipcRenderer.removeListener("doc:java-progress", h);
      },
    },
    photo: {
      open: (opts) => ipcRenderer.invoke("photo:open", opts),
      read: (file) => ipcRenderer.invoke("photo:read", file),
      save: (opts) => ipcRenderer.invoke("photo:save", opts),
      recent: () => ipcRenderer.invoke("photo:recent"),
      recentRemove: (file) => ipcRenderer.invoke("photo:recent-remove", file),
      recentThumb: (file, thumb) => ipcRenderer.invoke("photo:recent-thumb", file, thumb),
      reveal: (file) => ipcRenderer.invoke("photo:reveal", file),
      setDirty: (n) => ipcRenderer.invoke("photo:set-dirty", n),
      autosaveWrite: (o) => ipcRenderer.invoke("photo:autosave-write", o),
      autosaveList: () => ipcRenderer.invoke("photo:autosave-list"),
      autosaveRead: (id) => ipcRenderer.invoke("photo:autosave-read", id),
      autosaveClear: (id) => ipcRenderer.invoke("photo:autosave-clear", id),
      tplList: () => ipcRenderer.invoke("photo:tpl-list"),
      tplWrite: (o) => ipcRenderer.invoke("photo:tpl-write", o),
      tplRead: (file) => ipcRenderer.invoke("photo:tpl-read", file),
      tplRemove: (file) => ipcRenderer.invoke("photo:tpl-remove", file),
      readFile: (file) => ipcRenderer.invoke("photo:read-file", file),
      aiDesign: (o) => ipcRenderer.invoke("photo:ai-design", o),
      /** 인쇄 — 프린터 목록 · 용지 한 장 그림(PNG bytes, 용지 mm)을 프린터로 (dialog = 윈도우 인쇄 창) */
      /** AI 요청바 — 보낼 그림을 임시 파일로 → { path } */
      tempWrite: (o) => ipcRenderer.invoke("photo:temp-write", o),
      /** AI 요청바 — 글자 레이어 글을 요청대로 고치기 → { text } */
      aiText: (o) => ipcRenderer.invoke("photo:ai-text", o),
      printers: () => ipcRenderer.invoke("photo:printers"),
      print: (o) => ipcRenderer.invoke("photo:print", o),
    },
    ai: {
      list: () => ipcRenderer.invoke("studio:ai-list"),
      // 쓰는 순서 — free(무료 먼저) · paid(유료 먼저) · freeOnly(무료만)
      getOrder: () => ipcRenderer.invoke("studio:ai-get-order"),
      setOrder: (o) => ipcRenderer.invoke("studio:ai-set-order", o),
      // 내 계정 쓰는 방법 — manual(수동, 처음 값) · auto(자동)
      getMethod: () => ipcRenderer.invoke("studio:ai-get-method"),
      setMethod: (m) => ipcRenderer.invoke("studio:ai-set-method", m),
      connect: (id) => ipcRenderer.invoke("studio:ai-connect", id),
      check: (id) => ipcRenderer.invoke("studio:ai-check", id),
      finishLogin: () => ipcRenderer.invoke("studio:ai-finish-login"),
      /** [창 열기] 스튜디오 전용 크롬을 그 AI 사이트로 */
      open: (id) => ipcRenderer.invoke("studio:ai-open", id),
      /** 기본 글쓰기 AI 고르기 (chatgpt | gemini) */
      setWriter: (id) => ipcRenderer.invoke("studio:ai-set-writer", id),
      /** 지금 새 글을 쓸 AI { id, name } */
      writer: () => ipcRenderer.invoke("studio:ai-writer"),
      /** 기본 이미지 생성 AI 고르기 (chatgpt | gemini) · 지금 그림을 그릴 AI { id, name } */
      setImager: (id) => ipcRenderer.invoke("studio:ai-set-imager", id),
      imager: () => ipcRenderer.invoke("studio:ai-imager"),
      /** 쓰는 방법 "account" | "api" · API 키 등록(확인 뒤 저장)·다시 확인·지우기 — 키는 이 PC 에만 (0.1.11부터) */
      setMode: (id, mode) => ipcRenderer.invoke("studio:ai-set-mode", id, mode),
      setKey: (id, key) => ipcRenderer.invoke("studio:ai-set-key", id, key),
      testKey: (id) => ipcRenderer.invoke("studio:ai-test-key", id),
      clearKey: (id) => ipcRenderer.invoke("studio:ai-clear-key", id),
      /** API 사용 내역 — 달 요약 · 한도(USD, 0 = 끔) · CSV 저장 (0.1.12부터) */
      usage: (month) => ipcRenderer.invoke("studio:ai-usage", month),
      usageLimit: (v) => ipcRenderer.invoke("studio:ai-usage-limit", v),
      usageCsv: (month) => ipcRenderer.invoke("studio:ai-usage-csv", month),
      onWriterChanged: (fn) => {
        const h = () => fn();
        ipcRenderer.on("studio:ai-writer-changed", h);
        return () => ipcRenderer.removeListener("studio:ai-writer-changed", h);
      },
      onProgress: (fn) => ipcRenderer.on("studio:ai-progress", (_e, text) => fn(text)),
    },
  });
}
