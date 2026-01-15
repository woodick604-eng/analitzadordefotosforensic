
/* Corrected PhotoAnalysis interface to include summaries and usage metadata */
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

/* Corrected AnalysisResultData interface to include natNumber and total usage */
export interface AnalysisResultData {
  natNumber: string;
  valuation: string;
  photoAnalyses: PhotoAnalysis[];
  totalUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    cost: number;
  };
}
