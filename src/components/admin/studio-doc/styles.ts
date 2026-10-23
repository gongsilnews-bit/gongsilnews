// 문서편집 — 화면 꾸밈 (워드 365 모양: 파란 제목 줄 · 밝은 리본 · 회색 바탕 위 종이)
export const DOC_CSS = `
.gsd-root{--blue:#185abd;--blue2:#2b579a;--blueL:#dbe7f8;--line:#d6d6d6;--rb:#f8f8f8;display:flex;flex-direction:column;height:100%;min-height:0;background:#fff;color:#252423;font-family:'Segoe UI','맑은 고딕','Malgun Gothic',sans-serif;font-size:12px;position:relative;user-select:none}
.gsd-root *{box-sizing:border-box}
.gsd-root button{font-family:inherit}
/* 제목 줄 */
.gsd-title{height:40px;flex-shrink:0;background:var(--blue);color:#fff;display:flex;align-items:center;gap:4px;padding:0 10px}
.gsd-title button{background:transparent;border:0;color:#fff;height:30px;min-width:30px;border-radius:3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.gsd-title button:hover:not(:disabled){background:rgba(255,255,255,.15)}
.gsd-title button:disabled{opacity:.45;cursor:default}
.gsd-auto{display:flex;align-items:center;gap:6px;font-size:12px;padding:0 6px;cursor:pointer}
.gsd-toggle{width:34px;height:16px;border-radius:9px;border:1.5px solid #fff;position:relative;display:inline-block}
.gsd-toggle::after{content:"";position:absolute;top:2px;left:2px;width:9px;height:9px;border-radius:50%;background:#fff;transition:left .15s}
.gsd-toggle.on{background:#fff}.gsd-toggle.on::after{left:19px;background:var(--blue)}
.gsd-title-name{flex:1;text-align:center;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;padding:0 10px}
.gsd-title-name input{background:#fff;color:#222;border:0;border-radius:3px;padding:3px 6px;font:inherit;width:260px;text-align:center}
.gsd-search{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.92);color:#444;border-radius:4px;height:28px;width:min(360px,28vw);padding:0 10px;position:relative}
.gsd-search input{border:0;background:transparent;outline:0;flex:1;font:inherit;color:#222;min-width:0}
.gsd-search-pop{position:absolute;top:32px;left:0;right:0;background:#fff;color:#222;border:1px solid var(--line);box-shadow:0 6px 18px rgba(0,0,0,.18);border-radius:4px;z-index:60;padding:4px 0}
.gsd-dirty{font-size:11px;opacity:.85}
/* 탭 줄 · 리본 */
.gsd-tabs{display:flex;align-items:flex-end;gap:2px;background:var(--rb);padding:2px 8px 0;flex-shrink:0;border-bottom:0}
.gsd-tab{background:transparent;border:0;padding:7px 11px 8px;font-size:13px;color:#252423;cursor:pointer;position:relative;border-radius:4px 4px 0 0}
.gsd-tab:hover{background:#ececec}
.gsd-tab.on{font-weight:600;color:var(--blue)}
.gsd-tab.on::after{content:"";position:absolute;left:10px;right:10px;bottom:2px;height:3px;border-radius:2px;background:var(--blue)}
.gsd-tab.file{color:var(--blue)}
.gsd-tab.ctx{color:#7a3e9d}.gsd-tab.ctx.on::after{background:#7a3e9d}
.gsd-tab.ai{color:#7c3aed}.gsd-tab.ai.on::after{background:#7c3aed}
.gsd-tab-right{margin-left:auto;display:flex;gap:4px;align-items:center;padding-bottom:4px}
.gsd-tab-right button{border:1px solid var(--line);background:#fff;border-radius:4px;padding:3px 10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.gsd-ribbon{display:flex;align-items:stretch;background:var(--rb);border-bottom:1px solid var(--line);min-height:96px;padding:2px 6px 0;flex-shrink:0;overflow-x:auto;overflow-y:hidden}
.gsd-ribbon.collapsed{display:none}
.gsd-grp{display:flex;flex-direction:column;padding:2px 6px 0;border-right:1px solid #e1e1e1;flex-shrink:0}
.gsd-grp-body{flex:1;display:flex;align-items:flex-start;gap:2px;padding-top:2px}
.gsd-grp-label{font-size:11px;color:#605e5c;text-align:center;padding:2px 0 3px;position:relative;white-space:nowrap}
.gsd-launch{position:absolute;right:-4px;bottom:1px;border:0;background:transparent;font-size:11px;color:#605e5c;cursor:pointer;padding:0 2px;line-height:1}
.gsd-launch:hover{background:#e5e5e5}
.gsd-col{display:flex;flex-direction:column}
.gsd-row{display:flex;align-items:center}
.gsd-vsep{width:1px;height:18px;background:#d8d8d8;margin:0 3px}
.gsd-big{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;min-width:46px;max-width:76px;height:70px;padding:4px 4px 2px;border:1px solid transparent;border-radius:3px;background:transparent;cursor:pointer;color:#252423}
.gsd-big:hover:not(:disabled),.gsd-big.on{background:#e6e6e6}
.gsd-big.on{background:var(--blueL);border-color:#b7cdee}
.gsd-big:disabled{opacity:.4;cursor:default}
.gsd-big-ic{height:32px;display:flex;align-items:center;justify-content:center}
.gsd-big-lb{font-size:11.5px;line-height:1.2;text-align:center;white-space:normal;word-break:keep-all}
.gsd-big.split{padding:0;gap:0;flex-direction:column}
.gsd-big.split:hover{background:transparent}
.gsd-big-top,.gsd-big-bot{border:1px solid transparent;background:transparent;cursor:pointer;width:100%;border-radius:3px;color:#252423}
.gsd-big-top{height:40px;display:flex;align-items:center;justify-content:center}
.gsd-big-bot{font-size:11.5px;flex:1;line-height:1.15;padding:0 2px}
.gsd-big-top:hover,.gsd-big-bot:hover{background:#e6e6e6;border-color:#d0d0d0}
.gsd-sm{display:inline-flex;align-items:center;gap:4px;height:24px;min-width:24px;padding:0 4px;border:1px solid transparent;border-radius:3px;background:transparent;cursor:pointer;color:#252423;font-size:12px;white-space:nowrap}
.gsd-sm:hover:not(:disabled){background:#e6e6e6}
.gsd-sm.on,.gsd-split.on .gsd-sm:first-child{background:#c8daf5;border-color:#a9c4ec}
.gsd-sm:disabled{opacity:.4;cursor:default}
.gsd-sm-ic{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;position:relative}
.gsd-colorbar{display:block;width:16px;height:4px;margin-top:1px}
.gsd-split{display:inline-flex;align-items:center;border-radius:3px}
.gsd-split:hover{box-shadow:inset 0 0 0 1px #d0d0d0}
.gsd-arrow{min-width:12px!important;padding:0 1px!important}
.gsd-aa{font-weight:600;font-size:14px;font-family:'Segoe UI',sans-serif}.gsd-aa.small{font-size:11px}.gsd-aa sup{font-size:7px}
.gsd-pop-wrap{position:relative;display:inline-flex}
.gsd-pop{position:absolute;top:100%;left:0;margin-top:2px;background:#fff;border:1px solid #c8c8c8;box-shadow:0 8px 24px rgba(0,0,0,.18);border-radius:4px;z-index:80;min-width:180px;padding:4px 0;max-height:70vh;overflow:auto;color:#252423}
.gsd-item{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:6px 14px 6px 8px;font-size:12.5px;cursor:pointer;text-align:left;color:#252423}
.gsd-item:hover:not(:disabled){background:#eaeaea}
.gsd-item.on{background:#dbe7f8}
.gsd-item:disabled{opacity:.45}
.gsd-item-ic{width:20px;display:inline-flex;justify-content:center;color:#444;flex-shrink:0}
.gsd-item-lb{flex:1;line-height:1.35}
.gsd-item-hint{color:#888;font-size:11px}
.gsd-menu-sep{height:1px;background:#e1e1e1;margin:4px 0}
.gsd-menu-head{font-size:11.5px;font-weight:700;color:#444;padding:6px 12px 4px;background:transparent}
.gsd-colors{padding:4px 8px 6px;width:230px}
.gsd-sw{width:17px;height:17px;border:1px solid rgba(0,0,0,.15);padding:0;cursor:pointer;border-radius:0}
.gsd-sw:hover{outline:2px solid #f29436;outline-offset:0;z-index:1;position:relative}
.gsd-sw.big{width:22px;height:22px}
.gsd-sw-row{display:grid;grid-template-columns:repeat(10,17px);gap:4px;padding:2px 4px}
.gsd-sw-grid{display:grid;grid-template-columns:repeat(10,17px);gap:0 4px;padding:0 4px 2px}
.gsd-combo{position:relative;display:flex;height:24px;border:1px solid #c8c8c8;border-radius:3px;background:#fff}
.gsd-combo:hover{border-color:#999}
.gsd-combo input{border:0;outline:0;flex:1;min-width:0;padding:0 4px;font:inherit;font-size:12px;background:transparent}
.gsd-combo>button{border:0;background:transparent;width:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.gsd-combo-list{max-height:360px}
.gsd-spin{display:flex;align-items:center;gap:6px;font-size:12px}
.gsd-spin-lb{min-width:42px}
.gsd-spin-box{display:flex;border:1px solid #c8c8c8;border-radius:3px;background:#fff;height:22px}
.gsd-spin-box input{border:0;outline:0;flex:1;min-width:0;font:inherit;font-size:12px;padding:0 4px;background:transparent}
.gsd-spin-arrows{display:flex;flex-direction:column;border-left:1px solid #e0e0e0}
.gsd-spin-arrows button{border:0;background:transparent;font-size:7px;height:10px;width:14px;cursor:pointer;padding:0;line-height:1}
.gsd-spin-arrows button:hover{background:#e6e6e6}
.gsd-gallery{display:grid;grid-auto-flow:column;gap:2px;align-items:stretch;max-width:560px;overflow-x:auto;border:1px solid #e1e1e1;background:#fff;padding:2px;border-radius:3px}
.gsd-style{width:64px;height:64px;border:1px solid transparent;background:#fff;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;padding:6px 3px 3px;border-radius:2px;overflow:hidden}
.gsd-style:hover{border-color:#c8c8c8;background:#f3f3f3}
.gsd-style.on{border-color:#7fa4dc;background:#e5eefb}
.gsd-style-pv{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:clip;text-align:left}
.gsd-style-nm{font-size:11px;color:#444;text-align:center}
.gsd-theme{width:62px;height:66px;border:1px solid #ddd;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;padding:4px;gap:1px;border-radius:2px}
.gsd-theme:hover{border-color:#999}.gsd-theme.on{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}
.gsd-theme-h{font-size:12px;font-weight:700}.gsd-theme-b{font-size:9px;color:#555}.gsd-theme-l{display:block;height:2px;width:100%;background:repeating-linear-gradient(90deg,#ccc 0 6px,transparent 6px 8px);margin:3px 0}
.gsd-theme-nm{font-size:10px;color:#333;margin-top:auto}
.gsd-tstyle{width:52px;height:44px;border:1px solid #ddd;background:#fff;cursor:pointer;display:flex;flex-direction:column;padding:3px;gap:1px}
.gsd-tstyle span{flex:1;border:1px solid}
.gsd-tstyle:hover{border-color:#999}
.gsd-istyle{width:64px;height:54px;border:1px solid #ddd;background:#fafafa;cursor:pointer;font-size:10.5px;display:flex;align-items:center;justify-content:center;padding:4px}
.gsd-istyle span{display:block;width:100%;padding:6px 2px;background:#cfe0f5}
.gsd-istyle.on{border-color:var(--blue)}
.gsd-bullets,.gsd-numbers{display:grid;grid-template-columns:repeat(3,58px);gap:6px;padding:6px 10px}
.gsd-bullets button,.gsd-numbers button{height:58px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:18px;white-space:pre;line-height:1.25}
.gsd-numbers button{font-size:12px;text-align:left;padding-left:10px}
.gsd-bullets button:hover,.gsd-numbers button:hover{border-color:var(--blue);background:#eef4fc}
.gsd-tgrid{display:grid;grid-template-columns:repeat(10,18px);gap:2px}
.gsd-tgrid button{width:18px;height:18px;border:1px solid #bbb;background:#fff;padding:0;cursor:pointer}
.gsd-tgrid button.on{border-color:#e29b45;background:#fbe3c6}
.gsd-shapes{display:grid;grid-template-columns:repeat(8,28px);gap:3px;padding:2px 6px}
.gsd-shapes button,.gsd-icons button{border:1px solid transparent;background:transparent;cursor:pointer;padding:2px;border-radius:2px;display:flex;align-items:center;justify-content:center}
.gsd-shapes button:hover,.gsd-icons button:hover{border-color:#c8c8c8;background:#f0f0f0}
.gsd-icons{display:grid;grid-template-columns:repeat(9,30px);gap:2px;padding:2px 6px}
.gsd-wordart{display:grid;grid-template-columns:repeat(4,44px);gap:4px;padding:8px}
.gsd-wordart button{height:44px;border:1px solid #ddd;background:#fff;cursor:pointer}
.gsd-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:2px 2px;white-space:nowrap}
.gsd-soon{align-self:center;font-size:12px;color:#605e5c;max-width:380px;padding:0 14px;line-height:1.5}
/* 본문 영역 */
.gsd-main{flex:1;display:flex;min-height:0;position:relative;background:#e9e9e9}
.gsd-nav{width:280px;flex-shrink:0;background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.gsd-nav-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 6px;font-size:15px;font-weight:600}
.gsd-nav-head button{border:0;background:transparent;cursor:pointer;font-size:14px}
.gsd-nav-search{margin:0 12px 6px;display:flex;align-items:center;border:1px solid #c8c8c8;border-radius:3px;padding:0 6px;height:28px}
.gsd-nav-search input{border:0;outline:0;flex:1;font:inherit;min-width:0}
.gsd-nav-tabs{display:flex;gap:14px;padding:0 12px;border-bottom:1px solid #eee}
.gsd-nav-tabs button{border:0;background:transparent;padding:6px 0;cursor:pointer;font-size:12.5px;color:#444;border-bottom:2px solid transparent}
.gsd-nav-tabs button.on{color:var(--blue);border-color:var(--blue);font-weight:600}
.gsd-nav-list{flex:1;overflow:auto;padding:6px 0}
.gsd-nav-list button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:5px 12px;cursor:pointer;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#252423}
.gsd-nav-list button:hover{background:#f0f0f0}
.gsd-nav-list button.on{background:#dbe7f8}
.gsd-nav-list .hit b{background:#fff200}
.gsd-nav-empty{padding:14px 12px;color:#777;font-size:12px;line-height:1.6}
.gsd-scroll{flex:1;overflow:auto;position:relative;min-width:0}
.gsd-scroll.web{background:#fff}
.gsd-ruler{position:sticky;top:0;z-index:20;height:22px;margin:0 auto;background:#e9e9e9}
.gsd-ruler-in{position:relative;height:18px;margin-top:2px;background:#fff;border:1px solid #c8c8c8}
.gsd-ruler-margin{position:absolute;top:0;bottom:0;background:#c6c6c6}
.gsd-ruler-tick{position:absolute;bottom:0;width:1px;background:#777}
.gsd-ruler-num{position:absolute;top:1px;font-size:9px;color:#555;transform:translateX(-50%)}
.gsd-ruler-mk{position:absolute;width:10px;height:7px;transform:translateX(-50%);cursor:ew-resize;background:#fff;border:1px solid #666;z-index:2}
.gsd-ruler-mk.first{top:-1px;clip-path:polygon(0 0,100% 0,50% 100%)}
.gsd-ruler-mk.left{bottom:-1px;clip-path:polygon(50% 0,100% 100%,0 100%)}
.gsd-ruler-mk.right{bottom:-1px;clip-path:polygon(50% 0,100% 100%,0 100%)}
.gsd-zoomer{margin:0 auto;padding:16px 0 30px;position:relative}
.gsd-scroll.web .gsd-zoomer{padding:0}
.gsd-stack{position:relative;transform-origin:0 0}
.gsd-sheet{position:absolute;left:0;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.22);overflow:hidden;pointer-events:none}
.gsd-scroll.web .gsd-sheet{box-shadow:none}
.gsd-hf{position:absolute;font-size:9pt;color:#555;display:flex;white-space:pre-wrap;line-height:1.3}
.gsd-hf span{flex:1}
.gsd-pnum{position:absolute;font-size:10pt;color:#333}
.gsd-wm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:110px;font-weight:700;color:rgba(0,0,0,.09);white-space:nowrap;letter-spacing:8px}
.gsd-pborder{position:absolute;inset:24px;border:2px solid}
.gsd-fnarea{position:absolute;font-size:8pt;line-height:1.35;color:#333}
.gsd-fnarea::before{content:"";display:block;width:33%;border-top:1px solid #777;margin-bottom:3px}
.gsd-margin-mk{position:absolute;width:12px;height:12px;border-color:#b8b8b8;border-style:solid}
.gsd-body{position:relative;z-index:1}
.gsd-body .ProseMirror{outline:0;min-height:100px;font-family:var(--gsd-font);font-size:var(--gsd-size);line-height:1.6;color:#000;user-select:text;cursor:text;word-break:keep-all;overflow-wrap:break-word;counter-reset:fn ln}
.gsd-body .ProseMirror.gsd-hyph{hyphens:auto}
.gsd-body .ProseMirror p{margin:0;min-height:1em}
.gsd-body .ProseMirror h1,.gsd-body .ProseMirror h2,.gsd-body .ProseMirror h3,.gsd-body .ProseMirror h4,.gsd-body .ProseMirror h5,.gsd-body .ProseMirror h6{font-family:var(--gsd-head);color:var(--gsd-hcolor);margin:0;padding-top:12pt;padding-bottom:4pt;line-height:1.35;font-weight:700}
.gsd-body .ProseMirror h1{font-size:var(--gsd-h1)}.gsd-body .ProseMirror h2{font-size:var(--gsd-h2)}.gsd-body .ProseMirror h3{font-size:var(--gsd-h3)}.gsd-body .ProseMirror h4{font-size:11pt}
.gsd-body .ProseMirror ul,.gsd-body .ProseMirror ol{margin:0;padding-left:28px}
.gsd-body .ProseMirror ul{list-style-type:disc}.gsd-body .ProseMirror ul ul{list-style-type:circle}.gsd-body .ProseMirror ul ul ul{list-style-type:square}.gsd-body .ProseMirror ol{list-style-type:decimal}
.gsd-body .ProseMirror li{display:list-item;list-style-type:inherit}
.gsd-body .ProseMirror li>p{margin:0}
.gsd-body .ProseMirror ul[data-bullet=circle]{list-style-type:circle}.gsd-body .ProseMirror ul[data-bullet=square]{list-style-type:square}
.gsd-body .ProseMirror ul[data-bullet=check]{list-style-type:"✓  "}.gsd-body .ProseMirror ul[data-bullet=arrow]{list-style-type:"➢  "}.gsd-body .ProseMirror ul[data-bullet=diamond]{list-style-type:"◆  "}
.gsd-body .ProseMirror ol[data-kind="가"]{list-style-type:hangul}.gsd-body .ProseMirror ol[data-kind=a]{list-style-type:lower-alpha}.gsd-body .ProseMirror ol[data-kind=A]{list-style-type:upper-alpha}
.gsd-body .ProseMirror ol[data-kind=i]{list-style-type:lower-roman}.gsd-body .ProseMirror ol[data-kind=I]{list-style-type:upper-roman}.gsd-body .ProseMirror ol[data-kind="①"]{list-style-type:gsd-circled}
@counter-style gsd-circled{system:fixed;symbols:"①" "②" "③" "④" "⑤" "⑥" "⑦" "⑧" "⑨" "⑩" "⑪" "⑫" "⑬" "⑭" "⑮" "⑯" "⑰" "⑱" "⑲" "⑳";suffix:" "}
.gsd-body .ProseMirror blockquote{margin:6pt 0;padding:2pt 0 2pt 12pt;border-left:3px solid #a5a5a5;color:#404040;font-style:italic}
.gsd-body .ProseMirror hr{border:0;border-top:1px solid #888;margin:8pt 0}
.gsd-body .ProseMirror a{color:#0563c1;text-decoration:underline}
.gsd-body .ProseMirror code{font-family:Consolas,monospace;background:#f3f3f3;padding:0 3px}
.gsd-body .ProseMirror pre{background:#f6f6f6;padding:8px;font-family:Consolas,monospace;font-size:10pt}
.gsd-body .ProseMirror table{border-collapse:collapse;table-layout:fixed;width:100%;margin:4pt 0}
.gsd-body .ProseMirror td,.gsd-body .ProseMirror th{border:1px solid #000;padding:3px 6px;vertical-align:top;position:relative;min-width:4px;font-weight:inherit;text-align:left}
.gsd-body .ProseMirror th{font-weight:700}
.gsd-body .ProseMirror .selectedCell::after{content:"";position:absolute;inset:0;background:rgba(43,87,154,.18);pointer-events:none}
.gsd-body .ProseMirror .column-resize-handle{position:absolute;right:-2px;top:0;bottom:-2px;width:4px;background:#2b579a;pointer-events:none}
.gsd-body .ProseMirror.resize-cursor{cursor:col-resize}
.gsd-body .ProseMirror .tableWrapper{overflow-x:auto;padding:1px}
.gsd-body .ProseMirror img{max-width:100%;height:auto;display:block}
.gsd-body .ProseMirror img[data-align=center],.gsd-body .ProseMirror [data-align=center]>img{margin-left:auto;margin-right:auto}
.gsd-body .ProseMirror img[data-align=right],.gsd-body .ProseMirror [data-align=right]>img{margin-left:auto}
.gsd-body .ProseMirror img[data-frame=line]{border:1px solid #000}.gsd-body .ProseMirror img[data-frame=gray]{border:4px solid #bfbfbf}
.gsd-body .ProseMirror img[data-frame=white]{border:8px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}.gsd-body .ProseMirror img[data-frame=shadow]{box-shadow:4px 4px 10px rgba(0,0,0,.4)}.gsd-body .ProseMirror img[data-frame=round]{border-radius:16px}
.gsd-body .ProseMirror [data-resize-handle]{position:absolute;width:9px;height:9px;background:#fff;border:1px solid #2b579a;z-index:3}
.gsd-body .ProseMirror [data-resize-container]{position:relative;display:block;width:fit-content;max-width:100%}
.gsd-body .ProseMirror [data-resize-container][data-align=center]{margin:0 auto}
.gsd-body .ProseMirror img.ProseMirror-selectednode,.gsd-body .ProseMirror .ProseMirror-selectednode img{outline:2px solid #2b579a}
.gsd-body .ProseMirror .gsd-pagebreak,.gsd-body .ProseMirror .gsd-colbreak{height:14px;border-top:1px dashed #9a9a9a;position:relative;margin:6px 0;cursor:default}
.gsd-body .ProseMirror .gsd-pagebreak span,.gsd-body .ProseMirror .gsd-colbreak span{position:absolute;left:50%;top:-8px;transform:translateX(-50%);background:#fff;color:#888;font-size:10px;padding:0 6px;font-family:'맑은 고딕'}
.gsd-body .ProseMirror .gsd-columns{display:grid;gap:12pt;margin:2pt 0}
.gsd-body .ProseMirror .gsd-column{min-width:0;outline:1px dashed transparent}
.gsd-show-grid .gsd-body .ProseMirror .gsd-column,.gsd-marks .gsd-body .ProseMirror .gsd-column{outline-color:#bbb}
.gsd-body .ProseMirror .gsd-textbox{padding:6pt 8pt;margin:4pt 0}
.gsd-body .ProseMirror .gsd-toc{border:1px dashed #b4b4b4;padding:6pt 8pt;margin:4pt 0;cursor:default;font-family:var(--gsd-font)}
.gsd-body .ProseMirror .gsd-toc-title{font-size:14pt;font-weight:700;color:var(--gsd-hcolor);margin-bottom:4pt}
.gsd-body .ProseMirror .gsd-toc-row{padding:1pt 0;border-bottom:1px dotted #ccc}
.gsd-body .ProseMirror .gsd-footnote{counter-increment:fn;font-size:0;cursor:help}
.gsd-body .ProseMirror .gsd-footnote::after{content:counter(fn);font-size:8pt;color:#0b4cb5;vertical-align:super}
.gsd-body .ProseMirror .gsd-comment{background:#fde9a9;border-bottom:2px solid #f2c94c}
.gsd-body .ProseMirror .gsd-comment.cur{background:#f8d36a}
.gsd-body .ProseMirror .gsd-find{background:#fff27a}
.gsd-body .ProseMirror .gsd-find-cur{background:#ff9f2e}
.gsd-body .ProseMirror mark{color:inherit;padding:0}
.gsd-body .ProseMirror .gsd-push{pointer-events:none}
.gsd-body .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#aaa;float:left;height:0;pointer-events:none}
.gsd-body .ProseMirror ::selection{background:#c7dcf7}
.gsd-marks .gsd-body .ProseMirror p::after,.gsd-marks .gsd-body .ProseMirror h1::after,.gsd-marks .gsd-body .ProseMirror h2::after,.gsd-marks .gsd-body .ProseMirror h3::after{content:"¶";color:#8a9ec2;margin-left:2px;font-family:Arial}
.gsd-marks .gsd-body .ProseMirror br::after{content:"↵"}
.gsd-show-grid .gsd-body .ProseMirror td,.gsd-show-grid .gsd-body .ProseMirror th{outline:1px dashed #9fb6d9}
.gsd-show-grid .gsd-sheet{background-image:repeating-linear-gradient(transparent 0 calc(1.6em - 1px),#e4ecf7 calc(1.6em - 1px) 1.6em)}
.gsd-lines .gsd-body .ProseMirror>p,.gsd-lines .gsd-body .ProseMirror>h1,.gsd-lines .gsd-body .ProseMirror>h2,.gsd-lines .gsd-body .ProseMirror>h3{counter-increment:ln;position:relative}
.gsd-lines .gsd-body .ProseMirror>p::before,.gsd-lines .gsd-body .ProseMirror>h1::before,.gsd-lines .gsd-body .ProseMirror>h2::before,.gsd-lines .gsd-body .ProseMirror>h3::before{content:counter(ln);position:absolute;left:-34px;width:24px;text-align:right;font-size:8pt;color:#888;font-weight:400;font-style:normal;font-family:Arial}
.gsd-readonly .gsd-body .ProseMirror{cursor:default}
.gsd-painter .gsd-body .ProseMirror{cursor:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M3 2h9v5H3z' fill='%23fff' stroke='%23000'/><path d='M7 7v3h1v8h2v-8' fill='none' stroke='%23000'/></svg>") 2 2,text}
/* 찍을 때 (그림·PDF·인쇄) — 커서·표시 숨김 */
.gsd-capturing .gsd-pagebreak,.gsd-capturing .gsd-colbreak{border-color:transparent!important}
.gsd-capturing .gsd-pagebreak span,.gsd-capturing .gsd-colbreak span{display:none!important}
.gsd-capturing .gsd-toc{border-color:transparent!important}
.gsd-capturing .gsd-comment{background:transparent!important;border:0!important}
.gsd-capturing .gsd-find,.gsd-capturing .gsd-find-cur,.gsd-capturing .selectedCell::after{background:transparent!important}
.gsd-capturing .column-resize-handle,.gsd-capturing [data-resize-handle]{display:none!important}
.gsd-capturing .gsd-sheet{box-shadow:none!important}
.gsd-capturing .ProseMirror p::after{content:none!important}
.gsd-capturing img{outline:0!important}
/* 메모 칸 */
.gsd-cmts{width:300px;flex-shrink:0;background:#f5f5f5;border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.gsd-cmts-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;font-size:14px;font-weight:600}
.gsd-cmts-head button{border:1px solid #c8c8c8;background:#fff;border-radius:3px;padding:3px 8px;cursor:pointer;font-size:12px}
.gsd-cmts-list{flex:1;overflow:auto;padding:0 10px 10px;display:flex;flex-direction:column;gap:8px}
.gsd-cmt{background:#fff;border:1px solid #ddd;border-radius:6px;padding:8px 10px;font-size:12.5px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.gsd-cmt.on{border-color:var(--blue);box-shadow:0 0 0 1px var(--blue)}
.gsd-cmt-top{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.gsd-cmt-av{width:22px;height:22px;border-radius:50%;background:#7a3e9d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.gsd-cmt-q{color:#777;font-size:11.5px;border-left:3px solid #f2c94c;padding-left:6px;margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gsd-cmt textarea{width:100%;border:1px solid #c8c8c8;border-radius:3px;font:inherit;padding:4px;resize:vertical;user-select:text}
.gsd-cmt-act{display:flex;gap:6px;justify-content:flex-end;margin-top:4px}
.gsd-cmt-act button{border:0;background:transparent;color:var(--blue);cursor:pointer;font-size:12px}
/* 상태 표시줄 */
.gsd-status{height:26px;flex-shrink:0;background:#f3f3f3;border-top:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:0 10px;font-size:12px;color:#444}
.gsd-status button{border:0;background:transparent;cursor:pointer;height:22px;min-width:22px;border-radius:2px;display:inline-flex;align-items:center;justify-content:center;color:#444;padding:0 4px;font-size:12px}
.gsd-status button:hover{background:#e1e1e1}
.gsd-status button.on{background:#d6d6d6}
.gsd-status-r{margin-left:auto;display:flex;align-items:center;gap:6px}
.gsd-status input[type=range]{width:110px;accent-color:#555}
/* 백스테이지 (파일) */
.gsd-bs{position:absolute;inset:0;z-index:90;display:flex;background:#fff;user-select:none}
.gsd-bs-nav{width:200px;background:var(--blue);color:#fff;display:flex;flex-direction:column;padding:8px 0}
.gsd-bs-back{border:0;background:transparent;color:#fff;width:44px;height:40px;margin:0 0 8px 10px;border-radius:50%;cursor:pointer}
.gsd-bs-back:hover{background:rgba(255,255,255,.15)}
.gsd-bs-item{display:flex;align-items:center;gap:12px;border:0;background:transparent;color:#fff;font-size:14px;padding:10px 22px;text-align:left;cursor:pointer}
.gsd-bs-item:hover{background:rgba(255,255,255,.12)}
.gsd-bs-item.on{background:rgba(255,255,255,.22);font-weight:600}
.gsd-bs-sep{height:1px;background:rgba(255,255,255,.25);margin:8px 18px}
.gsd-bs-main{flex:1;overflow:auto;padding:28px 44px;background:#fff}
.gsd-bs-main h1{font-size:28px;font-weight:400;margin:0 0 22px;color:#252423}
.gsd-bs-more{text-align:right;margin:-10px 0 18px}.gsd-bs-more button{border:0;background:transparent;color:var(--blue);cursor:pointer;font-size:13px}
.gsd-tpls{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:26px}
.gsd-tpl{border:0;background:transparent;cursor:pointer;width:122px;display:flex;flex-direction:column;gap:8px;align-items:center;padding:0}
.gsd-tpl-thumb{width:122px;height:158px;border:1px solid #d0d0d0;background:#fff;display:flex;flex-direction:column;gap:6px;padding:16px 12px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.gsd-tpl:hover .gsd-tpl-thumb{border-color:var(--blue);box-shadow:0 0 0 2px var(--blueL)}
.gsd-tpl-nm{font-size:12.5px;color:#252423;text-align:center;line-height:1.3}
.gsd-tpl-src{font-size:10.5px;color:#1e88c9;margin-top:-6px}
.gsd-tpl-thumb{position:relative}
.gsd-tpl-badge{position:absolute;right:6px;bottom:6px;width:20px;height:22px;border-radius:2px;background:#1e88c9;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.gsd-tl{display:block;height:4px;background:#d0d0d0;border-radius:1px}
.gsd-tl-H{height:12px;background:#2b579a;width:70%;align-self:center}
.gsd-tl-h{height:8px;background:#4472c4;width:55%}
.gsd-tl-t{height:16px;background:repeating-linear-gradient(#fff 0 3px,#bcd 3px 4px);border:1px solid #9ab}
.gsd-tl-b{height:14px;background:repeating-linear-gradient(#ddd 0 2px,transparent 2px 5px)}
.gsd-tl-l{width:60%;background:#bbb}
.gsd-recent{max-width:980px}
.gsd-recent-tabs{display:flex;gap:22px;border-bottom:1px solid #e1e1e1;margin-bottom:6px}
.gsd-recent-tabs button{border:0;background:transparent;padding:8px 0;font-size:14px;cursor:pointer;color:#444;border-bottom:2px solid transparent}
.gsd-recent-tabs button.on{color:var(--blue);border-color:var(--blue);font-weight:600}
.gsd-recent-head,.gsd-recent-row{display:grid;grid-template-columns:36px 1fr 160px 100px;align-items:center;gap:10px;padding:6px 8px}
.gsd-recent-head{font-size:12px;color:#777}
.gsd-recent-row{border-radius:3px;cursor:pointer}
.gsd-recent-row:hover{background:#f0f0f0}
.gsd-recent-row.missing{opacity:.5;cursor:default}
.gsd-recent-name{display:flex;flex-direction:column;min-width:0}
.gsd-recent-name b{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gsd-recent-name small{font-size:11px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gsd-recent-at{font-size:12px;color:#555}
.gsd-recent-act{display:flex;gap:2px;opacity:0}.gsd-recent-row:hover .gsd-recent-act{opacity:1}
.gsd-recent-act button{border:0;background:transparent;cursor:pointer;width:28px;height:28px;border-radius:3px;color:#444}
.gsd-recent-act button:hover{background:#e1e1e1}
.gsd-recent-empty{padding:20px 8px;color:#777;font-size:13px}
.gsd-fi{display:inline-flex;align-items:center;justify-content:center;width:24px;height:28px;border-radius:2px;color:#fff;font-weight:800;font-size:13px}
.gsd-fi.doc{background:#2b579a}.gsd-fi.hwp{background:#1e88c9}.gsd-fi.txt{background:#7a7a7a}.gsd-fi.big{width:30px;height:34px;font-size:16px}
.gsd-open{display:flex;gap:30px}
.gsd-open-left{width:300px;flex-shrink:0}
.gsd-fmts{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px;max-width:980px}
.gsd-fmt{display:flex;align-items:center;gap:14px;border:1px solid #e1e1e1;background:#fff;padding:12px 14px;border-radius:4px;cursor:pointer;text-align:left;width:100%}
.gsd-fmt:hover:not(:disabled){background:#f3f6fb;border-color:#b7cdee}
.gsd-fmt:disabled{opacity:.5;cursor:default}
.gsd-fmt b{display:block;font-size:13.5px;font-weight:600;color:#252423}
.gsd-fmt small{display:block;font-size:12px;color:#666;margin-top:2px}
.gsd-fmt-ic{width:36px;display:flex;justify-content:center}
.gsd-info{display:flex;gap:40px;flex-wrap:wrap}
.gsd-info>div:first-child{flex:1;min-width:320px;max-width:560px}
.gsd-info-title{display:flex;align-items:center;gap:10px;font-size:18px;margin-bottom:6px}
.gsd-info-title input{font:inherit;border:1px solid transparent;padding:2px 6px;border-radius:3px;flex:1;user-select:text}
.gsd-info-title input:hover,.gsd-info-title input:focus{border-color:#c8c8c8}
.gsd-info-path{font-size:12px;color:#666;margin-bottom:12px;word-break:break-all}
.gsd-info-box{border:1px solid #e1e1e1;border-radius:4px;padding:10px 14px;margin:10px 0;font-size:12.5px;line-height:1.6;background:#fafafa}
.gsd-info-box p{margin:4px 0 0;color:#555}
.gsd-props{width:300px;font-size:12.5px}
.gsd-props>b{display:block;margin:12px 0 6px;font-size:13px}
.gsd-props dl{display:grid;grid-template-columns:96px 1fr;gap:6px 10px;margin:0}
.gsd-props dt{color:#666}.gsd-props dd{margin:0}
.gsd-print{display:flex;gap:30px;min-height:0}
.gsd-print-left{width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:8px}
.gsd-print-left h3{font-size:14px;margin:10px 0 2px;font-weight:600}
.gsd-print-left select,.gsd-print-left input{height:32px;border:1px solid #c8c8c8;border-radius:3px;padding:0 8px;font:inherit;font-size:12.5px;background:#fff;user-select:text}
.gsd-print-go{display:flex;align-items:center;gap:16px}
.gsd-print-btn{width:86px;height:86px;border:1px solid #c8c8c8;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:4px;font-size:14px;color:#252423}
.gsd-print-btn:hover{background:#e5eefb;border-color:#7fa4dc}
.gsd-print-go input{width:60px}
.gsd-print-pv{flex:1;background:#e9e9e9;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;min-height:520px;border-radius:4px}
.gsd-print-pv img{max-width:100%;max-height:calc(100vh - 260px);box-shadow:0 2px 8px rgba(0,0,0,.25);background:#fff}
.gsd-print-nav{display:flex;align-items:center;gap:12px;margin-top:10px}
.gsd-print-nav button{border:1px solid #c8c8c8;background:#fff;width:30px;height:26px;cursor:pointer;border-radius:3px}
.gsd-muted{color:#777;font-size:12.5px;line-height:1.6}
.gsd-err{color:#c00;font-size:12.5px}
/* 대화 상자 */
.gsd-dlg-back{position:absolute;inset:0;background:rgba(0,0,0,.18);z-index:120;display:flex;align-items:center;justify-content:center}
.gsd-dlg{background:#fff;border:1px solid #9a9a9a;box-shadow:0 12px 40px rgba(0,0,0,.3);max-height:calc(100% - 40px);display:flex;flex-direction:column;max-width:calc(100% - 40px);user-select:none}
.gsd-dlg-title{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 14px;font-size:13px}
.gsd-dlg-title button{border:0;background:transparent;width:30px;height:26px;cursor:pointer;font-size:13px}
.gsd-dlg-title button:hover{background:#e81123;color:#fff}
.gsd-dlg-body{padding:6px 16px 10px;overflow:auto;font-size:12.5px}
.gsd-dlg-body input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),.gsd-dlg-body select,.gsd-dlg-body textarea{border:1px solid #adadad;border-radius:2px;padding:3px 6px;font:inherit;font-size:12.5px;background:#fff;user-select:text}
.gsd-dlg-foot{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px 14px;align-items:center}
.gsd-btn{min-width:76px;height:26px;border:1px solid #adadad;background:#e1e1e1;border-radius:2px;cursor:pointer;font-size:12.5px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:4px;color:#222}
.gsd-btn:hover:not(:disabled){background:#e5f1fb;border-color:#0078d7}
.gsd-btn.primary{border-color:#0078d7;box-shadow:inset 0 0 0 1px #0078d7}
.gsd-btn:disabled{opacity:.5;cursor:default}
.gsd-fs{border:0;border-top:1px solid #dcdcdc;margin:10px 0 0;padding:8px 2px 2px}
.gsd-fs legend{padding:0 6px 0 0;font-size:12.5px;color:#1e3f7a}
.gsd-form1{display:flex;flex-direction:column;gap:8px}
.gsd-form1 label{display:flex;flex-direction:column;gap:3px}
.gsd-form2{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}
.gsd-form2 label{display:flex;align-items:center;gap:6px;white-space:nowrap}
.gsd-form2 input[type=number]{width:72px}
.gsd-form3{display:grid;grid-template-columns:2fr 1.3fr 1fr;gap:10px}
.gsd-form3 label{display:flex;flex-direction:column;gap:3px}
.gsd-inline{display:inline-flex;align-items:center;gap:6px}
.gsd-inline input[type=number]{width:72px}
.gsd-preview{border:1px solid #ddd;padding:10px;text-align:center;min-height:56px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap}
.gsd-para-pv{border:1px solid #ddd;padding:8px;font-size:9px;color:#333;background:#fff}
.gsd-para-pv .pv-g{height:10px;background:repeating-linear-gradient(#ccc 0 2px,transparent 2px 5px);margin:4px 0}
.gsd-dtabs{display:flex;gap:2px;border-bottom:1px solid #dcdcdc;margin-bottom:8px;flex-wrap:wrap}
.gsd-dtabs button{border:1px solid transparent;border-bottom:0;background:transparent;padding:5px 12px;cursor:pointer;font-size:12.5px;margin-bottom:-1px}
.gsd-dtabs button.on{background:#fff;border-color:#dcdcdc;color:#1e3f7a}
.gsd-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;align-items:center}
.gsd-list{display:flex;flex-direction:column;border:1px solid #dcdcdc;max-height:320px;overflow:auto}
.gsd-list>button{border:0;background:#fff;text-align:left;padding:6px 10px;cursor:pointer;font-size:12.5px}
.gsd-list>button:hover{background:#e5f1fb}.gsd-list>button.on{background:#cce4f7}
.gsd-kv{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:12.5px}
.gsd-kv b{font-weight:600}
.gsd-symbols{display:grid;grid-template-columns:repeat(16,1fr);border:1px solid #dcdcdc;max-height:260px;overflow:auto}
.gsd-symbols button{height:28px;border:0;border-right:1px solid #eee;border-bottom:1px solid #eee;background:#fff;cursor:pointer;font-size:16px}
.gsd-symbols button:hover{background:#cce4f7}
.gsd-help p{line-height:1.7;margin:6px 0}
.gsd-keys{max-height:420px;overflow:auto;border:1px solid #eee}
.gsd-progress{position:relative;height:22px;background:#e6e6e6;border-radius:3px;overflow:hidden;margin-top:10px}
.gsd-progress>div{height:100%;background:#06b025;transition:width .2s}
.gsd-progress span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11.5px;color:#222}
.gsd-progress.indeterminate>div{width:30%;animation:gsdbar 1.2s infinite linear}
@keyframes gsdbar{from{margin-left:-30%}to{margin-left:100%}}
.gsd-ai-out{border:1px solid #d9ccf5;background:#faf7ff;border-radius:4px;padding:10px 14px;margin-top:10px;max-height:340px;overflow:auto;user-select:text;font-size:13px;line-height:1.6}
.gsd-ai-out table{border-collapse:collapse}.gsd-ai-out td,.gsd-ai-out th{border:1px solid #999;padding:2px 6px}
.gsd-ai-out p,.gsd-ai-out h1,.gsd-ai-out h2,.gsd-ai-out h3{margin:2px 0}
.gsd-draw{width:100%;height:auto;border:1px solid #ccc;background:#fff;touch-action:none;display:block}
.gsd-chart-rows{display:flex;flex-direction:column;gap:4px;margin-top:8px;max-height:280px;overflow:auto}
.gsd-chart-row{display:grid;grid-template-columns:1fr 80px;gap:4px}
.gsd-chart-row.head{font-size:11.5px;color:#666}
.gsd-chart-row input{width:100%}
.gsd-toast{position:absolute;left:50%;bottom:40px;transform:translateX(-50%);background:#323130;color:#fff;padding:10px 18px;border-radius:4px;font-size:13px;z-index:200;box-shadow:0 4px 14px rgba(0,0,0,.3);max-width:80%;text-align:center}
.gsd-banner{display:flex;align-items:center;gap:10px;background:#fff4ce;border-bottom:1px solid #f0d77c;padding:6px 14px;font-size:12.5px;flex-shrink:0}
.gsd-banner button{border:1px solid #c8a93a;background:#fff;border-radius:3px;padding:2px 10px;cursor:pointer;font-size:12px}
.gsd-focus .gsd-title,.gsd-focus .gsd-tabs,.gsd-focus .gsd-ribbon,.gsd-focus .gsd-status,.gsd-focus .gsd-ruler{display:none}
.gsd-focus .gsd-main{background:#3b3a39}
.gsd-focus-exit{position:absolute;top:10px;right:16px;z-index:50;border:0;background:rgba(255,255,255,.85);border-radius:4px;padding:5px 12px;cursor:pointer}
.gsd-read .gsd-scroll{background:#f7f3ea}
.gsd-read-exit{position:absolute;top:8px;right:20px;z-index:50;border:1px solid #ccc;background:#fff;border-radius:4px;padding:5px 12px;cursor:pointer}
`;
