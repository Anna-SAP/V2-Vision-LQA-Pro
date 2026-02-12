import { SupportedLocale, AppLanguage } from "./types";

export const LLM_MODEL_ID = 'gemini-3-flash-preview';
export const LLM_DISPLAY_NAME = 'Gemini 3 Flash';
export const APP_VERSION = 'v1.6.1'; // Bump version

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
      loadDefault: "预置",
      defaultDe: "DE 标准术语",
      defaultFr: "FR 标准术语",
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
      emptyState: "暂无术语文件，请上传",
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
      loadDefault: "Presets",
      defaultDe: "DE Standard",
      defaultFr: "FR Standard",
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
      emptyState: "No glossary files loaded",
      termCount: "{count} terms"
    }
  }
};

export const getAnalysisSystemPrompt = (targetLang: SupportedLocale, reportLang: AppLanguage, skillsBlock?: string) => {
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
    
  const taskDesc = isZh
    ? `任务目标：
这是一次 UI 截图测试。
${maskInstructionZh}

你需要从两个角度检查**有效区域**内的内容：
1. 语言层面：翻译准确性（不包含未翻译的内容）、术语、语法、语气、文化与格式（日期/数字/单位）；
2. 视觉层面：${langName}文本是否因为长度增加而导致 截断（Truncation）、溢出、重叠、换行异常 等 UI 问题。

**重要规则 - 建议 (Suggestion)**：
- 对于“UI 截断”问题，你的首要任务是提供更短的翻译（缩写或同义词）以适应空间。
- 只有在无法缩短时，才建议“允许换行”或“增加宽度”。
- 绝不允许“建议”字段为空。

**术语来源追溯 (Glossary Source Tracing)**：
- 术语表数据中每条术语末尾附有 \`[source: 文件名]\` 标签，例如：\`Company greeting = Begrüßung des Unternehmens [source: terms_en_de-DE_2025.csv]\`。
- 当你判定一个问题属于 **Terminology** 类别时，**必须**将该术语匹配到的来源文件名填入 \`glossarySource\` 字段。
- 直接使用 \`[source: ...]\` 标签中的文件名文本，不要修改或省略。
- 如果术语不属于任何已加载的术语表（即该问题基于你自身的语言知识判定），则 \`glossarySource\` 填写 "LLM Knowledge"。
- 非 Terminology 类型的 Issue 不需要填写此字段。

注意：请忽略所有“未翻译（Untranslated）”的文本，这部分由其他团队负责。
再次强调：**所有报告内容必须使用中文输出。**`
    : `Task Objective:
This is a UI Screenshot Testing task.
${maskInstructionEn}

You need to inspect the **VALID AREAS** from two perspectives:
1. Linguistic: Translation accuracy (excluding untranslated text), terminology, grammar, tone, culture, and formatting (dates/numbers/units).
2. Visual: Check for UI issues caused by text expansion in ${langName}, such as Truncation, Overflow, Overlap, or abnormal line breaks.

**CRITICAL RULE - SUGGESTIONS**:
- For "Visual Truncation" issues, your PRIMARY job is to suggest a SHORTER TRANSLATION (abbreviation or synonym) to fit the space.
- Only suggest "allow wrapping" or "increase width" if no shorter text is possible.
- The 'suggestionsTarget' field MUST NEVER BE EMPTY.

**GLOSSARY SOURCE TRACING**:
- Each term in the glossary data has a \`[source: filename]\` tag appended, e.g., \`Company greeting = Begrüßung des Unternehmens [source: terms_en_de-DE_2025.csv]\`.
- When you classify an issue as **Terminology**, you **MUST** populate the \`glossarySource\` field with the exact filename from the \`[source: ...]\` tag of the matched term.
- Use the filename text directly from the tag — do not modify or abbreviate it.
- If the terminology issue is based on your own linguistic knowledge (not from any loaded glossary), set \`glossarySource\` to "LLM Knowledge".
- Non-Terminology issues do not need this field.

NOTE: Please IGNORE all "Untranslated" text, as this is handled by another team.
REITERATION: **ALL REPORT CONTENT MUST BE IN ENGLISH.**`;

  // SkillBank Integration: inject retrieved skills between task description and evaluation dimensions
  const skillsSection = skillsBlock
    ? `\n${skillsBlock}\n`
    : '';

  return `
${roleDesc}
You possess strong visual understanding capabilities to read and analyze UI screenshots.

Inputs:
1. sourceScreenshot: en-US Interface (Source)
2. targetScreenshot: ${langCode} Interface (Target)
3. glossaryText (Optional): Project context/glossary strings.

${taskDesc}
${skillsSection}
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