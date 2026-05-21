
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
    <div className="w-full">
       {label && <label htmlFor="tag-input" className="block text-sm font-bold text-gray-700 mb-2">{label}</label>}
       <div className="flex flex-wrap items-center w-full bg-white border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-[#f4a71b] focus-within:border-[#f4a71b] transition-all">
            {tags.map((tag, index) => (
                <div key={index} className="flex items-center bg-[#f4a71b] text-white rounded-full px-3 py-1 text-sm font-bold mr-2 mb-2 shadow-sm">
                    {tag}
                    <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-white hover:text-gray-100 focus:outline-none"
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
                className="bg-transparent flex-grow p-1 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
            />
       </div>

    </div>
  );
};
