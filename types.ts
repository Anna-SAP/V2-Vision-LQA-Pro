


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

export interface StyleGuideRule {
  ruleId: string;
  language: string;
  category: string;
  section: string;
  description: string;
  exampleCorrect?: string;
  exampleIncorrect?: string;
  notes?: string;
}

export interface LoadedGlossaryFile {
  id: string;
  name: string;
  count: number;
  type: 'glossary' | 'styleguide';
  terms: string[]; // Array of "Source = Target"
  rules?: StyleGuideRule[]; // For style guide
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
  issueCategory: 'Mistranslation' | 'Omission' | 'Addition' | 'Terminology' | 'Grammar' | 'Punctuation' | 'Capitalization' | 'Number Formatting' | 'Spelling' | 'Style' | 'Layout' | 'Placeholder' | 'DNT Violation' | 'Other';
  severity: 'Critical' | 'Major' | 'Minor' | 'Preferential';
  sourceText: string;
  targetText: string;
  description: string; // Renamed from descriptionZh
  suggestionRationale: string; // Explanation of WHY this fix is needed
  suggestionsTarget: string[];
  glossarySource?: string; // Which glossary file this terminology issue was matched against
  glossaryTermId?: string; // Unique ID (e.g. TERM-001) for strict hallucination prevention
  ruleId?: string; // For Style Guide issues
  ruleDescription?: string; // For Style Guide issues
  isAutoDowngraded?: boolean; // Whether the issue was auto-downgraded by the hallucination guard
  downgradeReason?: string; // Reason for auto-downgrade
  _sanitized?: boolean; // Internal flag to prevent duplicate sanitization
  _count?: number; // Internal use for consensus filtering
  _meetsConsensus?: boolean;
}

export interface ScreenshotReport {
  screenshotId: string;
  modelUsed?: string;
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
    preferentialCount: number;
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
  reverifySuggested?: boolean;
  isReverified?: boolean;
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
  styleGuideRules?: StyleGuideRule[];
  reportLanguage: AppLanguage; // Add report language preference
  onProgress?: (currentRun: number, totalRuns: number) => void;
  isReverify?: boolean;
  existingReport?: ScreenshotReport;
}

export interface BatchStats {
  isActive: boolean;
  isComplete: boolean;
  total: number;
  completed: number;
  startTime: number;
  endTime?: number;
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  suggestedReverifyCount: number;
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