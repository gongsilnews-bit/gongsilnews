import React, { useState } from 'react';
import { saveProjectToCloud } from '../services/cloudProjectService';
import { convertToWebP } from '../services/imageUtils';
import { Bookmark, CheckCircle, Loader2, X, AlertCircle, Sparkles } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  appType: string;
  currentProjectId?: string;
  defaultTitle?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  projectData: any;
  onSaved: (id: string, title: string) => void;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  appType,
  currentProjectId,
  defaultTitle = '',
  thumbnailUrl,
  imageUrls = [],
  projectData,
  onSaved,
}) => {
  const [title, setTitle] = useState(defaultTitle || `리모델링_${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string>('저장 중...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("프로젝트 제목을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavingStatus('WebP 초경량 압축 최적화 중...');

    try {
      // 1. Convert simulation results to WebP (0.85)
      const rawResults = projectData?.results || [];
      const compressedResults = await Promise.all(
        rawResults.map(async (r: any) => {
          if (r.image) {
            const webpImage = await convertToWebP(r.image, 0.85);
            return { ...r, image: webpImage };
          }
          return r;
        })
      );

      // 2. Convert input imageFiles to WebP
      const rawImageFiles = projectData?.imageFiles || [];
      const compressedImageFiles = await Promise.all(
        rawImageFiles.map(async (f: any) => {
          if (f.base64) {
            const dataUrl = f.base64.startsWith('data:') ? f.base64 : `data:${f.type || 'image/jpeg'};base64,${f.base64}`;
            const webpUrl = await convertToWebP(dataUrl, 0.85);
            const match = webpUrl.match(/^data:(.+);base64,(.+)$/);
            return {
              ...f,
              type: match ? match[1] : (f.type || 'image/jpeg'),
              base64: match ? match[2] : f.base64,
              previewUrl: webpUrl,
            };
          }
          return f;
        })
      );

      // 3. Convert thumbnail and preview image list
      const rawThumb = thumbnailUrl || (compressedResults[0]?.image) || (compressedImageFiles[0]?.previewUrl);
      const compressedThumbnail = rawThumb ? await convertToWebP(rawThumb, 0.85, 800) : undefined;
      const compressedImageUrls = await Promise.all(
        (imageUrls.length > 0 ? imageUrls : compressedResults.map((r: any) => r.image).filter(Boolean)).map(
          (u: string) => convertToWebP(u, 0.85, 1200)
        )
      );

      setSavingStatus('클라우드 DB에 안전하게 보관 중...');

      const res = await saveProjectToCloud({
        id: currentProjectId,
        app_type: appType,
        title: title.trim(),
        thumbnail_url: compressedThumbnail,
        image_urls: compressedImageUrls,
        project_data: {
          ...projectData,
          results: compressedResults,
          imageFiles: compressedImageFiles,
        },
      });

      if (res.success && res.id) {
        setSuccess(true);
        setTimeout(() => {
          onSaved(res.id!, title.trim());
          onClose();
          setSuccess(false);
        }, 800);
      } else {
        if (res.message === '로그인이 필요한 기능입니다.' || res.message === '로그인이 필요합니다.') {
          setError("로그인이 필요한 기능입니다. 공실뉴스에 로그인 후 다시 시도해 주세요.");
        } else {
          setError(res.message || "저장에 실패했습니다.");
        }
      }
    } catch (err: any) {
      setError(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#f4a71b]/20 text-[#f4a71b] rounded-xl">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-100">내 계정에 프로젝트 저장</h3>
            <p className="text-xs text-gray-400">클라우드 DB에 영구 보관하여 언제든 불러올 수 있습니다.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle className="w-12 h-12 text-green-400 animate-bounce" />
            <h4 className="text-base font-bold text-gray-100">내 보관함에 안전하게 저장되었습니다!</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                프로젝트 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 논현동 상가주택 외관 리모델링 1안"
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#f4a71b] transition"
                autoFocus
              />
            </div>

            {thumbnailUrl && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">대표 썸네일 미리보기</label>
                <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-700 bg-black/60 flex items-center justify-center">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="flex-1 py-2.5 px-4 bg-[#f4a71b] hover:bg-[#d9900d] text-black text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:text-gray-500"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4 fill-current" />}
                {isSaving ? savingStatus : '저장 완료'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SaveProjectModal;
