import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LlmRequestPayload, LlmResponse, ScreenshotReport, QaIssue, StyleGuideRule } from '../types';
import { getAnalysisSystemPrompt, LLM_MODEL_ID, LLM_FALLBACK_MODEL_ID } from '../constants';
import { determineStrictQuality, enforceScoreConsistency } from './reportGenerator';
import { retrieveSkills, formatSkillsForPrompt } from './lqaSkillBank';

interface ProcessedImage {
  mimeType: string;
  data: string;
}

// Define the Strict Schema for Gemini API
// This forces the model to output exactly this structure, eliminating missing fields.
const qaIssueSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "e.g., Issue-01" },
    location: { type: Type.STRING, description: "Where the issue is located in the UI" },
    issueCategory: { 
      type: Type.STRING, 
      description: "One of: Mistranslation, Omission, Addition, Terminology, Grammar, Punctuation, Capitalization, Number Formatting, Spelling, Style, Layout, Placeholder, DNT Violation, Other" 
    },
    severity: { 
      type: Type.STRING, 
      description: "Critical, Major, Minor, or Preferential" 
    },
    sourceText: { type: Type.STRING },
    targetText: { type: Type.STRING },
    description: { type: Type.STRING, description: "Detailed explanation of the issue" },
    suggestionRationale: {
      type: Type.STRING,
      description: "A short, persuasive explanation for the developer (non-native speaker) on WHY this must be fixed. E.g., 'Critical for legal compliance', 'Prevents UI breakage', or 'Standard industry convention'."
    },
    suggestionsTarget: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "MANDATORY. Provide at least one actionable fix. For Truncation: provide a shorter translation/abbreviation. For Layout: suggest 'Resize container' or similar. NEVER leave empty."
    },
    glossarySource: {
      type: Type.STRING,
      description: "REQUIRED for Terminology issues ONLY. The exact filename from the [source: filename] tag in the glossary data that this term was matched against. Leave empty string for non-Terminology issues."
    },
    glossaryTermId: {
      type: Type.STRING,
      description: "Leave empty."
    },
    ruleId: {
      type: Type.STRING,
      description: "Leave empty. Populated in post-processing."
    },
    ruleDescription: {
      type: Type.STRING,
      description: "Leave empty."
    }
  },
  required: ["id", "location", "issueCategory", "severity", "description", "suggestionRationale", "suggestionsTarget"]
};

const scoresSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    accuracy: { type: Type.NUMBER },
    terminology: { type: Type.NUMBER },
    layout: { type: Type.NUMBER },
    grammar: { type: Type.NUMBER },
    formatting: { type: Type.NUMBER },
    localizationTone: { type: Type.NUMBER }
  },
  required: ["accuracy", "terminology", "layout", "grammar", "formatting", "localizationTone"]
};

const overallSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    qualityLevel: { 
      type: Type.STRING, 
      description: "Critical, Poor, Average, Good, or Perfect" 
    },
    scores: scoresSchema,
    sceneDescription: { type: Type.STRING },
    mainProblemsSummary: { type: Type.STRING }
  },
  required: ["qualityLevel", "scores", "sceneDescription", "mainProblemsSummary"]
};

const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    severeCount: { type: Type.NUMBER },
    majorCount: { type: Type.NUMBER },
    minorCount: { type: Type.NUMBER },
    preferentialCount: { type: Type.NUMBER },
    optimizationAdvice: { type: Type.STRING },
    termAdvice: { type: Type.STRING }
  },
  required: ["severeCount", "majorCount", "minorCount", "preferentialCount", "optimizationAdvice"]
};

const reportResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    screenshotId: { type: Type.STRING },
    overall: overallSchema,
    issues: {
      type: Type.ARRAY,
      items: qaIssueSchema
    },
    summary: summarySchema
  },
  required: ["overall", "issues", "summary"]
};

// --- NEW: Verification Schema for Self-Correction Loop ---
const verificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verifiedIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "The Issue ID from the input list" },
          isValid: { type: Type.BOOLEAN, description: "True if the issue is a real bug; False if it is a hallucination or negligible" },
          reason: { type: Type.STRING, description: "Brief explanation for the verdict" },
          refinedSeverity: { type: Type.STRING, description: "Optional: Suggest a more accurate severity if needed" },
          refinedRationale: { type: Type.STRING, description: "Optional: Suggest a better explanation of WHY this must be fixed" }
        },
        required: ["id", "isValid", "reason"]
      }
    }
  },
  required: ["verifiedIssues"]
};

// Helper to convert URL (Blob or Remote) to Base64 data and mime type
async function processImageUrl(url: string): Promise<ProcessedImage> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Format: "data:image/png;base64,iVBOR..."
        const match = base64String.match(/^data:(.+);base64,(.+)$/);
        
        if (match) {
          let mimeType = match[1];
          const data = match[2];

          // FIX: Gemini API rejects 'application/octet-stream' (error code 400).
          // Ensure we only send supported MIME types.
          const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
          
          if (!allowedTypes.includes(mimeType)) {
              console.warn(`Detected unsupported MIME type: ${mimeType}. Applying fallback.`);
              // Fallback strategy: 
              // If the URL suggests PNG, use PNG, otherwise default to JPEG (safer for general photos/screenshots)
              if (url.toLowerCase().endsWith('.png')) {
                  mimeType = 'image/png';
              } else {
                  mimeType = 'image/jpeg';
              }
          }

          resolve({
            mimeType: mimeType,
            data: data
          });
        } else {
          reject(new Error("Invalid data URL format after conversion"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader failed to read image blob"));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Image processing failed for URL:", url, e);
    throw e;
  }
}

// Auto-healing Retry Logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries = 2, 
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    console.warn(`LLM Call failed, retrying in ${delay}ms... (${retries} left). Error:`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Hallucination Guardrail: Sanitizes the report against the glossary ID
const sanitizeReport = (report: ScreenshotReport, glossaryText: string | undefined) => {
  if (!glossaryText) return;
  
  // Create a map of valid IDs to their source files
  // Looking for pattern [ID:TERM-xxx] ... [source: filename]
  const validIdsMap = new Map<string, string>();
  const lines = glossaryText.split('\n');
  lines.forEach(line => {
    const idMatch = line.match(/\[ID:(TERM-\d+)\]/);
    const sourceMatch = line.match(/\[source:\s*(.+?)\]/);
    if (idMatch) {
      const id = `[ID:${idMatch[1]}]`;
      const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown Source';
      validIdsMap.set(id, source);
    }
  });

  report.issues.forEach(issue => {
    if (issue.issueCategory === 'Terminology') {
      
      const termIdRaw = issue.glossaryTermId; // e.g. "TERM-001", "[ID:TERM-001]", or "001"
      let formattedId = null;
      if (termIdRaw) {
        // Extract the TERM-xxx part if it's wrapped in [ID:...]
        const match = termIdRaw.match(/TERM-\d+/);
        if (match) {
          formattedId = `[ID:${match[0]}]`;
        } else {
          // If it's just a number, prefix it with TERM-
          const numMatch = termIdRaw.match(/\d+/);
          if (numMatch) {
            formattedId = `[ID:TERM-${numMatch[0]}]`;
          } else {
            formattedId = `[ID:${termIdRaw}]`;
          }
        }
      }
      
      const isValid = formattedId && validIdsMap.has(formattedId);

      if (!isValid) {
        // Hallucination detected
        console.warn(`[Hallucination Guard] Downgrading Terminology issue ${issue.id} - Invalid ID: ${termIdRaw}`);
        issue.issueCategory = 'Terminology'; // Keep it as Terminology, just mark it as Auto-Downgraded
        issue.severity = 'Minor';
        issue.description = `[Auto-Downgraded] ${issue.description} (Reason: Terminology ID not found in glossary)`;
        // Clear the fake ID
        issue.glossaryTermId = undefined;
        issue.glossarySource = 'LLM Knowledge (Downgraded)';
      } else {
        // Valid ID! Ensure the glossarySource is correct
        const correctSource = validIdsMap.get(formattedId!);
        if (!issue.glossarySource || issue.glossarySource === 'LLM Knowledge' || issue.glossarySource !== correctSource) {
          issue.glossarySource = correctSource;
        }
      }
    }
  });
  
  // If no terminology issues remain, set terminology score to 5.
  const termIssues = report.issues.filter(i => i.issueCategory === 'Terminology');
  if (termIssues.length === 0) {
    report.overall.scores.terminology = 5;
  }
};

// --- NEW: Verifier Agent for Self-Correction Loop ---
async function verifyIssues(
  payload: LlmRequestPayload,
  initialReport: ScreenshotReport,
  enImage: ProcessedImage,
  deImage: ProcessedImage,
  ai: GoogleGenAI,
  skillsContext: string
): Promise<ScreenshotReport> {
  const systemPrompt = `
Role: You are a Senior LQA Specialist conducting a peer review.
Context: You have access to the specific 'LQA Skills' used to generate the initial report.

Task: Verify the reported issues against the Screenshots and the Skills.

Rules:
1. Layout Issues: 
   - OVERLAP/TRUNCATION: Must be marked isValid: true.
   - SPACING/ALIGNMENT: If the issue violates a specific LQA Skill (e.g., "nav_truncation_priority"), mark isValid: true. 
   - IF MERELY COMPACT: Do NOT reject. Instead, mark isValid: true but suggest refining severity to 'Minor'.

2. Terminology/Translation:
   - GLOSSARY: Strict adherence. If it contradicts glossary, isValid: true.
   - STYLE: If the translation sounds robotic or violates 'politeness_register' skill, isValid: true.

3. Hallucination Check:
   - Only mark isValid: false if the issue describes something visible that clearly DOES NOT EXIST in the image (e.g., complaining about a button that isn't there).

LQA SKILLS REFERENCE:
${skillsContext}
  `;

  const userPrompt = `
Initial Issues List (JSON):
${JSON.stringify(initialReport.issues, null, 2)}

Target Language: ${payload.targetLanguage}
Glossary Context: ${payload.glossaryText || 'None'}

Please verify each issue and return the verdict.
  `;

  let response;
  try {
    response = await ai.models.generateContent({
      model: LLM_MODEL_ID,
      contents: {
        parts: [
          { inlineData: { mimeType: enImage.mimeType, data: enImage.data } },
          { inlineData: { mimeType: deImage.mimeType, data: deImage.data } },
          { text: userPrompt }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: verificationSchema,
        temperature: 0.15, // Slightly higher temperature for style sensitivity
      }
    });
  } catch (error) {
    console.warn("Gemini 3.1 Pro failed in Verifier, switching to Fallback Model (Gemini 2.0 Flash)...", error);
    try {
      response = await ai.models.generateContent({
        model: LLM_FALLBACK_MODEL_ID,
        contents: {
          parts: [
            { inlineData: { mimeType: enImage.mimeType, data: enImage.data } },
            { inlineData: { mimeType: deImage.mimeType, data: deImage.data } },
            { text: userPrompt }
          ]
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: verificationSchema,
          temperature: 0.15,
        }
      });
    } catch (fallbackError) {
      console.error("[Verifier] Agent failed on fallback:", fallbackError);
      return initialReport;
    }
  }

  const responseText = response.text;
  if (!responseText) {
    console.warn("[Verifier] Returned empty response. Falling back to initial report.");
    return initialReport;
  }

  try {
    const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    const verificationResult = JSON.parse(cleanedText);

    const verifiedIssuesMap = new Map<string, any>();
    if (verificationResult.verifiedIssues && Array.isArray(verificationResult.verifiedIssues)) {
      verificationResult.verifiedIssues.forEach((v: any) => {
        verifiedIssuesMap.set(v.id, v);
      });
    }

    const filteredIssues = initialReport.issues.filter(issue => {
      const verdict = verifiedIssuesMap.get(issue.id);
      if (verdict) {
        if (!verdict.isValid) {
          const reasonLower = (verdict.reason || '').toLowerCase();
          const isHallucination = reasonLower.includes('hallucination') || reasonLower.includes('not visible') || reasonLower.includes('does not exist');
          
          if ((['Style', 'Number Formatting', 'Punctuation', 'Capitalization', 'Spelling'].includes(issue.issueCategory)) && !isHallucination) {
            console.log(`[Verifier] Rescued Issue ${issue.id} (${issue.issueCategory}): Downgrading to Minor. Reason: ${verdict.reason}`);
            issue.severity = 'Minor';
            issue.description = `[Review: Minor] ${issue.description}`;
            return true;
          }
          
          console.log(`[Verifier] Removed Issue ${issue.id} (${issue.issueCategory}): ${verdict.reason}`);
          return false;
        }
        if (verdict.refinedSeverity) {
          issue.severity = verdict.refinedSeverity as any;
        }
        if (verdict.refinedRationale) {
          issue.suggestionRationale = verdict.refinedRationale;
        }
      }
      return true;
    });

    initialReport.issues = filteredIssues;
    return initialReport;

  } catch (error) {
    console.error("[Verifier] Agent failed to parse response:", error);
    // Fallback to initial report on failure
    return initialReport;
  }
}

function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function consensusFilter(allRuns: QaIssue[][], threshold: number = 2): QaIssue[] {
  const candidates = allRuns.flat();
  const merged: QaIssue[] = [];

  for (const candidate of candidates) {
    const existing = merged.find(m =>
      m.issueCategory === candidate.issueCategory &&
      textSimilarity(m.targetText, candidate.targetText) > 0.8
    );

    if (existing) {
      existing._count = (existing._count || 1) + 1;
      if ((candidate.description || '').length > (existing.description || '').length) {
        Object.assign(existing, candidate, { _count: existing._count });
      }
    } else {
      merged.push({ ...candidate, _count: 1 });
    }
  }

  return merged.filter(m => (m._count || 0) >= threshold);
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been',
    'in','on','at','to','for','of','with','and','or','not','no','by','from',
    'that','this','it','as','if','but','do','does','did','has','have','had',
    'le','la','les','de','du','des','un','une','et','ou','en','à','par']);
  return text.toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüÿçæœ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function keywordOverlap(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  const matches = wordsA.filter(w => setB.has(w)).length;
  return matches / Math.max(wordsA.length, wordsB.length);
}

function matchRuleIds(issues: QaIssue[], styleGuideRules: StyleGuideRule[]): QaIssue[] {
  if (!styleGuideRules || styleGuideRules.length === 0) return issues;

  const categoryMap: Record<string, string[]> = {
    'Number Formatting': ['numbers'],
    'Punctuation': ['punctuation'],
    'Capitalization': ['capitalization'],
    'Grammar': ['grammar'],
    'Style': ['style_tone'],
    'Spelling': ['spelling'],
    'Terminology': ['terminology'],
    'Abbreviation': ['abbreviations'],
    'Formatting': ['formatting', 'numbers'],
    'DNT Violation': ['trademarks', 'terminology'],
  };

  for (const issue of issues) {
    const targetCategories = categoryMap[issue.issueCategory] || [];
    let candidates = styleGuideRules.filter(r =>
      targetCategories.includes((r.category || '').toLowerCase())
    );

    if (candidates.length === 0) {
      candidates = styleGuideRules;
    }

    const issueWords = extractKeywords(issue.description + ' ' + (issue.targetText || ''));
    let bestMatch: StyleGuideRule | null = null;
    let bestScore = 0;

    for (const rule of candidates) {
      const ruleWords = extractKeywords(
        rule.description + ' ' + (rule.exampleCorrect || '') + ' ' + (rule.exampleIncorrect || '')
      );
      const score = keywordOverlap(issueWords, ruleWords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }

    if (bestMatch && bestScore >= 0.15) {
      issue.ruleId = bestMatch.ruleId;
      issue.ruleDescription = bestMatch.description;
    } else if (['Number Formatting', 'Punctuation', 'Capitalization', 'Grammar', 'Style', 'Spelling', 'Formatting', 'Abbreviation'].includes(issue.issueCategory)) {
      issue.ruleId = 'GENERAL_BEST_PRACTICE';
      issue.ruleDescription = 'No specific rule matched in loaded Style Guide.';
    }
  }
  return issues;
}

export async function callTranslationQaLLM(payload: LlmRequestPayload): Promise<LlmResponse> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from process.env");
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const runAnalysis = async (modelId: string): Promise<ScreenshotReport> => {
    // 1. Prepare Images
    const [enImage, deImage] = await Promise.all([
      processImageUrl(payload.enImageBase64 || ''),
      processImageUrl(payload.deImageBase64 || '')
    ]);

    // 2. Retrieve SkillBank skills (inspired by SkillRL §3.2 — hierarchical retrieval)
    const sceneHint = payload.screenshotId || '';
    const retrievedSkills = retrieveSkills(sceneHint, payload.targetLanguage);
    const skillsBlock = formatSkillsForPrompt(retrievedSkills);
    console.log(`[SkillBank] Scene: ${retrievedSkills.sceneType} | General: ${retrievedSkills.generalSkills.length} | Scene-specific: ${retrievedSkills.sceneSkills.length}`);

    // 2.5 Format Style Guide Rules
    let styleGuideBlock = '';
    if (payload.styleGuideRules && payload.styleGuideRules.length > 0) {
      styleGuideBlock = `## Style Guide Rules for ${payload.targetLanguage} (${payload.styleGuideRules.length} rules)\n\n`;
      
      payload.styleGuideRules.forEach(rule => {
        const category = (rule.category || 'general').toLowerCase();
        let ruleLine = `[${rule.ruleId}] ${category} | ${rule.description}`;
        if (rule.exampleCorrect) ruleLine += `. ✓ ${rule.exampleCorrect}`;
        if (rule.exampleIncorrect) ruleLine += ` ✗ ${rule.exampleIncorrect}`;
        styleGuideBlock += `${ruleLine}\n`;
      });
      styleGuideBlock += '\n';
    }

    // 3. Prepare Prompt (Dynamic based on language + skills + style guide)
    const systemPrompt = getAnalysisSystemPrompt(payload.targetLanguage, payload.reportLanguage, skillsBlock, styleGuideBlock);
    
    const userPrompt = `
      Project Context / Glossary (Total Chars: ${payload.glossaryText?.length || 0}):
      ${payload.glossaryText ? payload.glossaryText : "No specific glossary provided."}

      Task:
      Analyze the attached UI screenshots for Localization Quality Assurance (LQA).
      - Image 1: Source Language (en-US)
      - Image 2: Target Language (${payload.targetLanguage})

      Identify specific issues regarding:
      1. Layout (Truncation, Overlap, Misalignment)
      2. Translation Accuracy (Mistranslations)
      3. Terminology Consistency
      4. Formatting (Dates, Numbers)
      
      CRITICAL RULES FOR 'suggestionsTarget':
      1. NEVER leave 'suggestionsTarget' empty.
      2. For TRUNCATION/LAYOUT issues: You MUST provide a shorter translation or abbreviation to fit the space.
      3. For MISTRANSLATION: Provide the corrected text.
      4. If no specific replacement exists, suggest "Allow text wrapping" or "Adjust container width".

      IMPORTANT: Your response MUST be valid JSON adhering strictly to the provided schema.
    `;

    // 4. Call Gemini API with Schema Enforcement
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: enImage.mimeType, data: enImage.data } },
          { inlineData: { mimeType: deImage.mimeType, data: deImage.data } },
          { text: userPrompt }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: reportResponseSchema, // STRICT SCHEMA ENFORCEMENT
        temperature: 0.15, // Lower temperature for more deterministic output
      }
    });

    const responseText = response.text;
    
    if (!responseText) {
      throw new Error("Received empty response from Gemini API.");
    }

    // 5. Parse Response
    let parsedReport: ScreenshotReport;
    try {
      // Handle potential markdown wrapping (e.g., ```json ... ```)
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      parsedReport = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse JSON response:", responseText);
      throw new Error("Invalid JSON response from model.");
    }

    // Ensure the ID matches the request for UI tracking
    // If model forgets to output screenshotId, we polyfill it here
    parsedReport.screenshotId = payload.screenshotId;
    
    // Fallback: Ensure issues array exists
    if (!parsedReport.issues) parsedReport.issues = [];

    // --- NEW: Self-Correction Loop (Verifier Agent) ---
    if (parsedReport.issues.length > 0) {
      console.log(`[Verifier] Starting verification for ${parsedReport.issues.length} issues...`);
      parsedReport = await verifyIssues(payload, parsedReport, enImage, deImage, ai, skillsBlock);
    }

    // FORCE STRICT QUALITY GRADING
    // This ensures the data state is consistent with what the UI displays.
    // E.g. If LLM says "Good" but finds Layout issues, we downgrade it to "Poor" here.
    // This serves as the single source of truth for the entire app.
    
    // 1. Sanitize Report (Hallucination Check)
    sanitizeReport(parsedReport, payload.glossaryText);

    // 2. Enforce Scores (Downgrade high scores if major issues exist)
    enforceScoreConsistency(parsedReport);

    // 3. Determine Final Strict Label based on issues
    const strictLevel = determineStrictQuality(parsedReport);
    
    // Type assertion needed as strictLevel includes 'Excellent' which might slightly differ from 'Perfect' in some schemas, 
    // but UI handles both.
    parsedReport.overall.qualityLevel = strictLevel as any;

    return parsedReport;
  };

  try {
    const NUM_RUNS = payload.analysisMode === 'precise' ? 3 : 1;
    const CONSENSUS_THRESHOLD = payload.analysisMode === 'precise' ? 2 : 1;

    const allRuns: QaIssue[][] = [];
    let baseReport: ScreenshotReport | null = null;

    for (let i = 0; i < NUM_RUNS; i++) {
      if (payload.onProgress) {
        payload.onProgress(i + 1, NUM_RUNS);
      }
      let report: ScreenshotReport;
      try {
        report = await retryWithBackoff(() => runAnalysis(LLM_MODEL_ID));
      } catch (error) {
        console.warn(`Run ${i + 1} failed with Gemini 3.1 Pro, switching to Fallback Model...`, error);
        report = await retryWithBackoff(() => runAnalysis(LLM_FALLBACK_MODEL_ID));
      }
      allRuns.push(report.issues || []);
      if (!baseReport) baseReport = report;
    }

    if (!baseReport) throw new Error("All analysis runs failed.");

    const consensusIssues = consensusFilter(allRuns, CONSENSUS_THRESHOLD);
    const finalIssues = matchRuleIds(consensusIssues, payload.styleGuideRules || []);

    baseReport.issues = finalIssues;

    // Re-evaluate quality based on final issues
    sanitizeReport(baseReport, payload.glossaryText);
    enforceScoreConsistency(baseReport);
    const strictLevel = determineStrictQuality(baseReport);
    baseReport.overall.qualityLevel = strictLevel as any;

    return { report: baseReport };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}