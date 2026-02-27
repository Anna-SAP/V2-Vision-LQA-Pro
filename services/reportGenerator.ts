import { ScreenshotReport, QaScores } from '../types';

// --- Strict Grading & Naming Logic ---

export const determineStrictQuality = (report: ScreenshotReport): 'Critical' | 'Poor' | 'Good' | 'Excellent' => {
  const issues = report.issues || [];
  
  // 1. Critical Logic (Highest Priority)
  if (issues.some(i => i.severity === 'Critical')) return 'Critical';
  if (report.overall.qualityLevel === 'Critical') return 'Critical';

  // 2. Poor Logic (Override Rule)
  // Rule A: At least 1 Major issue
  const hasMajor = issues.some(i => i.severity === 'Major');
  // Rule B: More than 3 Minor issues
  const minorCount = issues.filter(i => i.severity === 'Minor').length;

  if (hasMajor || minorCount > 3) return 'Poor';

  // 3. Excellent: No issues found
  if (issues.length === 0) return 'Excellent';

  // 4. Good: Default for 1-3 minor issues
  return 'Good';
};

// Ensure visual scores match the found issues
export const enforceScoreConsistency = (report: ScreenshotReport) => {
  const issues = report.issues || [];
  
  issues.forEach(issue => {
    let scoreKey: keyof QaScores | null = null;
    
    // Map categories to score keys based on type definition
    switch(issue.issueCategory) {
      case 'Mistranslation': scoreKey = 'accuracy'; break;
      case 'Terminology': scoreKey = 'terminology'; break;
      case 'Layout': scoreKey = 'layout'; break;
      case 'Grammar': scoreKey = 'grammar'; break;
      case 'Formatting': scoreKey = 'formatting'; break;
      case 'Style': scoreKey = 'localizationTone'; break;
      default: break;
    }

    if (scoreKey) {
        // Enforce score caps based on severity
        if (issue.severity === 'Critical') {
            // Critical issues crush the score to 1
            report.overall.scores[scoreKey] = Math.min(report.overall.scores[scoreKey], 1);
        } else if (issue.severity === 'Major') {
            // Major issues cap the score at 2 (Poor range)
            report.overall.scores[scoreKey] = Math.min(report.overall.scores[scoreKey], 2);
        } else if (issue.severity === 'Minor') {
            // Minor issues cap the score at 4 (Good but not Perfect)
            report.overall.scores[scoreKey] = Math.min(report.overall.scores[scoreKey], 4);
        }
    }
  });
};

export const determineIssueTypeTag = (report: ScreenshotReport): string => {
  const issues = report.issues || [];
  const hasTerm = issues.some(i => i.issueCategory === 'Terminology');
  const hasLayout = issues.some(i => i.issueCategory === 'Layout');

  if (hasTerm && hasLayout) return 'Term_Layout';
  if (hasTerm) return 'Term';
  if (hasLayout) return 'Layout';
  return 'General';
};

export const generateExportFilename = (report: ScreenshotReport, fileName: string, targetLang: string): string => {
  const quality = determineStrictQuality(report);
  const tag = determineIssueTypeTag(report);
  // Sanitize filename to ensure it's safe for file systems
  const safeName = fileName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${quality}_${tag}_${targetLang}_${safeName}.html`;
};

// --- Report Generation ---

// Helper to generate SVG Radar Chart string
const generateRadarSvg = (scores: QaScores): string => {
    // Configuration
    const width = 400;
    const height = 300;
    const cx = width / 2;
    const cy = height / 2 + 10;
    const radius = 90;
    const maxScore = 5;
    
    // Data points order matching UI
    const metrics = [
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'terminology', label: 'Terms' },
      { key: 'layout', label: 'Layout' },
      { key: 'grammar', label: 'Grammar' },
      { key: 'formatting', label: 'Format' },
      { key: 'localizationTone', label: 'Tone' },
    ];

    const angleStep = (Math.PI * 2) / metrics.length;
    
    // Helper to calculate coordinates
    const getCoords = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / maxScore) * radius;
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
        };
    };

    // Generate Grid Lines (Web)
    const gridLevels = [1, 2, 3, 4, 5];
    const gridSvg = gridLevels.map(level => {
        const points = metrics.map((_, i) => {
             const { x, y } = getCoords(level, i);
             return `${x},${y}`;
        }).join(' ');
        return `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
    }).join('');

    // Generate Axes and Labels
    const axisSvg = metrics.map((m, i) => {
        const start = { x: cx, y: cy };
        const end = getCoords(5, i);
        // Push labels out a bit
        const labelR = radius + 25;
        const angle = i * angleStep - Math.PI / 2;
        const labelX = cx + labelR * Math.cos(angle);
        const labelY = cy + labelR * Math.sin(angle);
        
        return `
            <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#e2e8f0" stroke-width="1" />
            <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#64748b" font-family="sans-serif">${m.label}</text>
        `;
    }).join('');

    // Generate Data Polygon
    const dataPoints = metrics.map((m, i) => {
        // @ts-ignore
        const val = scores[m.key] || 0;
        const { x, y } = getCoords(val, i);
        return `${x},${y}`;
    }).join(' ');

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="100%" height="100%" fill="white" />
            <!-- Grid -->
            ${gridSvg}
            <!-- Axes -->
            ${axisSvg}
            <!-- Data -->
            <polygon points="${dataPoints}" fill="#2563eb" fill-opacity="0.4" stroke="#2563eb" stroke-width="2" />
        </svg>
    `;
};

export const generateReportHtml = (
    report: ScreenshotReport, 
    fileName: string, 
    targetLang: string,
    enImageBase64?: string,
    targetImageBase64?: string
) => {
    if (!report || !report.overall || !report.summary || !report.issues) {
      return `<html><body><h1>Error: Incomplete Report Data</h1></body></html>`;
    }

    const { overall, issues, summary } = report;
    const date = new Date().toLocaleString();
    const radarSvg = generateRadarSvg(overall.scores);
    
    // Apply Strict Grading for the Display
    const strictQuality = determineStrictQuality(report);

    // Serialize issues for JS injection
    const issuesJson = JSON.stringify(issues).replace(/</g, '\\u003c');

    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 960px; margin: 0 auto; padding: 40px; background: #f8fafc; }
      .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
      .title { font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1.2; }
      .subtitle { font-size: 16px; color: #64748b; margin-top: 4px; }
      .meta { text-align: right; color: #64748b; font-size: 14px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      
      .badge-critical { background: #fee2e2; color: #991b1b; }
      .badge-poor { background: #ffedd5; color: #9a3412; }
      .badge-average { background: #fef9c3; color: #854d0e; }
      .badge-good { background: #dbeafe; color: #1e40af; }
      .badge-excellent { background: #dcfce7; color: #166534; } 
      .badge-perfect { background: #dcfce7; color: #166534; }
      
      .section { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; border: 1px solid #e2e8f0; }
      .section-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; letter-spacing: -0.01em; }
      .section-content { font-size: 15px; color: #475569; }
      
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .stat-box { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 4px; }
      .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
      
      .issue-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 20px; border-left-width: 6px; background: white; transition: transform 0.2s; }
      .issue-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      .issue-critical { border-left-color: #ef4444; } 
      .issue-major { border-left-color: #f97316; } 
      .issue-minor { border-left-color: #eab308; }
      
      .issue-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
      .issue-id { font-family: monospace; font-weight: 700; color: #334155; background: #f1f5f9; padding: 2px 6px; rounded: 4px; }
      .issue-cat { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-left: 8px; }
      .issue-sev { font-size: 12px; font-weight: 700; text-transform: uppercase; }
      .sev-critical { color: #dc2626; } .sev-major { color: #ea580c; } .sev-minor { color: #ca8a04; }

      .issue-loc { display: inline-block; background-color: #fffbeb; color: #92400e; border: 1px solid #fcd34d; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; font-family: monospace; }

      .issue-desc { margin-bottom: 16px; font-size: 15px; color: #334155; }
      
      .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .text-box { background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; }
      .text-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; display: block; }
      .text-content { word-wrap: break-word; }
      .text-content.target { text-decoration: line-through; text-decoration-color: #f87171; color: #991b1b; }
      
      .suggestion-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; }
      .suggestion-label { color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; display: block; }
      .suggestion-content { color: #166534; font-weight: 500; font-size: 14px; }
      
      .overview-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px; }
      .chart-container { display: flex; justify-content: center; align-items: center; background: #fff; }

      /* --- SLIDER COMPONENT STYLES --- */
      .slider-wrapper {
        position: relative;
        margin-top: 24px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        background: #f1f5f9;
        /* Ensure aspect ratio logic if needed, but auto height usually fine */
      }
      
      /* Instructions */
      .slider-instructions {
        font-size: 11px;
        color: #64748b;
        text-align: center;
        margin-bottom: 12px;
        font-family: monospace;
        background: #f8fafc;
        padding: 4px;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
      }

      .compare-container {
        position: relative;
        width: 100%;
        cursor: ew-resize; /* East-West resize cursor */
        line-height: 0; /* Remove gap below images */
      }

      /* Base Image (Target/Bottom Layer) */
      .target-layer {
        position: relative;
        width: 100%;
        height: auto;
        display: block;
      }

      .target-layer img {
        width: 100%;
        height: auto;
        display: block;
      }

      /* Top Layer (Source/Top Layer) */
      .source-layer {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 50%; /* JS will control this */
        overflow: hidden;
        border-right: 1px solid rgba(255,255,255,0.8);
        box-shadow: 2px 0 5px rgba(0,0,0,0.2);
        z-index: 10;
        will-change: width;
      }

      /* Critical: Inner image must match container width to ensure alignment */
      .source-layer img {
        width: 100vw; /* Fallback */
        /* JS will set specific pixel width to match container */
        height: auto;
        display: block;
      }

      /* Labels */
      .label-badge {
        position: absolute;
        top: 10px;
        padding: 4px 8px;
        background: rgba(0,0,0,0.6);
        color: white;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        border-radius: 4px;
        z-index: 20;
        pointer-events: none;
        backdrop-filter: blur(2px);
      }
      .label-source { left: 10px; background: rgba(15, 23, 42, 0.8); }
      .label-target { right: 10px; background: rgba(37, 99, 235, 0.8); }

      /* Slider Handle */
      .slider-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%; /* JS will control this */
        width: 40px;
        height: 40px;
        margin-left: -20px;
        top: 50%;
        margin-top: -20px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        pointer-events: none; /* Let clicks pass through to container */
      }

      /* X-Ray Defects */
      .x-ray-box {
        position: absolute;
        border: 2px solid #ef4444;
        background: rgba(239, 68, 68, 0.15);
        z-index: 5; /* Above Target Img, Below Source Layer */
        pointer-events: none;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.2);
      }
      .x-ray-box:hover {
        background: rgba(239, 68, 68, 0.3);
      }
      .x-ray-label {
        position: absolute;
        top: -18px;
        left: -2px;
        background: #ef4444;
        color: white;
        font-size: 9px;
        padding: 1px 4px;
        font-weight: bold;
        border-radius: 2px;
      }

    `;

    const getQualityBadgeClass = (level: string) => {
        const lower = level.toLowerCase();
        return `badge-${lower}`;
    };

    const issueHtml = issues.map(issue => `
      <div class="issue-card issue-${issue.severity.toLowerCase()}">
        <div class="issue-header">
            <div>
                <span class="issue-id">${issue.id}</span>
                <span class="issue-cat">${issue.issueCategory}</span>
            </div>
            <span class="issue-sev sev-${issue.severity.toLowerCase()}">${issue.severity}</span>
        </div>
        ${issue.location ? `<div class="issue-loc">${issue.location}</div>` : ''}
        <p class="issue-desc">${issue.description}</p>
        <div class="comparison-grid">
            <div class="text-box">
                <span class="text-label">Source (EN-US)</span>
                <div class="text-content">${issue.sourceText || '-'}</div>
            </div>
            <div class="text-box">
                <span class="text-label">Current (${targetLang})</span>
                <div class="text-content target">${issue.targetText || '-'}</div>
            </div>
        </div>
        <div class="suggestion-box">
            <span class="suggestion-label">Suggestion</span>
            <div class="suggestion-content">${issue.suggestionsTarget?.join('<br/>') || '-'}</div>
        </div>
        ${issue.suggestionRationale ? `
        <div class="suggestion-box" style="margin-top: 8px; background: #fffbeb; border-color: #fef3c7;">
            <span class="suggestion-label" style="color: #92400e;">Why fix this?</span>
            <div class="suggestion-content" style="color: #92400e;">${issue.suggestionRationale}</div>
        </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LQA Report - ${fileName}</title>
            <style>${styles}</style>
        </head>
        <body>
          <div class="header">
            <div>
                <div class="title">Vision LQA Report</div>
                <div class="subtitle">File: ${fileName} &nbsp;|&nbsp; Target: ${targetLang}</div>
            </div>
            <div class="meta">
                <div>Generated: ${date}</div>
                <div style="margin-top:8px;">
                    <span class="badge ${getQualityBadgeClass(strictQuality)}">${strictQuality} Quality</span>
                </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Overview</div>
            <div class="overview-grid">
                <div>
                   <div class="stat-grid">
                        <div class="stat-box">
                            <div class="stat-label">Total Issues</div>
                            <div class="stat-value">${issues.length}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Critical / Major</div>
                            <div class="stat-value" style="color:#dc2626">${summary.severeCount + summary.majorCount}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Accuracy Score</div>
                            <div class="stat-value" style="color:#2563eb">${overall.scores?.accuracy || 0}<span style="font-size:14px;color:#94a3b8;font-weight:400">/5</span></div>
                        </div>
                   </div>
                   <div class="text-box" style="margin-top: 10px;">
                      <span class="text-label">Main Problems</span>
                      <p style="font-size: 14px; color: #475569; margin: 0;">${overall.mainProblemsSummary}</p>
                   </div>
                </div>
                <div class="chart-container">
                    ${radarSvg}
                </div>
            </div>
          </div>

          ${(enImageBase64 && targetImageBase64) ? `
          <div class="section">
            <div class="section-title">Visual Comparison (X-Ray Mode)</div>
            <div class="slider-instructions">
               Drag slider or use <kbd>←</kbd> <kbd>→</kbd> keys. Press <kbd>Space</kbd> to flicker toggle.
            </div>
            
            <div class="slider-wrapper" id="sliderWrapper" tabindex="0" aria-label="Comparison Slider">
                <div class="compare-container" id="compareContainer">
                    
                    <!-- Target Layer (Bottom) + Defects -->
                    <div class="target-layer" id="targetLayer">
                        <img src="${targetImageBase64}" alt="Target UI" id="targetImg" />
                        <span class="label-badge label-target">Target (${targetLang})</span>
                        <!-- X-Ray boxes will be injected here via JS -->
                    </div>

                    <!-- Source Layer (Top, Clipped) -->
                    <div class="source-layer" id="sourceLayer" style="width: 50%;">
                        <img src="${enImageBase64}" alt="Source UI" id="sourceImg" />
                        <span class="label-badge label-source">Source (EN-US)</span>
                    </div>

                    <!-- Handle -->
                    <div class="slider-handle" id="sliderHandle" style="left: 50%;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:-12px"><path d="m15 18-6-6 6-6"/></svg>
                    </div>

                </div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Scene Description</div>
            <div class="section-content">${overall.sceneDescription}</div>
          </div>

          <div class="section">
             <div class="section-title">Optimization Advice</div>
             <div class="section-content">${summary.optimizationAdvice}</div>
          </div>

          ${summary.termAdvice ? `
          <div class="section">
             <div class="section-title">Terminology Advice</div>
             <div class="section-content">${summary.termAdvice}</div>
          </div>
          ` : ''}

          <div class="section" style="background:transparent; border:none; padding:0; box-shadow:none;">
            <div class="section-title" style="margin-bottom:20px; border:none;">Detailed Issues</div>
            ${issueHtml}
          </div>
          
          <div style="text-align:center; color:#94a3b8; font-size:12px; margin-top:40px;">
            Generated by Vision LQA Pro
          </div>

          <!-- Component Logic -->
          <script>
            (function() {
                const issues = ${issuesJson};
                const container = document.getElementById('compareContainer');
                const wrapper = document.getElementById('sliderWrapper');
                const sourceLayer = document.getElementById('sourceLayer');
                const sourceImg = document.getElementById('sourceImg');
                const targetImg = document.getElementById('targetImg');
                const targetLayer = document.getElementById('targetLayer');
                const handle = document.getElementById('sliderHandle');
                
                if (!container || !sourceLayer || !handle) return;

                let isDragging = false;
                let currentPos = 50;

                // 1. Initialize X-Ray Boxes
                const initXRay = () => {
                   issues.forEach(issue => {
                      if (issue.boundingBox) {
                         const box = document.createElement('div');
                         box.className = 'x-ray-box';
                         // Bounding box from LLM is 0-1 normalized
                         box.style.left = (issue.boundingBox.x * 100) + '%';
                         box.style.top = (issue.boundingBox.y * 100) + '%';
                         box.style.width = (issue.boundingBox.width * 100) + '%';
                         box.style.height = (issue.boundingBox.height * 100) + '%';
                         
                         const label = document.createElement('div');
                         label.className = 'x-ray-label';
                         label.innerText = issue.id;
                         box.appendChild(label);
                         
                         targetLayer.appendChild(box);
                      }
                   });
                };
                initXRay();

                // 2. Sync Source Image Width
                // The source image inside the clipped layer MUST be the same width as the container
                // to act as a perfect overlay.
                const syncDimensions = () => {
                    const w = container.offsetWidth;
                    if (sourceImg) sourceImg.style.width = w + 'px';
                };
                window.addEventListener('resize', syncDimensions);
                // Also trigger on load
                if (targetImg) {
                    targetImg.onload = syncDimensions;
                    // Fallback
                    setTimeout(syncDimensions, 100);
                }

                // 3. Update Slider
                const setPosition = (percent) => {
                    currentPos = Math.max(0, Math.min(100, percent));
                    sourceLayer.style.width = currentPos + '%';
                    handle.style.left = currentPos + '%';
                };

                const handleMove = (clientX) => {
                    const rect = container.getBoundingClientRect();
                    const x = clientX - rect.left;
                    const percent = (x / rect.width) * 100;
                    setPosition(percent);
                };

                // Mouse Events
                container.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    handleMove(e.clientX);
                });
                window.addEventListener('mouseup', () => isDragging = false);
                window.addEventListener('mousemove', (e) => {
                    if (isDragging) handleMove(e.clientX);
                });

                // Touch Events
                container.addEventListener('touchstart', (e) => {
                    isDragging = true;
                    handleMove(e.touches[0].clientX);
                });
                window.addEventListener('touchend', () => isDragging = false);
                window.addEventListener('touchmove', (e) => {
                    if (isDragging) handleMove(e.touches[0].clientX);
                });

                // 4. Keyboard Controls (Flicker & Fine Tune)
                wrapper.addEventListener('keydown', (e) => {
                    const step = 1; 
                    if (e.key === 'ArrowLeft') {
                        setPosition(currentPos - step);
                    } else if (e.key === 'ArrowRight') {
                        setPosition(currentPos + step);
                    } else if (e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault(); // Prevent scroll
                        // Flicker Logic: Toggle between extremes to spot diffs
                        if (currentPos > 50) setPosition(0);
                        else setPosition(100);
                    }
                });

            })();
          </script>
        </body>
      </html>
    `;
};