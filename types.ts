
export type ExportResolution = 'HD' | 'HD_PLUS' | 'FULL_HD';

export interface ManagedFile {
  id: string;
  file: File;
  preview: string;
}

export interface PhotoAnalysis {
  fileName: string;
  url: string;
  title: string;
  description: string;
  summaries: string[];
  recommendedSummaryIndex: number; 
  category: string;
  isKeyEvidence?: boolean;
  dateTime?: string | null;
  gps?: {
    lat: number;
    lng: number;
  } | null;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export interface AnalysisResultData {
  natNumber: string;
  valuation: string;
  resolution: ExportResolution;
  photoAnalyses: PhotoAnalysis[];
  expertConclusion?: string;
  totalUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    cost: number;
  };
}
