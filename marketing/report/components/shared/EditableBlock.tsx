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
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded p-1 transition-all duration-150 cursor-text whitespace-pre-wrap ${className}`}
      onBlur={(e) => {
        onChange(e.currentTarget.textContent || "");
      }}
      placeholder={placeholder}
    />
  );
};

export default EditableBlock;
