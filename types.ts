


// Data Models

export type AppLanguage = 'zh' | 'en';

export interface QaScores {
  accuracy: number;
  terminology: number;
  layout: number;
  grammar: number;
  formatting: number;
  localizationTone: number;
}

export interface QaIssue {
  id: string;
  location: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  issueCategory: 'Layout' | 'Mistranslation' | 'Terminology' | 'Formatting' | 'Grammar' | 'Style' | 'Other';
  severity: 'Critical' | 'Major' | 'Minor';
  sourceText: string;
  targetText: string;
  description: string; // Renamed from descriptionZh
  suggestionsTarget: string[];
  glossarySource?: string; // Which glossary file this terminology issue was matched against
  glossaryTermId?: string; // Unique ID (e.g. TERM-001) for strict hallucination prevention
}

export interface ScreenshotReport {
  screenshotId: string;
  overall: {
    qualityLevel: 'Critical' | 'Poor' | 'Average' | 'Good' | 'Perfect';
    scores: QaScores;
    sceneDescription: string; // Renamed from sceneDescriptionZh
    mainProblemsSummary: string; // Renamed from mainProblemsSummaryZh
  };
  issues: QaIssue[];
  summary: { // Renamed from summaryZh
    severeCount: number;
    majorCount: number;
    minorCount: number;
    optimizationAdvice: string;
    termAdvice: string;
  };
}

export type SupportedLocale = 'de-DE' | 'fr-FR';

export interface ScreenshotPair {
  id: string;
  fileName: string;
  enImageUrl: string;
  deImageUrl: string; // Keeping variable name for compatibility, but represents target image
  targetLanguage: SupportedLocale; 
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  report?: ScreenshotReport;
  errorMessage?: string;
}

export interface GlobalSummary {
  totalAnalyzed: number;
  totalPending: number;
  qualityDistribution: Record<string, number>;
  severityCounts: {
    critical: number;
    major: number;
    minor: number;
  };
  categoryCounts: Record<string, number>;
}

export interface LlmRequestPayload {
  screenshotId: string;
  enImageBase64?: string; // Or URL
  deImageBase64?: string; // Or URL (Target Image)
  targetLanguage: SupportedLocale;
  glossaryText?: string;
  reportLanguage: AppLanguage; // Add report language preference
}

export interface LlmResponse {
  report: ScreenshotReport;
}

export interface BulkProcessingState {
  isProcessing: boolean;
  total: number;
  completed: number;
  success: number;
  failed: number;
  errors: Array<{ id: string; fileName: string; error: string }>;
  isComplete: boolean;
}