import React from 'react';
import EditableText from './EditableText';

const SectionTitle = ({ 
  title, 
  subtitle,
  onUpdateTitle,
  onUpdateSubtitle
}: { 
  title: string, 
  subtitle: string,
  onUpdateTitle?: (val: string) => void,
  onUpdateSubtitle?: (val: string) => void
}) => (
    <div className="mb-4 flex items-center gap-2">
        <h3 className="text-gray-500 font-bold tracking-widest uppercase text-sm">
            {onUpdateTitle ? (
                <EditableText 
                    value={title} 
                    onChange={onUpdateTitle} 
                    className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 text-gray-700 rounded px-1 transition-all cursor-text min-w-[120px] inline-block"
                />
            ) : title}
        </h3>
        <span className="text-gray-300">|</span>
        <span className="text-gray-800 font-bold text-sm">
            {onUpdateSubtitle ? (
                <EditableText 
                    value={subtitle} 
                    onChange={onUpdateSubtitle} 
                    className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 text-gray-800 rounded px-1 transition-all cursor-text min-w-[60px] inline-block"
                />
            ) : subtitle}
        </span>
    </div>
);

export default SectionTitle;
