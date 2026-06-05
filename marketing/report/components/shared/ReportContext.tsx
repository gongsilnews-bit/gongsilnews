import { createContext } from 'react';
import { PropertyInfo, FlyerColor } from '../../types';

export interface ReportContextType {
  isAdClosed: boolean;
  info?: PropertyInfo;
  colorTheme?: FlyerColor;
}

export const ReportContext = createContext<ReportContextType>({
  isAdClosed: false,
});
