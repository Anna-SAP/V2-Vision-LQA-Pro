import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LlmRequestPayload, LlmResponse, ScreenshotReport } from '../types';
import { getAnalysisSystemPrompt, LLM_MODEL_ID } from '../constants';
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
      description: "One of: Layout, Mistranslation, Terminology, Formatting, Grammar, Style, Other" 
    },
    severity: { 
      type: Type.STRING, 
      description: "Critical, Major, or Minor" 
    },
    sourceText: { type: Type.STRING },
    targetText: { type: Type.STRING },
    description: { type: Type.STRING, description: "Detailed explanation of the issue" },
    suggestionsTarget: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "MANDATORY. Provide at least one actionable fix. For Truncation: provide a shorter translation/abbreviation. For Layout: suggest 'Resize container' or similar. NEVER leave empty."
    }
  },
  required: ["id", "location", "issueCategory", "severity", "description", "suggestionsTarget"]
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
    optimizationAdvice: { type: Type.STRING },
    termAdvice: { type: Type.STRING }
  },
  required: ["severeCount", "majorCount", "minorCount", "optimizationAdvice"]
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

export async function callTranslationQaLLM(payload: LlmRequestPayload): Promise<LlmResponse> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from process.env");
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  return retryWithBackoff(async () => {
    try {
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

      // 3. Prepare Prompt (Dynamic based on language + skills)
      const systemPrompt = getAnalysisSystemPrompt(payload.targetLanguage, payload.reportLanguage, skillsBlock);
      
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
          responseSchema: reportResponseSchema, // STRICT SCHEMA ENFORCEMENT
          temperature: 0.2, // Lower temperature for more deterministic output
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

      // FORCE STRICT QUALITY GRADING
      // This ensures the data state is consistent with what the UI displays.
      // E.g. If LLM says "Good" but finds Layout issues, we downgrade it to "Poor" here.
      // This serves as the single source of truth for the entire app.
      
      // 1. Enforce Scores (Downgrade high scores if major issues exist)
      enforceScoreConsistency(parsedReport);

      // 2. Determine Final Strict Label based on issues
      const strictLevel = determineStrictQuality(parsedReport);
      
      // Type assertion needed as strictLevel includes 'Excellent' which might slightly differ from 'Perfect' in some schemas, 
      // but UI handles both.
      parsedReport.overall.qualityLevel = strictLevel as any;

      return {
        report: parsedReport
      };

    } catch (error) {
      console.error("Gemini LQA Analysis Failed:", error);
      throw error;
    }
  });
}