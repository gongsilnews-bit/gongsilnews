
import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon, XMarkIcon } from './icons';

interface MarkdownRendererProps {
  title: string;
  body: string;
  originalIndex: number;
  onSave?: (newBody: string, index: number) => void;
  onSectionContextMenu?: (e: React.MouseEvent, index: number) => void;
  isIntro?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  title, 
  body, 
  originalIndex, 
  onSave, 
  onSectionContextMenu,
  isIntro = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(body);

  const handleCopy = () => {
    const fullText = isIntro ? body : `## ${title}\n${body}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editValue, originalIndex);
      setIsEditing(false);
    }
  };

  const handleBodyClick = () => {
    if (!onSave || isEditing) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    setIsEditing(true);
    setEditValue(body);
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-800">$1</em>');
  };

  const renderSectionBody = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-2">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} dangerouslySetInnerHTML={{ __html: formatInline(item) }} className="pl-1" />
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={idx} className="text-xl font-bold mt-8 mb-4 text-gray-900 border-b pb-2">{trimmedLine.replace('### ', '')}</h3>);
      } else if (trimmedLine.startsWith('#1 ') || trimmedLine.startsWith('#2 ') || trimmedLine.startsWith('#3 ') || trimmedLine.startsWith('#4 ') || trimmedLine.startsWith('#5 ')) {
        flushList();
        elements.push(<h3 key={idx} className="text-lg font-bold mt-6 mb-3 text-[#f4a71b]">{trimmedLine}</h3>);
      } else if (trimmedLine.startsWith('■')) {
        flushList();
        elements.push(<p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(trimmedLine) }} className="leading-relaxed mb-1 text-gray-800 font-medium" />);
      } else if (trimmedLine.startsWith('#') && trimmedLine.includes(' ')) {
        flushList();
        elements.push(
          <div key={`tags-${idx}`} className="flex flex-wrap items-center gap-2 mt-6">
            {trimmedLine.split(' ').map((tag, tIdx) => (
              tag.startsWith('#') && <span key={tIdx} className="bg-[#f4a71b]/10 text-[#f4a71b] text-sm font-bold px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        );
      } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        listItems.push(trimmedLine.substring(2));
      } else if (trimmedLine === '') {
        flushList();
      } else {
        flushList();
        elements.push(<p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} className="leading-relaxed mb-4" />);
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 m-0">{isIntro ? '기본 요약' : title}</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>저장</span>
              </button>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 shadow-sm transition-all">
                <XMarkIcon className="w-3.5 h-3.5" />
                <span>취소</span>
              </button>
            </>
          ) : (
            <button onClick={handleCopy} className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all shadow-sm border ${copied ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
              <ClipboardIcon className="w-3.5 h-3.5" />
              <span>{copied ? '완료' : '복사'}</span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="animate-in fade-in duration-200">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-5 text-gray-900 focus:ring-2 focus:ring-[#f4a71b] outline-none resize-y font-mono text-sm leading-relaxed min-h-[400px]"
            spellCheck={false}
            autoFocus
          />
        </div>
      ) : (
        <div 
          onClick={handleBodyClick}
          onContextMenu={(e) => onSectionContextMenu && onSectionContextMenu(e, originalIndex)}
          className="cursor-pointer hover:bg-gray-50/50 p-4 -m-4 rounded-xl transition-colors relative group/body border border-transparent hover:border-gray-100"
          title="클릭하여 수정"
        >
          <div className="absolute top-0 right-0 opacity-0 group-hover/body:opacity-100 transition-opacity bg-[#f4a71b] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg shadow-sm pointer-events-none">
            클릭하여 수정
          </div>
          {renderSectionBody(body)}
        </div>
      )}
    </div>
  );
};
