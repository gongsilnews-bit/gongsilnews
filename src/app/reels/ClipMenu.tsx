"use client";

// 클립 메뉴 (브루식): 클립 썸네일을 누르거나 카드에서 마우스 오른쪽 버튼 → 교체·구간·속도·소리·화면 맞춤·나누기·합치기·삭제
import { useEffect, useRef, useState } from "react";
import { VIDEO_SPEEDS, type ReelScene, type SceneVideo } from "@/lib/reels/types";
import st from "./reels.module.css";

type Sub = { label: string; on: boolean; run: () => void }[];
type Item = { icon: string; label: string; run?: () => void; sub?: Sub; disabled?: boolean; danger?: boolean } | "line";

export default function ClipMenu({ x, y, scene, hasAudio, landscape, canSplit, canMerge, canDelete, onClose, onReplace, onTrim, onVideo, onToPhoto, onSplit, onMerge, onDelete }: {
  x: number;
  y: number;
  scene: ReelScene;
  hasAudio: boolean;
  landscape: boolean;
  canSplit: boolean;
  canMerge: boolean;
  canDelete: boolean;
  onClose: () => void;
  onReplace: () => void;
  onTrim: () => void;
  onVideo: (p: Partial<SceneVideo>) => void;
  onToPhoto: () => void;
  onSplit: () => void;
  onMerge: () => void;
  onDelete: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const v = scene.video;

  // 화면 밖으로 나가지 않게 자리 맞춤, 바깥을 누르거나 Esc 면 닫기
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const r = box.current?.getBoundingClientRect();
      if (r) setPos({ left: Math.min(x, window.innerWidth - r.width - 8), top: Math.min(y, window.innerHeight - r.height - 8) });
    });
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [x, y, onClose]);

  const fast = v && v.speed !== "auto" && typeof v.speed === "number" && v.speed > 2;
  const items: Item[] = [
    { icon: "🔄", label: v ? "영상·사진 교체" : "사진·영상 교체", run: onReplace },
    ...(v
      ? ([
          { icon: "✂", label: "영상 구간 정하기", run: onTrim },
          { icon: "⏩", label: "속도", sub: VIDEO_SPEEDS.map(([s, label]) => ({ label, on: String(v.speed ?? "auto") === String(s), run: () => onVideo({ speed: s }) })) },
          // 음소거는 한 번에 켜고 끄기, 크기는 하위 메뉴에서
          {
            icon: (v.sound ?? "off") === "off" ? "🔇" : "🔊",
            label: !hasAudio ? "원래 소리 없음" : fast ? "음소거 (2배 넘게 빨라 자동)" : (v.sound ?? "off") === "off" ? "음소거 해제" : "음소거",
            disabled: !hasAudio || !!fast,
            run: () => onVideo({ sound: (v.sound ?? "off") === "off" ? "on" : "off" }),
          },
          {
            icon: "🎚",
            label: "원래 소리 크기",
            disabled: !hasAudio || !!fast,
            sub: ([["off", "🔇 음소거"], ["low", "🔉 작게"], ["on", "🔊 그대로"]] as const).map(([s, label]) => ({ label, on: (v.sound ?? "off") === s, run: () => onVideo({ sound: s }) })),
          },
          ...(landscape
            ? [{ icon: "▣", label: "화면 맞춤", sub: ([["contain", "전체 보이기 (흐린 배경)"], ["cover", "꽉 채우기 (양옆 잘림)"]] as const).map(([s, label]) => ({ label, on: (v.fit ?? "cover") === s, run: () => onVideo({ fit: s }) })) }]
            : []),
          { icon: "🖼", label: "사진으로 되돌리기", run: onToPhoto },
        ] as Item[])
      : []),
    "line",
    { icon: "✂", label: "클립 나누기", run: onSplit, disabled: !canSplit },
    { icon: "⧉", label: "아래 클립과 합치기", run: onMerge, disabled: !canMerge },
    "line",
    { icon: "🗑", label: "클립 삭제", run: onDelete, disabled: !canDelete, danger: true },
  ];

  return (
    <div ref={box} className={st.cmenu} style={pos} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, k) =>
        it === "line" ? (
          <hr key={k} />
        ) : (
          <div key={k} className={st.cmItem} onMouseEnter={() => setOpen(it.sub ? k : null)}>
            <button
              className={`${it.danger ? st.cmDanger : ""}`}
              disabled={it.disabled}
              onClick={() => {
                if (it.sub) return setOpen(open === k ? null : k);
                it.run?.();
                onClose();
              }}
            >
              <span>{it.icon}</span>
              {it.label}
              {it.sub && <i>›</i>}
            </button>
            {it.sub && open === k && !it.disabled && (
              <div className={st.cmSub}>
                {it.sub.map((s, n) => (
                  <button key={n} className={s.on ? st.cmOn : ""} onClick={() => { s.run(); onClose(); }}>
                    {s.on ? "✓ " : ""}{s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
