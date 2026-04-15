// 관리자 페이지 공통 타입 정의

export interface AdminTheme {
  bg: string;
  sidebarBg: string;
  headerBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  darkMode: boolean;
}

export interface AdminSectionProps {
  theme: AdminTheme;
}

export function computeTheme(darkMode: boolean): AdminTheme {
  return {
    bg: darkMode ? "#1a1b1e" : "#f4f5f7",
    sidebarBg: darkMode ? "#000" : "#111111",
    headerBg: darkMode ? "#25262b" : "#fff",
    cardBg: darkMode ? "#25262b" : "#fff",
    textPrimary: darkMode ? "#e1e4e8" : "#111827",
    textSecondary: darkMode ? "#9ca3af" : "#6b7280",
    border: darkMode ? "#333" : "#e1e4e8",
    darkMode,
  };
}

export type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactElement;
  dividerBefore?: boolean;
  separated?: boolean;
  submenus?: { key: string; label: string }[];
};
