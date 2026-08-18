import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { SimulationResult } from '../types';
import { AlertTriangleIcon, DownloadIcon, FileTextIcon } from './icons';

// Declare types for CDN-loaded libraries to satisfy TypeScript
declare const html2canvas: any;
declare const jspdf: any;

interface ResultDisplayProps {
  isLoading: boolean;
  results: SimulationResult[];
}

const SPEC_LABELS: { [key: string]: string } = {
  roomType: '공간 유형',
  style: '스타일',
  ceiling: '천장 마감',
  floor: '바닥재',
  wall: '벽면 마감',
  lighting: '조명',
  furniture: '가구/소품',
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-gray-800 p-6 rounded-lg">
    <svg className="animate-spin h-10 w-10 text-[#f4a71b] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <h3 className="text-lg font-semibold text-gray-200">AI가 최적의 인테리어 디자인을 분석하고 있습니다.</h3>
    <p className="text-gray-400 mt-1">잠시만 기다려주세요. 최대 1~2분 소요될 수 있습니다.</p>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-gray-800 border border-dashed border-gray-700 p-6 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <h3 className="text-lg font-semibold text-gray-200 mt-4">시뮬레이션 결과가 여기에 표시됩니다.</h3>
    <p className="text-gray-400 mt-1">좌측의 정보를 입력하고 생성 버튼을 눌러주세요.</p>
  </div>
);

const SpecTable: React.FC<{ spec: SimulationResult['textData']['designSpec'] }> = ({ spec }) => (
    <div className="space-y-2 text-sm">
        {Object.entries(spec).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-2">
                <span className="font-semibold text-gray-400 capitalize col-span-1">{SPEC_LABELS[key] || key}</span>
                <span className="text-gray-200 col-span-2">{value}</span>
            </div>
        ))}
    </div>
);

// Component designed specifically for PDF export with a light theme
const PdfContent: React.FC<{ result: SimulationResult; version: number }> = ({ result, version }) => (
  <div style={{ width: '800px', fontFamily: "'Noto Sans KR', sans-serif" }} className="p-12 bg-white text-gray-800">
    <header className="mb-8 pb-4 border-b border-gray-200 text-center">
      <h1 className="text-3xl font-bold text-gray-900">공실뉴스 아파트 내부 인테리어 예측 시뮬레이션</h1>
      <p className="text-lg text-gray-500 mt-2">AI 기반 디자인 제안서</p>
    </header>

    <main>
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 pb-2 text-[#c2820b] border-b border-gray-200">
          Version {version} | 인테리어 예측 렌더링
        </h2>
        <div className="flex justify-center">
          <img src={result.image} alt={`Interior Simulation Version ${version}`} className="max-w-full h-auto border border-gray-200 rounded-lg shadow-md" />
        </div>
      </section>

      <section className="mb-10 p-6 bg-[#fffbf0] border border-[#ffe0b2] rounded-lg">
        <h3 className="text-xl font-bold text-[#946000] mb-3">차별화 포인트</h3>
        <p className="text-base text-gray-700">{result.textData.versionDiffKo}</p>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">디자인 사양표</h3>
        <div className="space-y-3">
          {Object.entries(result.textData.designSpec).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-4 items-center">
              <span className="font-semibold text-gray-500 col-span-1">{SPEC_LABELS[key] || key}</span>
              <span className="text-gray-800 col-span-2">{value}</span>
            </div>
          ))}
        </div>
      </section>

       <section className="mb-10">
        <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">제약/보존 규칙</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{result.textData.constraints}</p>
      </section>

      <footer className="pt-6 mt-6">
         <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <p className="font-bold">주의 문구</p>
            <p className="text-sm mt-1">{result.textData.disclaimer}</p>
          </div>
      </footer>
    </main>
  </div>
);

const PdfContentDark: React.FC<{ result: SimulationResult; version: number }> = ({ result, version }) => (
  <div style={{ width: '800px', fontFamily: "'Noto Sans KR', sans-serif" }} className="p-12 bg-gray-900 text-gray-200">
    <header className="mb-8 pb-4 border-b border-gray-700 text-center">
      <h1 className="text-3xl font-bold text-gray-100">공실뉴스 아파트 내부 인테리어 예측 시뮬레이션</h1>
      <p className="text-lg text-gray-400 mt-2">AI 기반 디자인 제안서</p>
    </header>

    <main>
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 pb-2 text-[#f4a71b] border-b border-gray-700">
          Version {version} | 인테리어 예측 렌더링
        </h2>
        <div className="flex justify-center">
          <img src={result.image} alt={`Interior Simulation Version ${version}`} className="max-w-full h-auto border border-gray-700 rounded-lg" />
        </div>
      </section>

      <section className="mb-10 p-6 bg-[#f4a71b]/10 border border-[#f4a71b]/30 rounded-lg">
        <h3 className="text-xl font-bold text-[#fbd588] mb-3">차별화 포인트</h3>
        <p className="text-base text-gray-300">{result.textData.versionDiffKo}</p>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-bold text-gray-100 mb-4 pb-2 border-b border-gray-700">디자인 사양표</h3>
        <div className="space-y-3">
          {Object.entries(result.textData.designSpec).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-4 items-center">
              <span className="font-semibold text-gray-400 col-span-1">{SPEC_LABELS[key] || key}</span>
              <span className="text-gray-200 col-span-2">{value}</span>
            </div>
          ))}
        </div>
      </section>

       <section className="mb-10">
        <h3 className="text-xl font-bold text-gray-100 mb-4 pb-2 border-b border-gray-700">제약/보존 규칙</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{result.textData.constraints}</p>
      </section>

      <footer className="pt-6 mt-6">
         <div className="p-4 bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-300">
            <p className="font-bold text-yellow-200">주의 문구</p>
            <p className="text-sm mt-1">{result.textData.disclaimer}</p>
          </div>
      </footer>
    </main>
  </div>
);


const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, results }) => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (results.length > 0 && activeTab >= results.length) {
      setActiveTab(0);
    }
  }, [results, activeTab]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (results.length === 0) {
    return <EmptyState />;
  }
  
  const activeResult = results[activeTab];

  const handleDownloadImage = (result: SimulationResult, index: number) => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.image;
    link.download = `interior-simulation-v${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePdf = async (result: SimulationResult, index: number, isDarkMode: boolean) => {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined' || !result) {
      console.error('PDF generation libraries not loaded.');
      return;
    }
  
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
  
    const root = ReactDOM.createRoot(container);
  
    try {
      await new Promise<void>(resolve => {
        root.render(
          <React.StrictMode>
            {isDarkMode ? (
              <PdfContentDark result={result} version={index + 1} />
            ) : (
              <PdfContent result={result} version={index + 1} />
            )}
          </React.StrictMode>
        );
        setTimeout(resolve, 500);
      });
  
      const { jsPDF } = jspdf;
      const content = container.firstElementChild as HTMLElement;
      if (!content) throw new Error("PDF content not rendered.");
  
      const canvas = await html2canvas(content, { useCORS: true, scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (isDarkMode) {
        pdf.setFillColor(17, 24, 39);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      }
      
      const canvasAspectRatio = canvas.width / canvas.height;
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / canvasAspectRatio;
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = pdfHeight * canvasAspectRatio;
      }
      
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      const theme = isDarkMode ? 'dark' : 'light';
      pdf.save(`interior-simulation-v${index + 1}-${theme}.pdf`);
  
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      root.unmount();
      document.body.removeChild(container);
    }
  };

  const handleDownloadAll = async () => {
    for (const [index, result] of results.entries()) {
      handleDownloadImage(result, index);
      // Add a small delay to allow the browser to process the image download before starting the intensive PDF generation
      await new Promise(resolve => setTimeout(resolve, 300));
      await generatePdf(result, index, false);
      await new Promise(resolve => setTimeout(resolve, 300));
      await generatePdf(result, index, true);
    }
  };


  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-200">시뮬레이션 결과</h2>
        <button
          onClick={handleDownloadAll}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#f4a71b] rounded-md hover:bg-[#d9900d] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          title="모든 버전 다운로드"
          disabled={results.length === 0}
        >
          <DownloadIcon className="w-4 h-4" />
          <span>전체 다운로드</span>
        </button>
      </div>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {results.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                activeTab === index
                  ? 'border-[#f4a71b] text-[#f4a71b]'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              Version {index + 1}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-8">
        {activeResult && (
           <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#f4a71b]">Version {activeTab + 1}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadImage(activeResult, activeTab)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  title="이미지 저장"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>이미지</span>
                </button>
                <button
                  onClick={() => generatePdf(activeResult, activeTab, false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  title="라이트 모드 PDF 다운로드"
                >
                  <FileTextIcon className="w-4 h-4" />
                  <span>라이트 PDF</span>
                </button>
                <button
                  onClick={() => generatePdf(activeResult, activeTab, true)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  title="다크 모드 PDF 다운로드"
                >
                  <FileTextIcon className="w-4 h-4" />
                  <span>다크 PDF</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-black rounded-lg overflow-hidden">
                <img src={activeResult.image} alt={`Interior Simulation Version ${activeTab + 1}`} className="w-full h-auto object-contain" />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">버전 {activeTab + 1} 차별화 포인트</h3>
                  <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">{activeResult.textData.versionDiffKo}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">디자인 사양표</h3>
                  <div className="p-4 border border-gray-700 rounded-md">
                    <SpecTable spec={activeResult.textData.designSpec} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">제약/보존 규칙</h3>
                  <p className="text-sm text-gray-300">{activeResult.textData.constraints}</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-900/30 border-l-4 border-yellow-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-yellow-200">주의 문구</p>
                    <p className="text-sm mt-1 text-yellow-300">{activeResult.textData.disclaimer}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;