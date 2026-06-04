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

  React.useEffect(() => {
    if (ref.current) {
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
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all duration-150 cursor-text min-w-[30px] inline-block w-full ${className} ${multiline ? 'whitespace-pre-wrap' : ''}`}
      onBlur={(e) => {
        onChange(multiline ? e.currentTarget.innerText || "" : e.currentTarget.textContent || "");
      }}
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
