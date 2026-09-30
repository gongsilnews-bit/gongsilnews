import React, { useState, useEffect } from 'react';
import { fetchProjectList, fetchProjectDetail, deleteProjectFromCloud, MarketingProjectSummary } from '../services/cloudProjectService';
import { FolderOpen, Trash2, Calendar, Loader2, X, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface ProjectLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  appType: string;
  onLoadProject: (projectData: any, title: string, id: string) => void;
}

export const ProjectLoadModal: React.FC<ProjectLoadModalProps> = ({
  isOpen,
  onClose,
  appType,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<MarketingProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchProjectList(appType);
      if (res.success && res.projects) {
        setProjects(res.projects);
      } else {
        if (res.message === '로그인이 필요합니다.') {
          setError('로그인이 필요한 기능입니다. 공실뉴스에 로그인 후 보관함을 확인해 주세요.');
        } else {
          setError(res.message || '프로젝트 목록을 불러오지 못했습니다.');
        }
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, appType]);

  if (!isOpen) return null;

  const handleSelectProject = async (id: string, title: string) => {
    setLoadingProjectId(id);
    try {
      const res = await fetchProjectDetail(id);
      if (res.success && res.project) {
        onLoadProject(res.project.project_data, title, id);
        onClose();
      } else {
        alert(res.message || '프로젝트를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`'${title}' 프로젝트를 보관함에서 삭제하시겠습니까?`)) return;

    setDeletingProjectId(id);
    try {
      const res = await deleteProjectFromCloud(id);
      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(res.message || '삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#f4a71b]/20 text-[#f4a71b] rounded-xl">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                내 프로젝트 보관함
                <span className="text-xs bg-[#f4a71b] text-black font-extrabold px-2 py-0.5 rounded-full">
                  {projects.length}개
                </span>
              </h3>
              <p className="text-xs text-gray-400">저장된 작업을 선택하면 화면에 즉시 복원됩니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadList}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-800/40 border-b border-gray-800">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="보관된 프로젝트 검색..."
            className="w-full px-3.5 py-2 bg-gray-850 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#f4a71b] transition"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 border-3 border-[#f4a71b] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">내 보관함 프로젝트를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-gray-400">
              <FolderOpen className="w-12 h-12 text-gray-600 mb-1" />
              <p className="text-sm font-semibold">보관된 프로젝트가 없습니다.</p>
              <p className="text-xs text-gray-500">작업 후 상단의 [💾 저장] 버튼을 눌러 보관해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const dateStr = new Date(item.updated_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const isCurrentLoading = loadingProjectId === item.id;
                const isCurrentDeleting = deletingProjectId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectProject(item.id, item.title)}
                    className="group bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-[#f4a71b] rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between shadow-md hover:shadow-xl relative"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-36 bg-black/60 relative overflow-hidden flex items-center justify-center">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-500">
                          <Sparkles className="w-8 h-8 opacity-40" />
                          <span className="text-[10px]">미리보기 없음</span>
                        </div>
                      )}
                      {item.image_count > 1 && (
                        <span className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white font-bold px-1.5 py-0.5 rounded">
                          +{item.image_count}장
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-100 line-clamp-1 group-hover:text-[#f4a71b] transition">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-gray-700/60 flex items-center justify-between">
                        <button
                          disabled={isCurrentLoading}
                          className="text-xs font-bold text-[#f4a71b] group-hover:underline flex items-center gap-1"
                        >
                          {isCurrentLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                          {isCurrentLoading ? '불러오는 중...' : '불러오기'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, item.title, e)}
                          disabled={isCurrentDeleting}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                          title="삭제"
                        >
                          {isCurrentDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectLoadModal;
