import { SupportedLocale, AppLanguage } from "./types";

export const LLM_MODEL_ID = 'gemini-3.1-pro-preview';
export const LLM_FALLBACK_MODEL_ID = 'gemini-2.0-flash';
export const LLM_DISPLAY_NAME = 'Gemini 3.1 Pro';
export const APP_VERSION = 'v1.7.0'; // Bump version for Glossary Auto-Load

// UI Translations
export const UI_TEXT = {
  zh: {
    title: "Vision LQA Pro",
    uploadTitle: "拖拽上传图片或 ZIP 压缩包",
    uploadSub: "支持 PNG, JPG",
    uploadTipTitle: "批量上传提示：",
    uploadTip: "请上传两个 ZIP 包（如 en-US.zip 和 de-DE.zip）。确保压缩包内的文件名一一对应（如都有 home.png）。目前仅支持 FR 和 DE。",
    processing: "处理文件中...",
    projectContext: "项目上下文 / 术语表",
    screenshotsList: "截图列表",
    clearList: "清空列表", 
    clearContext: "重置上下文", 
    globalStats: "全局统计",
    runBulk: "批量运行",
    loadDemo: "加载演示数据",
    startOver: "重新开始",
    source: "源语言",
    target: "目标语言",
    readyToAnalyze: "准备分析",
    readyDesc: "对比 en-US 和目标语言界面的布局、翻译及术语问题。",
    contextActive: "上下文已激活",
    genReport: "生成 LQA 报告",
    analyzing: "AI 正在分析...",
    analysisFailed: "分析失败",
    tryAgain: "重试",
    sceneDesc: "场景描述",
    mainProblems: "主要问题",
    optAdvice: "优化建议",
    terminology: "术语建议",
    issuesDetected: "发现的问题",
    noIssues: "未发现问题",
    exportJson: "导出报告 (JSON)",
    exportHtml: "下载 HTML 报告",
    exportGlobal: "导出全局报告 (JSON)",
    overview: "概览",
    bulkModalTitle: "批量 LQA 分析",
    bulkReady: "准备处理",
    bulkNote: "注意：最大并发数为 5。大批量任务可能需要几分钟。",
    cancel: "取消",
    startBulk: "开始批量运行",
    processingCount: "处理中...",
    complete: "分析完成",
    success: "成功",
    failed: "失败",
    failures: "失败原因",
    downloadZip: "下载全部 (ZIP)",
    downloadCsv: "汇总表 (CSV)",
    close: "关闭窗口",
    langName: "简体中文",
    langMismatchTitle: "语种不匹配警告",
    langMismatchMsg: "检测到新上传的图片语言为 {zipLang}，但当前已加载的术语表似乎是 {glossaryLang}。\n\n是否继续使用当前术语表？",
    // Layout
    layout: {
      horizontal: "双栏对比",
      vertical: "垂直堆叠"
    },
    // Glossary Manager
    glossary: {
      tabManual: "手动输入",
      tabImport: "文件管理",
      dragDrop: "点击或拖拽上传术语表",
      dragDropCompact: "点击或拖拽添加更多文件...",
      formats: "支持 .xlsx, .csv (最大 50MB)",
      parsing: "解析中...",
      loadDefault: "加载预设",
      defaultDe: "🇩🇪 加载 DE 术语",
      defaultFr: "🇫🇷 加载 FR 术语",
      loadingPreset: "正在加载预设...",
      presetLoaded: "预设已加载",
      onboardingTitle: "初始化项目上下文",
      onboardingDesc: "为当前项目加载标准术语表以确保 LQA 准确性。",
      history: "历史记录",
      preview: "预览 (前10条)",
      totalTerms: "总术语数",
      clear: "清空",
      errorFormat: "文件格式错误或缺少必要的列 (Source/Target)",
      apply: "应用",
      applied: "已应用",
      modeLabel: "上传模式",
      modeReplace: "覆盖",
      modeAppend: "追加",
      filesLoaded: "已加载文件",
      mergedTotal: "当前生效",
      removeFile: "移除此文件",
      resetAll: "重置所有上下文",
      emptyState: "暂无术语文件，请上传或加载预设",
      termCount: "{count} 条术语"
    }
  },
  en: {
    title: "Vision LQA Pro",
    uploadTitle: "Drag & drop images or ZIP archives",
    uploadSub: "Supports PNG, JPG",
    uploadTipTitle: "Bulk Upload Tip:",
    uploadTip: "Upload two ZIPs (e.g. en-US.zip & de-DE.zip). Ensure filenames match inside (e.g. home.png). Only FR & DE are supported for now.",
    processing: "Processing files...",
    projectContext: "Project Context / Glossary",
    screenshotsList: "Screenshots",
    clearList: "Clear List", 
    clearContext: "Reset Context", 
    globalStats: "Global Stats",
    runBulk: "Run Bulk",
    loadDemo: "Load Demo Data",
    startOver: "Start Over",
    source: "Source",
    target: "Target",
    readyToAnalyze: "Ready to Analyze",
    readyDesc: "Compare en-US and target language for layout, translation, and terminology issues.",
    contextActive: "Context Active",
    genReport: "Generate QA Report",
    analyzing: "AI Analyzing...",
    analysisFailed: "Analysis Failed",
    tryAgain: "Try Again",
    sceneDesc: "Scene Description",
    mainProblems: "Main Problems",
    optAdvice: "Optimization Advice",
    terminology: "Terminology",
    issuesDetected: "Issues Detected",
    noIssues: "No issues found",
    exportJson: "Export JSON",
    exportHtml: "Download HTML",
    exportGlobal: "Export Global Report (JSON)",
    overview: "Overview",
    bulkModalTitle: "Bulk QA Analysis",
    bulkReady: "Ready to process",
    bulkNote: "Note: Max 5 concurrent requests. Large batches may take a few minutes.",
    cancel: "Cancel",
    startBulk: "Start Bulk Run",
    processingCount: "Processing...",
    complete: "Analysis Complete",
    success: "Success",
    failed: "Failed",
    failures: "Failure Reasons",
    downloadZip: "Download All (ZIP)",
    downloadCsv: "Summary (CSV)",
    close: "Close Window",
    langName: "English",
    langMismatchTitle: "Language Mismatch Warning",
    langMismatchMsg: "Detected new images are {zipLang}, but the loaded glossary appears to be {glossaryLang}.\n\nDo you want to continue with the current glossary?",
    // Layout
    layout: {
      horizontal: "Side-by-Side",
      vertical: "Stacked View"
    },
    // Glossary Manager
    glossary: {
      tabManual: "Manual Input",
      tabImport: "File Manager",
      dragDrop: "Click or drag to upload glossary",
      dragDropCompact: "Click or drag to add more files...",
      formats: "Supports .xlsx, .csv (Max 50MB)",
      parsing: "Parsing...",
      loadDefault: "Load Presets",
      defaultDe: "🇩🇪 Load DE Terms",
      defaultFr: "🇫🇷 Load FR Terms",
      loadingPreset: "Loading presets...",
      presetLoaded: "Preset Loaded",
      onboardingTitle: "Initialize Project Context",
      onboardingDesc: "Load standard glossaries to ensure LQA accuracy.",
      history: "History",
      preview: "Preview (Top 10)",
      totalTerms: "Total Terms",
      clear: "Clear",
      errorFormat: "Invalid format or missing required columns (Source/Target)",
      apply: "Apply",
      applied: "Applied",
      modeLabel: "Upload Mode",
      modeReplace: "Replace",
      modeAppend: "Append",
      filesLoaded: "Loaded Files",
      mergedTotal: "Active Terms",
      removeFile: "Remove file",
      resetAll: "Reset All Context",
      emptyState: "No glossary files loaded. Upload or load presets.",
      termCount: "{count} terms"
    }
  }
};

export const getAnalysisSystemPrompt = (targetLang: SupportedLocale, reportLang: AppLanguage, skillsBlock?: string, styleGuideBlock?: string) => {
  const langName = targetLang === 'fr-FR' ? 'French (Français)' : 'German (Deutsch)';
  const langCode = targetLang;
  
  const isZh = reportLang === 'zh';
  
  // Define strict output language rules
  const outputLangRuleZh = `**关键输出规则**：所有的分析描述、问题详情、优化建议必须使用 **简体中文** 撰写（即使你在分析法语或德语界面）。`;
  const outputLangRuleEn = `**CRITICAL OUTPUT RULE**: All analysis descriptions, issue details, and advice MUST be written in **ENGLISH** (even though you are analyzing a French or German interface).`;

  const roleDesc = isZh 
    ? `你是一名专业的${langName}本地化质量保证专家（LQA Specialist，母语为 ${langCode}）。${outputLangRuleZh} 你具备极强的视觉空间感知能力，能够严格遵循“遮罩过滤规则”。`
    : `You are an expert Localization Quality Assurance (LQA) Specialist in ${langName} (Native in ${langCode}). ${outputLangRuleEn} You possess strong visual-spatial perception and strictly adhere to "Mask Filtering Rules".`;

  const maskInstructionZh = `
*** 核心规则：严格的遮罩过滤 (STRICT MASK FILTERING) ***
1. **第一步：分析源图 (Image 1, en-US)**
   - 寻找图中被 **灰色/深色矩形色块 (Gray/Dark Blocks)** 覆盖的区域。
   - 这些区域是“非检查区 (Exclusion Zones)”，通常覆盖了顶部导航栏、侧边栏或敏感数据。

2. **第二步：映射到目标图 (Image 2, ${langCode})**
   - 将源图中的“非检查区”坐标在空间上映射到目标图上。
   - 即使目标图在这些位置显示了清晰的文字、按钮或 UI 控件，也必须视其为**不存在**。

3. **第三步：仅检查有效区域**
   - 只对源图中**完全可见、未被遮挡**的区域对应的目标图内容进行 LQA 检查。
   - **严禁**报告任何位于遮罩区域内的翻译问题、布局错误或术语问题。
   - 示例：如果源图顶部导航栏被灰色块遮盖，而目标图显示了导航栏，**请完全忽略导航栏中的任何问题**（即使存在明显的翻译错误）。

4. **第四步：UI 层级遮挡过滤 (UI LAYER OCCLUSION FILTERING)**
   - 当截图中存在**前台活动窗口**（如模态对话框 Modal、确认弹窗 Confirm Dialog、下拉菜单 Dropdown、Toast 通知等）时，执行以下判断：
     a) **识别前台层（Foreground Layer）**：具有阴影、遮罩蒙层（dimmed overlay）、或明确边框的浮层元素即为前台层。
     b) **识别背景层（Background Layer）**：前台窗口下方被部分或完全遮挡的页面内容即为背景层。
     c) **遮挡豁免规则**：如果背景层中的文本因被前台窗口覆盖而显示不完整（被裁剪、被遮盖、不可见），这是**正常的 UI 行为**，**严禁**将其标记为 Layout Issue、Truncation 或 Translation Missing。
     d) **检查范围限定**：仅对前台活动窗口内部的文本质量和布局进行 LQA 评估。背景层中未被遮挡的可见区域仍需正常检查。
   - 示例：用户正在操作"删除确认"弹窗，弹窗遮住了背景中的法律声明长文本。→ **正确做法**：忽略被遮的法律文本，仅检查弹窗内的按钮文本和提示信息。→ **错误做法**：报告"背景法律文本被截断，翻译不完整 (MAJOR)"。
`;

  const maskInstructionEn = `
*** CORE RULE: STRICT MASK FILTERING ***
1. **Step 1: Analyze Source Image (Image 1, en-US)**
   - Identify areas covered by **SOLID GRAY/DARK BLOCKS**.
   - These are "Exclusion Zones", usually covering headers, sidebars, or sensitive data.

2. **Step 2: Map to Target Image (Image 2, ${langCode})**
   - Project these Exclusion Zones onto the Target Image coordinates.
   - Even if the Target Image shows clear text, buttons, or UI controls in these zones, treat them as **NON-EXISTENT**.

3. **Step 3: Inspect Only Valid Areas**
   - Perform LQA checks ONLY on content that is **VISIBLY UNMASKED** in the Source Image.
   - **DO NOT** report any mistranslations, layout issues, or terminology errors located within the masked zones.
   - Example: If the top header is grayed out in Source, but visible in Target, **IGNORE the header completely** (even if it has mistranslation).

4. **Step 4: UI LAYER OCCLUSION FILTERING**
   - When the screenshot contains a **foreground active window** (e.g., modal dialog, confirmation popup, dropdown menu, toast notification), apply the following logic:
     a) **Identify Foreground Layer**: Any floating element with drop shadow, dimmed overlay backdrop, or distinct border is the foreground layer.
     b) **Identify Background Layer**: Page content partially or fully obscured beneath the foreground window is the background layer.
     c) **Occlusion Exemption Rule**: If background text appears incomplete, clipped, or invisible BECAUSE it is covered by the foreground window, this is **normal UI behavior**. **DO NOT** flag it as a Layout Issue, Truncation, or Translation Missing.
     d) **Inspection Scope**: Perform LQA evaluation ONLY on text inside the foreground active window. Background areas that are NOT occluded by the foreground window should still be inspected normally.
   - Example: User is interacting with a "Delete Confirmation" dialog that covers a legal disclaimer in the background. → **CORRECT**: Ignore the occluded legal text, only check the dialog's button labels and prompt text. → **INCORRECT**: Report "Background legal text is truncated, translation incomplete (MAJOR)".
`;
  
  const termRulesZh = `
### 术语一致性检查规则 (TERMINOLOGY COMPLIANCE RULES)

**核心原则：无证据，不指控 (NO ID, NO ISSUE)**

1. **严格匹配 (Strict Matching)**：
   - 只有当你能在提供的术语表上下文中找到该词条的**唯一标识符 (例如 [ID:TERM-012])** 时，才能将问题归类为 \`Terminology\`。
   - 术语表格式为：\`[ID:xxx] Source = Target [source: filename]\`。

2. **禁止幻觉 (Zero Hallucination)**：
   - 如果源文本 (Source Text) 不在术语表中，或者你无法找到对应的 \`[ID:xxx]\`：
     - **严禁**将 issueCategory 设为 \`Terminology\`。
     - **严禁**在描述中声称"根据术语表..."。
     - 你可以将此类问题归类为 \`Style\` (风格建议) 或 \`Mistranslation\` (如果意思完全错误)，并明确标注"基于通用翻译标准"。

3. **证据引用 (Citation)**：
   - 在描述 Terminology 问题时，必须在末尾引用 ID。
   - 格式示例："翻译与术语表不符。应为：'Enregistrer' (参考: [ID:TERM-002])。"
`;

  const termRulesEn = `
### TERMINOLOGY COMPLIANCE RULES

**CORE PRINCIPLE: NO ID, NO ISSUE**

1. **Strict Matching**:
   - You may classify an issue as \`Terminology\` **IF AND ONLY IF** you can locate the specific **Unique Identifier (e.g., [ID:TERM-012])** in the provided glossary context.
   - Glossary format provided is: \`[ID:xxx] Source = Target [source: filename]\`。

2. **Zero Hallucination**:
   - If the Source Text is NOT in the glossary, or you cannot find a matching \`[ID:xxx]\`：
     - **STRICTLY FORBIDDEN** to set issueCategory to \`Terminology\`.
     - **STRICTLY FORBIDDEN** to claim "According to the glossary..." in the description.
     - You must classify such issues as \`Style\` (General suggestion) or \`Mistranslation\` (if meaning is wrong), and explicitly state "Based on general translation standards".

3. **Citation Requirement**:
   - When describing a Terminology issue, you MUST append the ID reference.
   - Example: "Translation does not match glossary. Expect: 'Enregistrer' (Ref: [ID:TERM-002])."
`;

  const issueCategoryRuleZh = `
Issue Category 分类体系（按优先级排列）：

- Mistranslation — 含义扭曲或事实错误（翻译结果的意思与原文不同）
- Omission — 源文内容被遗漏未翻译（原文有但译文没有）
- Addition — 译文新增了原文中不存在的内容
- Terminology — 术语不一致（与加载的 Glossary 不匹配）
- Grammar — 目标语言语法错误
- Punctuation — 标点使用错误（空格、冒号、分号等）
- Capitalization — 大小写错误
- Number Formatting — 数字/货币/日期格式不符合目标 locale 标准
- Spelling — 拼写错误
- Style — 语气/风格/表达方式不符合 Style Guide
- Layout — UI 文本溢出、截断、换行不当等视觉问题
- Placeholder — 变量占位符缺失或损坏
- DNT Violation — Do Not Translate 项被错误翻译

判断规则：
- 如果源文有内容但译文完全没有对应 → Omission（不是 Mistranslation）
- 如果译文存在但意思与源文不同 → Mistranslation
- 如果是数字/货币/日期的格式问题 → Number Formatting（不是 Formatting）
- 如果是标点空格问题 → Punctuation（不是 Formatting）
`;

  const issueCategoryRuleEn = `
Issue Category Classification (Ordered by Priority):

- Mistranslation — Meaning distorted or factual error (translation meaning differs from source)
- Omission — Source content missing in translation (exists in source but not in target)
- Addition — Translation added content not present in source
- Terminology — Inconsistent terminology (does not match loaded Glossary)
- Grammar — Target language grammar error
- Punctuation — Incorrect punctuation usage (spaces, colons, semicolons, etc.)
- Capitalization — Incorrect capitalization
- Number Formatting — Number/currency/date format does not comply with target locale standards
- Spelling — Spelling error
- Style — Tone/style/expression does not comply with Style Guide
- Layout — UI text overflow, truncation, improper line breaks, or other visual issues
- Placeholder — Variable placeholder missing or corrupted
- DNT Violation — Do Not Translate item was incorrectly translated

Judgment Rules:
- If source has content but target has no corresponding translation → Omission (NOT Mistranslation)
- If translation exists but meaning differs from source → Mistranslation
- If it's a number/currency/date format issue → Number Formatting (NOT Formatting)
- If it's a punctuation/spacing issue → Punctuation (NOT Formatting)
`;

  const traceabilityRule = `
Your ONLY job in this pass is to DETECT issues. For each issue, output:
- issueCategory (from the defined category list)
- severity
- location (describe where on the screen)
- sourceText
- targetText
- description
- suggestionsTarget

Do NOT fill ruleId or glossaryTermId — these will be populated by a post-processing step.
Set ruleId = "" and glossaryTermId = "" for all issues.
`;

  const suggestionQualityRuleZh = `
## Suggestion Quality Rules

1. **自然优先**：建议的修复文本必须读起来像母语者写的，不能比原译文更生硬。如果原译文省略了源文中的冗余内容且省略后更自然，不要强行补回。

2. **语义保真**：修复不得改变原文的人称（votre→le）、语气（正式→非正式）或含义。

3. **缩写谨慎**：除非 Style Guide 明确允许在 UI 中使用某个缩写（参考 abbreviations 类规则），否则不要在 suggestion 中引入原文没有的缩写。

4. **区分翻译修复 vs 工程修复**：
   - 如果问题是翻译文本本身的错误 → 提供修正后的翻译文本
   - 如果问题是 UI 容器太窄导致的换行/截断 → 明确标注 "Engineering Fix: 调整容器宽度" 而非篡改翻译

5. **Severity 与行动建议对齐**：
   - 如果你自己在 "Why fix this?" 中承认问题可以忽略（如 "Consider keeping it as a Minor stylistic preference"），那 severity 应该降为 Preferential 而非 Minor，或者直接不报告这个 issue。
`;

  const suggestionQualityRuleEn = `
## Suggestion Quality Rules

1. **Natural First**: Suggested fixes must read like they were written by a native speaker and must not be more awkward than the original translation. If the original translation omitted redundant source content and sounds more natural, do not force it back in.

2. **Semantic Fidelity**: Fixes must not change the original person (e.g., your→the), tone (formal→informal), or meaning.

3. **Cautious Abbreviations**: Do not introduce abbreviations in suggestions that are not in the source, UNLESS the Style Guide explicitly allows them in the UI (refer to abbreviations rules).

4. **Distinguish Translation Fix vs Engineering Fix**:
   - If the issue is an error in the translated text itself → Provide the corrected translation text
   - If the issue is line wrapping/truncation caused by a narrow UI container → Explicitly state "Engineering Fix: Adjust container width" instead of tampering with the translation

5. **Align Severity with Actionable Advice**:
   - If you admit in "Why fix this?" that the issue can be ignored (e.g., "Consider keeping it as a Minor stylistic preference"), the severity should be downgraded to Preferential instead of Minor, or simply do not report the issue.
`;

  const taskDesc = isZh
    ? `任务目标：
这是一次 UI 截图测试。
${maskInstructionZh}
${termRulesZh}
${issueCategoryRuleZh}
${traceabilityRule}
${suggestionQualityRuleZh}

你需要从两个角度检查**有效区域**内的内容：
1. 语言层面：翻译准确性（不包含未翻译的内容）、术语、语法、语气、文化与格式（日期/数字/单位）；
2. 视觉层面：${langName}文本是否因为长度增加而导致 截断（Truncation）、溢出、重叠、换行异常 等 UI 问题。

**重要规则 - 建议 (Suggestion)**：
- 对于“UI 截断”问题，你的首要任务是提供更短的翻译（缩写或同义词）以适应空间。
- 只有在无法缩短时，才建议“允许换行”或“增加宽度”。
- 绝不允许“建议”字段为空。

**CRITICAL RULE - FIXING RATIONALE (修复理由)**:
- 你正在为非母语开发者提供建议。对于每一个问题，你**必须**提供一个 'suggestionRationale'。
- 解释如果不修复这个 Bug 会带来的**影响 (IMPACT)**。
- 示例：
  - "德国用户会认为这具有冒犯性。" (文化)
  - "这个文本长度会破坏移动端布局。" (技术)
  - "ISO 8601 标准要求使用此日期格式。" (标准)
  - "轻微的风格偏好，优先级低。" (低严重度)

**术语来源追溯 (Glossary Source Tracing)**：
- 术语表数据中每条术语末尾附有 \`[source: 文件名]\` 标签，例如：\`Company greeting = Begrüßung des Unternehmens [source: terms_en_de-DE_2025.csv]\`。
- 当你判定一个问题属于 **Terminology** 类别时，**必须**将该术语匹配到的来源文件名填入 \`glossarySource\` 字段。
- 直接使用 \`[source: ...]\` 标签中的文件名文本，不要修改或省略。
- 如果术语不属于任何已加载的术语表（即该问题基于你自身的语言知识判定），则 \`glossarySource\` 填写 "LLM Knowledge"。
- 非 Terminology 类型的 Issue 不需要填写此字段。

**Style Guide 规则追溯 (Style Guide Rule Tracing)**：
- 如果你发现违反了 \`styleGuideRules\` 部分提供的特定 Style Guide 规则，**必须**将问题分类为 **Style** 或相关类别。
- 你**必须**将 \`[RULE xxx]\` 标签中的精确 Rule ID（例如 \`FR-FR_RULE_00045\`）填入 \`ruleId\` 字段，并在 \`ruleDescription\` 中简要描述规则。

注意：请忽略所有“未翻译（Untranslated）”的文本，这部分由其他团队负责。
再次强调：**所有报告内容必须使用中文输出。**`
    : `Task Objective:
This is a UI Screenshot Testing task.
${maskInstructionEn}
${termRulesEn}
${issueCategoryRuleEn}
${traceabilityRule}
${suggestionQualityRuleEn}

You need to inspect the **VALID AREAS** from two perspectives:
1. Linguistic: Translation accuracy (excluding untranslated text), terminology, grammar, tone, culture, and formatting (dates/numbers/units).
2. Visual: Check for UI issues caused by text expansion in ${langName}, such as Truncation, Overflow, Overlap, or abnormal line breaks.

**CRITICAL RULE - SUGGESTIONS**:
- For "Visual Truncation" issues, your PRIMARY job is to suggest a SHORTER TRANSLATION (abbreviation or synonym) to fit the space.
- Only suggest "allow wrapping" or "increase width" if no shorter text is possible.
- The 'suggestionsTarget' field MUST NEVER BE EMPTY.

**CRITICAL RULE - FIXING RATIONALE**:
- You are advising a non-native developer. For every issue, you MUST provide a 'suggestionRationale'.
- Explain the IMPACT of the bug if left unfixed.
- Examples:
  - "German users will find this offensive." (Cultural)
  - "This text length breaks the mobile layout." (Technical)
  - "ISO 8601 requires this date format." (Standard)
  - "Minor style preference, low priority." (Low Severity)

**GLOSSARY SOURCE TRACING**:
- Each term in the glossary data has a \`[source: filename]\` tag appended, e.g., \`Company greeting = Begrüßung des Unternehmens [source: terms_en_de-DE_2025.csv]\`.
- When you classify an issue as **Terminology**, you **MUST** populate the \`glossarySource\` field with the exact filename from the \`[source: ...]\` tag of the matched term.
- Use the filename text directly from the tag — do not modify or abbreviate it.
- If the terminology issue is based on your own linguistic knowledge (not from any loaded glossary), set \`glossarySource\` to "LLM Knowledge".
- Non-Terminology issues do not need this field.

**STYLE GUIDE RULE TRACING**:
- If you find a violation of a specific Style Guide rule provided in the \`styleGuideRules\` section, you MUST classify the issue as **Style** or related category.
- You MUST populate the \`ruleId\` field with the exact Rule ID (e.g., \`FR-FR_RULE_00045\`) from the \`[RULE xxx]\` tag, and briefly describe it in \`ruleDescription\`.

NOTE: Please IGNORE all "Untranslated" text, as this is handled by another team.
REITERATION: **ALL REPORT CONTENT MUST BE IN ENGLISH.**`;

  // SkillBank Integration: inject retrieved skills between task description and evaluation dimensions
  const skillsSection = skillsBlock
    ? `\n${skillsBlock}\n`
    : '';

  const styleGuideSection = styleGuideBlock
    ? `\n${styleGuideBlock}\n`
    : '';

  return `
${roleDesc}
You possess strong visual understanding capabilities to read and analyze UI screenshots.

Inputs:
1. sourceScreenshot: en-US Interface (Source)
2. targetScreenshot: ${langCode} Interface (Target)
3. glossaryText (Optional): Project context/glossary strings.
4. styleGuideRules (Optional): Official translation style rules.

${taskDesc}
${skillsSection}
${styleGuideSection}
Evaluation Dimensions (0-5 score):
- Translation Accuracy
- Terminology Consistency
- Layout & Truncation
- Grammar & Spelling
- Locale Formatting
- Localization & Tone

Please verify every single issue found against the glossary and the visual evidence.
`;
};