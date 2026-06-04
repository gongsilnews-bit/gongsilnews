import React from 'react';

const EditableImage = ({
  src,
  alt,
  className = "",
  imageKey,
  onImageUpload,
  onDelete,
  isUploading = false,
  aspectRatioClass = "object-contain"
}: {
  src: string;
  alt: string;
  className?: string;
  imageKey: string;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDelete?: () => void;
  isUploading?: boolean;
  aspectRatioClass?: "object-contain" | "object-cover";
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const placeholder = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      await onImageUpload(imageKey, file);
    }
  };

  return (
    <div className={`group relative w-full h-full bg-[#0f172a]/95 rounded-2xl overflow-hidden shadow-md border border-gray-100 ${className}`}>
      {/* Hidden file input */}
      {onImageUpload && (
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      )}

      {/* Double layer for portrait background blur */}
      {aspectRatioClass === "object-contain" ? (
        <>
          <img 
            src={src || placeholder} 
            alt={`${alt} Blur`} 
            className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-50 scale-110 pointer-events-none" 
          />
          <img 
            src={src || placeholder} 
            alt={alt} 
            className="relative w-full h-full object-contain z-10" 
          />
        </>
      ) : (
        <img 
          src={src || placeholder} 
          alt={alt} 
          className="w-full h-full object-cover" 
        />
      )}

      {/* Hover overlay with direct upload action (print:hidden) */}
      {onImageUpload && (
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center z-20 print:hidden text-white gap-2">
          <div className="flex flex-col sm:flex-row gap-2 px-4 w-full justify-center items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span>업로드/변경</span>
            </button>
            
            {src && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none"
                title="사진 삭제"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>사진 삭제</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator (print:hidden) */}
      {isUploading && (
        <div className="absolute inset-0 bg-slate-900/80 z-[25] flex flex-col items-center justify-center print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
          <span className="text-[10px] text-amber-500 font-bold">WebP 최적화 업로드 중...</span>
        </div>
      )}
    </div>
  );
};

export default EditableImage;
