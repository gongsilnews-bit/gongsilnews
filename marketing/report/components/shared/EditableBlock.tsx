import React from 'react';

const EditableBlock = ({
  value,
  onChange,
  className = "",
  placeholder = "텍스트 입력..."
}: {
  value: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
  /** fieldProps 를 그대로 펼쳐 넣을 수 있게 받기만 한다 (이 칸은 늘 여러 줄) */
  multiline?: boolean;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  // 칸을 빠져나가지 않고 바로 내보내기·저장해도 고친 글이 남게 — 쓰다 멈추면 0.4초 뒤 반영 (EditableText 와 같이, 2026-10-25 사장님)
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  // 줄바꿈을 지키려고 innerText — textContent 는 Enter 로 바꾼 줄이 붙어서 입력란과 달라졌다 (2026-10-25)
  const read = (el: HTMLElement) => (el.innerText || "").replace(/\n$/, "");
  const commit = () => {
    clearTimeout(timer.current);
    if (ref.current) onChangeRef.current(read(ref.current));
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  React.useEffect(() => {
    // 쓰는 중에는 덮어쓰지 않는다
    if (ref.current && document.activeElement !== ref.current && read(ref.current) !== (value || "")) {
      ref.current.innerText = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded p-1 transition-all duration-150 cursor-text whitespace-pre-wrap min-h-[1em] ${className}`}
      onInput={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(commit, 400);
      }}
      onBlur={commit}
      placeholder={placeholder}
    />
  );
};

export default EditableBlock;
