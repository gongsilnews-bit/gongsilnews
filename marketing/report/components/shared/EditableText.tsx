import React from 'react';

const EditableText = ({
  value,
  onChange,
  className = "",
  placeholder = "텍스트 입력...",
  multiline = false
}: {
  value: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  // 칸을 빠져나가지 않고 바로 내보내기·저장해도 고친 글이 남게 — 쓰다 멈추면 0.4초 뒤 반영 (2026-10-25 사장님: 지운 "대표 김상태"가 다시 나옴)
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const read = (el: HTMLElement) => (multiline ? el.innerText : el.textContent) || "";
  const commit = () => {
    clearTimeout(timer.current);
    if (ref.current) onChangeRef.current(read(ref.current));
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  React.useEffect(() => {
    // 쓰는 중에는 덮어쓰지 않는다 (앞말을 붙이거나 공백을 지우는 칸에서 커서가 튀지 않게)
    if (ref.current && document.activeElement !== ref.current) {
      const currentValue = multiline ? ref.current.innerText : ref.current.textContent;
      if (currentValue !== value) {
        if (multiline) {
          ref.current.innerText = value || "";
        } else {
          ref.current.textContent = value || "";
        }
      }
    }
  }, [value, multiline]);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all duration-150 cursor-text min-w-[30px] min-h-[1em] inline-block w-full ${className} ${multiline ? 'whitespace-pre-wrap' : ''}`}
      onInput={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(commit, 400);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
    />
  );
};

export default EditableText;
