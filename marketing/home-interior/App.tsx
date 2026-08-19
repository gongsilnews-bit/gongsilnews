import React, { useState } from 'react';
import type { DesignInputs, ImageFile, SimulationResult } from './types';
import { generateRemodelingSimulation } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import DesignForm from './components/DesignForm';
import ResultDisplay from './components/ResultDisplay';
import SaveProjectModal from './components/SaveProjectModal';
import ProjectLoadModal from './components/ProjectLoadModal';
import { ROOM_OPTIONS, INTERIOR_STYLES, CEILING_STYLES, FLOOR_MATERIALS, WALL_MATERIALS, LIGHTING_MOODS, FURNITURE_TONES } from './constants';

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [designInputs, setDesignInputs] = useState<DesignInputs>({
    roomType: ROOM_OPTIONS[0].name,
    style: [INTERIOR_STYLES[0].name],
    ceiling: [CEILING_STYLES[0].name],
    floor: [FLOOR_MATERIALS[0].name],
    wall: [WALL_MATERIALS[0].name],
    lighting: [LIGHTING_MOODS[0].name],
    furniture: [FURNITURE_TONES[0].name],
    versions: 2,
    aspectRatio: '4:3',
  });
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cloud Save / Load States
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('');

  // Auto load vacancy photos from URL query ?vacancy_id=...
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get('vacancy_id');
    if (!vacancyId) return;

    async function loadVacancyImages(id: string) {
      try {
        const res = await fetch(`/api/vacancy/detail?id=${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const v = json.data;
          const photos = json.photos || v.vacancy_photos || [];
          if (photos.length > 0) {
            const loadedImages: ImageFile[] = [];
            for (let i = 0; i < Math.min(photos.length, 3); i++) {
              const photoUrl = photos[i].url;
              try {
                const imgRes = await fetch(photoUrl);
                const blob = await imgRes.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    resolve(dataUrl.split(',')[1]);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                loadedImages.push({
                  id: `vac_${i}_${Date.now()}`,
                  file: new File([blob], `vacancy_photo_${i + 1}.jpg`, { type: blob.type || 'image/jpeg' }),
                  previewUrl: photoUrl,
                  base64: base64,
                  type: blob.type || 'image/jpeg'
                });
              } catch (e) {
                console.warn("Failed to convert photo url to base64:", photoUrl, e);
              }
            }
            if (loadedImages.length > 0) {
              setImageFiles(loadedImages);
              setCurrentProjectTitle(`${v.building_name || '공실매물'} 내부 인테리어`);
            }
          }
        }
      } catch (err) {
        console.warn("Auto load vacancy failed:", err);
      }
    }
    loadVacancyImages(vacancyId);
  }, []);

  const handleGenerate = async () => {
    if (imageFiles.length === 0) {
      setError('최소 1장의 아파트 내부 사진을 업로드해주세요.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setResults([]);

    try {
      const simulationResults = await generateRemodelingSimulation(imageFiles, designInputs);
      setResults(simulationResults);
    } catch (err: any) {
      console.error("Simulation generation error:", err);
      setError(err?.message ? `오류: ${err.message}` : '시뮬레이션 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = (projectData: any, title: string, id: string) => {
    if (!projectData) return;
    setCurrentProjectId(id);
    setCurrentProjectTitle(title);
    if (projectData.imageFiles) setImageFiles(projectData.imageFiles);
    if (projectData.designInputs) setDesignInputs(projectData.designInputs);
    if (projectData.results) setResults(projectData.results);
  };

  const allRenderedImages = results.map(r => r.imageUrl).filter(Boolean);
  const primaryThumbnail = allRenderedImages[0] || (imageFiles[0]?.previewUrl);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <Header
        onOpenSave={() => setShowSaveModal(true)}
        onOpenLoad={() => setShowLoadModal(true)}
        canSave={imageFiles.length > 0 || results.length > 0}
      />

      {/* Cloud Save Modal */}
      <SaveProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        appType="home-interior"
        currentProjectId={currentProjectId}
        defaultTitle={currentProjectTitle || (imageFiles[0]?.file?.name ? `홈인테리어_${imageFiles[0].file.name.split('.')[0]}` : '')}
        thumbnailUrl={primaryThumbnail}
        imageUrls={allRenderedImages}
        projectData={{
          version: '1.0',
          appType: 'home-interior',
          imageFiles,
          designInputs,
          results,
        }}
        onSaved={(id, title) => {
          setCurrentProjectId(id);
          setCurrentProjectTitle(title);
        }}
      />

      {/* Cloud Load Modal */}
      <ProjectLoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        appType="home-interior"
        onLoadProject={handleLoadProject}
      />

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
          {/* Left Column: Inputs */}
          <div className="flex flex-col gap-8">
            <ImageUploader imageFiles={imageFiles} setImageFiles={setImageFiles} />
            <DesignForm designInputs={designInputs} setDesignInputs={setDesignInputs} />
            <button
              onClick={handleGenerate}
              disabled={isLoading || imageFiles.length === 0}
              className="w-full bg-[#f4a71b] text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-[#d9900d] transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>시뮬레이션 생성 중...</span>
                </>
              ) : (
                '예측 시뮬레이션 생성'
              )}
            </button>
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
          </div>

          {/* Right Column: Outputs */}
          <div className="mt-8 lg:mt-0">
            <ResultDisplay isLoading={isLoading} results={results} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;