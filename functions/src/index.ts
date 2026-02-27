import * as functions from "firebase-functions/v2";
import { GoogleGenAI, Type, Schema } from "@google/genai";

// Define the Strict Schema for Gemini API
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
      description: "MANDATORY. Provide at least one actionable fix."
    },
    glossarySource: {
      type: Type.STRING,
      description: "REQUIRED for Terminology issues ONLY."
    },
    glossaryTermId: {
      type: Type.STRING,
      description: "REQUIRED for Terminology issues."
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
          refinedSeverity: { type: Type.STRING, description: "Optional: Suggest a more accurate severity if needed" }
        },
        required: ["id", "isValid", "reason"]
      }
    }
  },
  required: ["verifiedIssues"]
};

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
    console.warn(\`LLM Call failed, retrying in \${delay}ms... (\${retries} left). Error:\`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Hallucination Guardrail
const sanitizeReport = (report: any, glossaryText: string | undefined) => {
  if (!glossaryText) return;
  
  const validIds = new Set<string>();
  const matches = glossaryText.match(/\\[ID:TERM-\\d+\\]/g);
  if (matches) {
    matches.forEach(id => validIds.add(id));
  }

  report.issues.forEach((issue: any) => {
    if (issue.issueCategory === 'Terminology') {
      const termIdRaw = issue.glossaryTermId;
      const formattedId = termIdRaw ? \`[ID:\${termIdRaw}]\` : null;
      const isValid = formattedId && validIds.has(formattedId);

      if (!isValid) {
        issue.issueCategory = 'Style';
        issue.severity = 'Minor';
        issue.description = \`[Auto-Downgraded] \${issue.description} (Reason: Terminology ID not found in glossary)\`;
        issue.glossaryTermId = undefined;
        issue.glossarySource = 'LLM Knowledge (Downgraded)';
      }
    }
  });
  
  const termIssues = report.issues.filter((i: any) => i.issueCategory === 'Terminology');
  if (termIssues.length === 0) {
    report.overall.scores.terminology = 5;
  }
};

// Verifier Agent for Self-Correction Loop
async function verifyIssues(
  payload: any,
  initialReport: any,
  enImage: any,
  deImage: any,
  ai: GoogleGenAI,
  skillsContext: string
): Promise<any> {
  const systemPrompt = \`
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
\${skillsContext}
  \`;

  const userPrompt = \`
Initial Issues List (JSON):
\${JSON.stringify(initialReport.issues, null, 2)}

Target Language: \${payload.targetLanguage}
Glossary Context: \${payload.glossaryText || 'None'}

Please verify each issue and return the verdict.
  \`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
        temperature: 0.2,
      }
    });

    const responseText = response.text;
    if (!responseText) return initialReport;

    const cleanedText = responseText.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*$/g, '').trim();
    const verificationResult = JSON.parse(cleanedText);

    const verifiedIssuesMap = new Map<string, any>();
    if (verificationResult.verifiedIssues && Array.isArray(verificationResult.verifiedIssues)) {
      verificationResult.verifiedIssues.forEach((v: any) => {
        verifiedIssuesMap.set(v.id, v);
      });
    }

    const filteredIssues = initialReport.issues.filter((issue: any) => {
      const verdict = verifiedIssuesMap.get(issue.id);
      if (verdict) {
        if (!verdict.isValid) {
          const reasonLower = (verdict.reason || '').toLowerCase();
          const isHallucination = reasonLower.includes('hallucination') || reasonLower.includes('not visible') || reasonLower.includes('does not exist');
          
          if ((issue.issueCategory === 'Style' || issue.issueCategory === 'Formatting') && !isHallucination) {
            issue.severity = 'Minor';
            issue.description = \`[Review: Minor] \${issue.description}\`;
            return true;
          }
          return false;
        }
        if (verdict.refinedSeverity) {
          issue.severity = verdict.refinedSeverity as any;
        }
      }
      return true;
    });

    initialReport.issues = filteredIssues;
    return initialReport;

  } catch (error) {
    console.error("[Verifier] Agent failed:", error);
    return initialReport;
  }
}

// Main Function
export const analyzeScreenshot = functions.https.onCall({
  cors: true,
  secrets: ["GEMINI_API_KEY"],
  maxInstances: 10
}, async (request) => {
  const payload = request.data;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError("internal", "API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  return retryWithBackoff(async () => {
    try {
      const enImage = { mimeType: payload.enImageMimeType, data: payload.enImageData };
      const deImage = { mimeType: payload.deImageMimeType, data: payload.deImageData };

      const systemPrompt = payload.systemPrompt;
      const userPrompt = payload.userPrompt;
      const skillsBlock = payload.skillsBlock;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
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
          responseSchema: reportResponseSchema,
          temperature: 0.2,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Received empty response from Gemini API.");
      }

      const cleanedText = responseText.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*$/g, '').trim();
      let parsedReport = JSON.parse(cleanedText);

      parsedReport.screenshotId = payload.screenshotId;
      if (!parsedReport.issues) parsedReport.issues = [];

      if (parsedReport.issues.length > 0) {
        parsedReport = await verifyIssues(payload, parsedReport, enImage, deImage, ai, skillsBlock);
      }

      sanitizeReport(parsedReport, payload.glossaryText);

      return { report: parsedReport };

    } catch (error) {
      console.error("Gemini LQA Analysis Failed:", error);
      throw new functions.https.HttpsError("internal", "Analysis failed", error);
    }
  });
});
