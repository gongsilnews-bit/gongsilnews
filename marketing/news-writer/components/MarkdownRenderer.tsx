import React, { useState } from 'react';
import { ClipboardIcon } from './icons';

interface MarkdownRendererProps {
  content: string;
}

interface ContentSection {
  title: string;
  body: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);

  const handleCopy = (textToCopy: string, title: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedTitle(title);
      setTimeout(() => setCopiedTitle(null), 2000);
    });
  };

  const parseSections = (text: string): ContentSection[] => {
    if (!text) return [];

    // If no H2 headers are found, treat the whole content as one section.
    if (!text.match(/^##\s/m)) {
        return [{ title: '생성 결과', body: text }];
    }
    
    const sections = text.split(/(?=^##\s)/m).filter(s => s.trim() !== '');
    
    return sections.map(sectionText => {
      const lines = sectionText.trim().split('\n');
      const title = lines[0].replace('## ', '').trim();
      const body = lines.slice(1).join('\n').trim();
      return { title, body };
    });
  };

  const renderSectionBody = (body: string) => {
    const lines = body.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-2">
            {listItems.map((item, index) => (
              <li key={`li-${index}`} className="text-gray-700 pl-2 marker:text-[#f4a71b]" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
        listItems = [];
      }
    };
    
    const formatInline = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-gray-800">$1</em>');
    };

    lines.forEach((line, index) => {
      if (line.startsWith('#1 ') || line.startsWith('#2 ') || line.startsWith('#3 ') || line.startsWith('#4 ') || line.startsWith('#5 ')) {
        flushList();
        elements.push(<h3 key={index} className="text-xl font-extrabold mt-8 mb-4 text-[#f4a71b] border-l-4 border-[#f4a71b] pl-3 leading-none">{line}</h3>);
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={index} className="text-lg font-bold mt-6 mb-3 text-gray-800">{line.replace('### ', '')}</h3>);
      } else if (line.trim().startsWith('■')) {
        flushList();
        elements.push(<h3 key={index} className="text-lg font-bold mt-6 mb-2 text-[#f4a71b] flex items-center gap-2"><span className="text-gray-900">{line}</span></h3>);
      } else if (line.trim().startsWith('#') && line.includes(' ') && !line.startsWith('##')) {
        flushList();
        elements.push(
          <div key={`tags-${index}`} className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-gray-100">
            {line.split(' ').map((tag, tagIndex) => (
              tag.startsWith('#') && <span key={tagIndex} className="bg-gray-100 text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-[#f4a71b] hover:text-white transition-colors cursor-default">{tag}</span>
            ))}
          </div>
        );
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        listItems.push(line.substring(2));
      } else if (line.trim() === '') {
        flushList();
      }
      else {
        flushList();
        elements.push(<p key={index} dangerouslySetInnerHTML={{ __html: formatInline(line) }} className="leading-7 text-gray-700 mb-4" />);
      }
    });

    flushList();

    return elements;
  };

  const sections = parseSections(content);
  
  return (
    <div className="font-sans">
      {sections.map(({ title, body }, index) => {
        const fullSectionText = `## ${title}\n${body}`;
        const isCopied = copiedTitle === title;
        return (
          <React.Fragment key={index}>
            <div className="group mb-8">
              <div className="flex justify-between items-end border-b-2 border-gray-100 pb-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="w-2 h-8 bg-gray-900 rounded-sm inline-block"></span>
                    {title}
                </h2>
                <button
                  onClick={() => handleCopy(fullSectionText, title)}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-md transition-all duration-200 border ${
                      isCopied
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-[#f4a71b] hover:border-[#f4a71b]'
                  }`}
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  <span>{isCopied ? '복사됨' : '복사'}</span>
                </button>
              </div>
              <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                {renderSectionBody(body)}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};