export interface MarketingProjectSummary {
  id: string;
  title: string;
  app_type: string;
  thumbnail_url: string | null;
  image_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingProjectDetail {
  id: string;
  title: string;
  app_type: string;
  thumbnail_url: string | null;
  image_urls: string[];
  project_data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch list of saved projects for the current user
 */
export async function fetchProjectList(appType?: string): Promise<{ success: boolean; projects?: MarketingProjectSummary[]; message?: string }> {
  try {
    const url = appType ? `/api/marketing/projects?app_type=${encodeURIComponent(appType)}` : '/api/marketing/projects';
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("fetchProjectList error:", err);
    return { success: false, message: err.message || "프로젝트 목록을 불러오지 못했습니다." };
  }
}

/**
 * Fetch full data of a specific project
 */
export async function fetchProjectDetail(id: string): Promise<{ success: boolean; project?: MarketingProjectDetail; message?: string }> {
  try {
    const res = await fetch(`/api/marketing/projects/${encodeURIComponent(id)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("fetchProjectDetail error:", err);
    return { success: false, message: err.message || "프로젝트 상세 정보를 불러오지 못했습니다." };
  }
}

/**
 * Save or update project in cloud DB
 */
export async function saveProjectToCloud(params: {
  id?: string;
  app_type: string;
  title: string;
  thumbnail_url?: string;
  image_urls?: string[];
  project_data: any;
}): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const res = await fetch('/api/marketing/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("saveProjectToCloud error:", err);
    return { success: false, message: err.message || "프로젝트 저장에 실패했습니다." };
  }
}

/**
 * Delete a project from cloud DB
 */
export async function deleteProjectFromCloud(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/marketing/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("deleteProjectFromCloud error:", err);
    return { success: false, message: err.message || "프로젝트 삭제에 실패했습니다." };
  }
}
