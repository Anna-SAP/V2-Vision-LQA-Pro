/**
 * LQA SkillBank — Hierarchical Skill Library for Localization QA
 * 
 * Inspired by SkillRL (arXiv:2602.08234):
 *   - General Skills: universal principles for all LQA tasks
 *   - Scene-Specific Skills: specialized heuristics per UI scene type
 *   - Retrieval: keyword-based matching (lightweight alternative to embedding similarity)
 * 
 * Design: each skill has a compact format (name + principle + whenToApply)
 * to minimize token footprint while maximizing reasoning utility.
 */

import { SupportedLocale } from '../types';

// ---------------------------------------------------------------------------
// Skill Data Model
// ---------------------------------------------------------------------------

export interface LqaSkill {
  /** Short identifier, e.g. "text_expansion_guard" */
  name: string;
  /** Core principle / what to check */
  principle: string;
  /** When this skill is relevant */
  whenToApply: string;
  /** Optional positive/negative examples */
  examples?: string[];
}

// ---------------------------------------------------------------------------
// General Skills — always injected into every analysis
// ---------------------------------------------------------------------------

const GENERAL_SKILLS: LqaSkill[] = [
  {
    name: "text_expansion_guard",
    principle:
      "German text is typically 30-40% longer than English; French is 15-20% longer. " +
      "Prioritize checking short UI elements (buttons, tabs, labels, menu items) for truncation.",
    whenToApply: "Always. This is the #1 source of visual bugs in localization.",
    examples: [
      "'Settings' → 'Einstellungen' (+60%)",
      "'Submit' → 'Soumettre' (+40%)",
      "'OK' → 'OK' (no expansion, skip)",
    ],
  },
  {
    name: "compound_word_detection",
    principle:
      "German forms very long compound nouns (e.g., 'Datenschutzgrundverordnung'). " +
      "If a compound exceeds the width of its container in the source UI, flag it as a Layout issue " +
      "and suggest hyphenation, abbreviation, or a shorter synonym.",
    whenToApply: "When target language is de-DE.",
  },
  {
    name: "number_date_locale_format",
    principle:
      "Check that numbers use locale-correct delimiters (DE: 1.234,56 / FR: 1 234,56) " +
      "and dates follow locale conventions (DE: TT.MM.JJJJ / FR: JJ/MM/AAAA). " +
      "Flag any remaining en-US formats (e.g., MM/DD/YYYY, 1,234.56) as Formatting issues.",
    whenToApply: "Whenever numbers, currencies, or dates are visible in valid areas.",
    examples: [
      "EN '$1,234.56' should become DE '1.234,56 $' or '1.234,56 USD'",
      "EN '02/12/2026' should become DE '12.02.2026'",
    ],
  },
  {
    name: "capitalization_conventions",
    principle:
      "German capitalizes all nouns; French generally does not capitalize after the first word of a title. " +
      "Flag deviations from locale norms as Style issues (Minor severity).",
    whenToApply: "When headings, labels, or button text are visible.",
  },
  {
    name: "politeness_register",
    principle:
      "Formal 'Sie' is standard in German business UIs; informal 'tu' is rare in French enterprise UIs. " +
      "Flag inconsistent use of formal/informal register as Style issues.",
    whenToApply: "When interactive text (prompts, instructions, error messages) is visible.",
  },
  {
    name: "icon_text_alignment",
    principle:
      "After text expansion, icon+text pairs may misalign. Check that icons and their labels " +
      "remain visually paired — if expanded text pushes the icon off its natural position, report as Layout.",
    whenToApply: "When icon+label combinations are visible in valid areas.",
  },
  {
    name: "ui_layer_occlusion",
    principle:
      "When a modal, dialog, popup, dropdown, or toast is visible, the page is split into " +
      "foreground (the active overlay) and background (the dimmed/covered page). " +
      "Text in the background that appears cut off or hidden is NOT a layout bug — it is " +
      "normal UI layering. NEVER report occluded background text as Truncation, Layout Issue, " +
      "or Translation Missing. Only inspect the foreground window and unoccluded background areas.",
    whenToApply: "Whenever a floating overlay, modal, dialog, or popup is visible in the screenshot.",
    examples: [
      "Delete confirmation dialog covers a legal disclaimer → ignore the disclaimer text",
      "Dropdown menu overlaps a table row → do NOT flag the partially hidden row as truncated",
    ],
  },
];

// ---------------------------------------------------------------------------
// Scene-Specific Skills — retrieved based on UI scene classification
// ---------------------------------------------------------------------------

export type SceneType =
  | "navigation"
  | "form"
  | "dashboard"
  | "modal"
  | "table"
  | "settings"
  | "error_page"
  | "generic";

const SCENE_SKILLS: Record<SceneType, LqaSkill[]> = {
  navigation: [
    {
      name: "nav_truncation_priority",
      principle:
        "Navigation items have the tightest width constraints. " +
        "If any nav label is truncated, suggest an abbreviated translation first, " +
        "e.g., 'Berichte' instead of 'Berichterstattung'. " +
        "Never suggest 'increase container width' for nav items — it is not feasible.",
      whenToApply: "When screenshots contain top nav bars, side nav, or breadcrumbs.",
    },
    {
      name: "nav_consistency",
      principle:
        "All navigation labels should maintain consistent translation style. " +
        "If 'Dashboard' is translated as 'Übersicht' in one place, it should not appear as 'Instrumententafel' elsewhere.",
      whenToApply: "When multiple nav labels are visible.",
    },
  ],

  form: [
    {
      name: "form_label_overflow",
      principle:
        "Form field labels sit next to input boxes. Expanded translations can overflow into the input area. " +
        "Check each label-input pair for overlap. Suggest shorter labels or moving the label above the input.",
      whenToApply: "When form fields with labels are visible.",
      examples: [
        "'First Name' → DE 'Vorname' ✓ (fits)",
        "'Payment Method' → DE 'Zahlungsmethode' (check if it overflows the label column)",
      ],
    },
    {
      name: "placeholder_translation",
      principle:
        "Input placeholder text should also be localized. If an English placeholder is visible in a target-language screenshot, " +
        "flag it as an Untranslated issue (but remember the rule: ignore Untranslated, so DO NOT report it).",
      whenToApply: "When form inputs with visible placeholder text are present.",
    },
    {
      name: "validation_message_check",
      principle:
        "Error/validation messages need special attention: they must be fully translated and culturally appropriate. " +
        "A validation message that says 'Eingabe ungültig' is better than a literal translation of 'Invalid input'.",
      whenToApply: "When error states or validation messages are visible.",
    },
  ],

  dashboard: [
    {
      name: "dashboard_card_density",
      principle:
        "Dashboard cards and KPI tiles have fixed dimensions. Expanded text can cause card content " +
        "to wrap awkwardly or push elements below the fold. Check each card for visual integrity.",
      whenToApply: "When dashboard or analytics views with cards/tiles are visible.",
    },
    {
      name: "chart_axis_labels",
      principle:
        "Chart axis labels and legends are often auto-sized. Verify translated axis labels are not clipped. " +
        "Suggest abbreviations for long axis labels (e.g., 'Umsatz' instead of 'Umsatzerlöse').",
      whenToApply: "When charts, graphs, or data visualizations are visible.",
    },
  ],

  modal: [
    {
      name: "modal_button_balance",
      principle:
        "Modal dialogs typically have action buttons (OK/Cancel). In German, these expand significantly. " +
        "Check that buttons don't overflow the modal footer or wrap to a new line. " +
        "Suggest: 'Abbrechen' → 'Abbr.' if space is critical.",
      whenToApply: "When modal dialogs, popups, or confirmation windows are visible.",
    },
    {
      name: "modal_content_scroll",
      principle:
        "Modal body content that expands due to translation may push content below the visible area. " +
        "If the target modal appears significantly taller, flag as a Minor Layout issue.",
      whenToApply: "When modals with substantial body text are visible.",
    },
    {
      name: "modal_background_exclusion",
      principle:
        "When a modal/dialog is the active foreground element, ALL background content is " +
        "in an inactive state. Any text behind the modal that appears clipped, partially hidden, " +
        "or visually incomplete must be treated as 'Occluded (Ignored)' — not as a real issue. " +
        "Focus your entire LQA analysis on the modal's title, body text, input fields, and action buttons.",
      whenToApply: "When any modal, dialog, or overlay popup is the primary interactive element.",
      examples: [
        "Confirmation dialog covers page footer → footer text is NOT truncated, it is occluded",
        "Cookie consent banner overlaps sidebar → sidebar issues are NOT reportable",
      ],
    },
  ],

  table: [
    {
      name: "table_header_truncation",
      principle:
        "Table column headers are the most constrained UI elements. German translations almost always " +
        "exceed English column widths. Prioritize abbreviation suggestions for every truncated header. " +
        "Example: 'Beschreibung' → 'Beschr.' or 'Status' (keep as-is if same).",
      whenToApply: "When data tables with column headers are visible.",
    },
    {
      name: "table_cell_wrapping",
      principle:
        "If table cells wrap to multiple lines due to translation expansion, the row height increases " +
        "inconsistently. Flag this as Minor Layout if it significantly impacts readability.",
      whenToApply: "When data tables with content rows are visible.",
    },
  ],

  settings: [
    {
      name: "settings_toggle_labels",
      principle:
        "Toggle switches and checkboxes have labels that must fit on one line. " +
        "German settings labels are frequently truncated. Always suggest a compact alternative.",
      whenToApply: "When settings/preferences screens with toggles are visible.",
    },
    {
      name: "settings_section_headers",
      principle:
        "Settings section headers (e.g., 'Account Settings' → 'Kontoeinstellungen') " +
        "may overflow their container. Check each section header independently.",
      whenToApply: "When settings pages with grouped sections are visible.",
    },
  ],

  error_page: [
    {
      name: "error_tone_check",
      principle:
        "Error pages should maintain a helpful, non-blame tone in the target language. " +
        "Verify that error messages don't sound harsh or overly technical after translation.",
      whenToApply: "When 404, 500, or other error pages are visible.",
    },
  ],

  generic: [],
};

// ---------------------------------------------------------------------------
// Scene Detection — lightweight keyword classifier
// ---------------------------------------------------------------------------

const SCENE_KEYWORDS: Record<SceneType, string[]> = {
  navigation: ["nav", "menu", "sidebar", "breadcrumb", "header", "tab", "toolbar", "navigation", "导航", "菜单", "标签栏"],
  form: ["form", "input", "field", "submit", "login", "signup", "register", "password", "email", "search", "表单", "输入", "登录"],
  dashboard: ["dashboard", "analytics", "chart", "graph", "kpi", "metric", "overview", "stats", "仪表板", "概览", "统计"],
  modal: ["modal", "dialog", "popup", "confirm", "alert", "overlay", "弹窗", "对话框", "确认"],
  table: ["table", "grid", "list", "column", "row", "data", "sort", "filter", "表格", "列表", "数据"],
  settings: ["setting", "preference", "config", "option", "account", "profile", "toggle", "switch", "设置", "偏好", "配置"],
  error_page: ["error", "404", "500", "not found", "oops", "something went wrong", "错误", "未找到"],
  generic: [],
};

/**
 * Detect scene type from a text description (e.g., sceneDescription from LLM, or filename).
 * Returns the best matching scene type, or "generic" if no strong match.
 */
export function detectSceneType(text: string): SceneType {
  const lower = text.toLowerCase();
  let bestScene: SceneType = "generic";
  let bestScore = 0;

  for (const [scene, keywords] of Object.entries(SCENE_KEYWORDS) as [SceneType, string[]][]) {
    if (scene === "generic") continue;
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestScene = scene;
    }
  }

  return bestScene;
}

// ---------------------------------------------------------------------------
// Skill Retrieval — analogous to SkillRL §3.2 retrieval
// ---------------------------------------------------------------------------

export interface RetrievedSkills {
  generalSkills: LqaSkill[];
  sceneSkills: LqaSkill[];
  sceneType: SceneType;
}

/**
 * Retrieve relevant skills for a given context.
 * General skills are ALWAYS included. Scene skills are selected via scene type detection.
 * 
 * @param sceneHint - filename, scene description, or any contextual text
 * @param targetLang - the target locale (some skills are language-specific)
 * @returns General + scene-specific skills, with language filtering applied
 */
export function retrieveSkills(
  sceneHint: string,
  targetLang: SupportedLocale
): RetrievedSkills {
  // Filter general skills by language applicability
  const filteredGeneral = GENERAL_SKILLS.filter((skill) => {
    if (skill.name === "compound_word_detection" && targetLang !== "de-DE") {
      return false;
    }
    return true;
  });

  const sceneType = detectSceneType(sceneHint);
  const sceneSkills = SCENE_SKILLS[sceneType] || [];

  return {
    generalSkills: filteredGeneral,
    sceneSkills,
    sceneType,
  };
}

// ---------------------------------------------------------------------------
// Prompt Formatting — compact format for token efficiency
// ---------------------------------------------------------------------------

/**
 * Format retrieved skills into a compact prompt section.
 * Inspired by SkillRL's 10-20x token compression: we use a structured, concise format
 * rather than verbose free-text descriptions.
 * 
 * @param skills - retrieved skills from retrieveSkills()
 * @param maxSkills - maximum number of scene-specific skills to inject (token budget control)
 * @returns A formatted string ready for prompt injection
 */
export function formatSkillsForPrompt(
  skills: RetrievedSkills,
  maxSkills: number = 5
): string {
  const lines: string[] = [];

  lines.push("=== RETRIEVED LQA SKILLS (Apply these during analysis) ===");
  lines.push("");

  // General skills — always present
  lines.push("## General Principles:");
  for (const skill of skills.generalSkills) {
    lines.push(`  • [${skill.name}]: ${skill.principle}`);
    if (skill.examples && skill.examples.length > 0) {
      lines.push(`    Examples: ${skill.examples.slice(0, 2).join(" | ")}`);
    }
  }

  // Scene-specific skills — selected subset
  if (skills.sceneSkills.length > 0) {
    lines.push("");
    lines.push(`## Scene-Specific Skills (detected: ${skills.sceneType}):`);
    for (const skill of skills.sceneSkills.slice(0, maxSkills)) {
      lines.push(`  • [${skill.name}]: ${skill.principle}`);
      if (skill.examples && skill.examples.length > 0) {
        lines.push(`    Examples: ${skill.examples.slice(0, 2).join(" | ")}`);
      }
    }
  }

  lines.push("");
  lines.push("=== END SKILLS ===");

  return lines.join("\n");
}
