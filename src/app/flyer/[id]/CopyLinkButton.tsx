"use client";

import React from "react";

export default function CopyLinkButton() {
  const handleCopy = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert("공유 링크가 클립보드에 복사되었습니다! 카카오톡이나 문자에 붙여넣어 공유하세요.");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-3 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center"
      title="공유 링크 복사"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M15.75 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3.75h-1.5a.75.75 0 010-1.5h2.25zM18 8.25a.75.75 0 01-.75.75h-1.5v1.5a.75.75 0 01-1.5 0v-2.25A.75.75 0 0115 7.5h2.25a.75.75 0 01.75.75zM12.75 12a.75.75 0 01.75-.75h1.5v-1.5a.75.75 0 011.5 0v2.25a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75z" />
        <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    </button>
  );
}
