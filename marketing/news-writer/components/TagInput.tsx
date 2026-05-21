import React, { useState } from 'react';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  label: string;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, setTags, label }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
       <label htmlFor="tag-input" className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
       <div className="flex flex-wrap items-center w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-[#f4a71b] focus-within:border-[#f4a71b] transition-all">
            {tags.map((tag, index) => (
                <div key={index} className="flex items-center bg-[#f4a71b]/20 text-[#f4a71b] border border-[#f4a71b]/30 rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2">
                    {tag}
                    <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-[#f4a71b] hover:text-white focus:outline-none"
                    aria-label={`Remove ${tag}`}
                    >
                    &times;
                    </button>
                </div>
            ))}
            <input
                id="tag-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="태그 입력 후 Enter..."
                className="bg-transparent flex-grow p-1 text-slate-200 placeholder-slate-500 focus:outline-none min-w-[150px]"
            />
       </div>

    </div>
  );
};
