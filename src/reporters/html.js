/**
 * @file html.js
 * @description Generates a self-contained HTML diagnostic report.
 * No external dependencies — all CSS/JS is inlined.
 * Never exposes secret values.
 */

import { gradeScore } from './score.js';

/**
 * @param {import('../core/engine.js').DiagnosticReport} report
 * @returns {string} - full HTML document string
 */
export function renderHTML(report) {
  const { grade, label } = gradeScore(report.healthScore);
  const scoreColor =
    report.healthScore >= 75 ? '#22c55e' :
    report.healthScore >= 50 ? '#f59e0b' :
    '#ef4444';

  const findingsHTML = report.findings
    .filter((f) => f.severity !== 'pass')
    .map((f) => findingRow(f))
    .join('');

  const fixesHTML = report.suggestedFixes
    .map((fix, i) => `<li>${escHtml(fix)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EnvDoctor Report — ${escHtml(report.filePath)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #0f172a; color: #e2e8f0; padding: 2rem; min-height: 100vh; }
    h1, h2, h3 { font-weight: 700; }
    a { color: #60a5fa; }
    .container { max-width: 900px; margin: 0 auto; }

    /* Header */
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
               border: 1px solid #334155; border-radius: 12px; padding: 2rem;
               margin-bottom: 2rem; display: flex; align-items: center; gap: 1.5rem; }
    .header h1 { font-size: 2rem; color: #93c5fd; }
    .header p { color: #94a3b8; margin-top: 0.25rem; }

    /* Score card */
    .score-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
                  padding: 1.5rem; margin-bottom: 2rem;
                  display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: center; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%;
                    border: 6px solid ${scoreColor}; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; }
    .score-number { font-size: 2rem; font-weight: 800; color: ${scoreColor}; line-height: 1; }
    .score-label  { font-size: 0.75rem; color: #94a3b8; }
    .score-stats  { display: flex; gap: 2rem; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.75rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .passed  { color: #22c55e; }
    .warned  { color: #f59e0b; }
    .errored { color: #ef4444; }

    /* Findings table */
    .section { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
               padding: 1.5rem; margin-bottom: 2rem; }
    .section h2 { font-size: 1.1rem; color: #93c5fd; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 0.5rem 0.75rem; color: #94a3b8;
         border-bottom: 1px solid #334155; font-weight: 600; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #1e293b; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #263148; }

    /* Badges */
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px;
             font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .badge-error   { background: #450a0a; color: #f87171; }
    .badge-warning { background: #451a03; color: #fbbf24; }
    .badge-pass    { background: #052e16; color: #4ade80; }
    .badge-info    { background: #0c1a2e; color: #60a5fa; }

    /* Fixes */
    .fixes-list { list-style: none; counter-reset: fixes; }
    .fixes-list li { counter-increment: fixes; padding: 0.5rem 0 0.5rem 2rem; position: relative;
                     border-bottom: 1px solid #334155; color: #cbd5e1; }
    .fixes-list li::before { content: counter(fixes); position: absolute; left: 0;
                              width: 1.4rem; height: 1.4rem; border-radius: 50%;
                              background: #1d4ed8; color: #fff; font-size: 0.75rem;
                              font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .fixes-list li:last-child { border-bottom: none; }

    /* Footer */
    .footer { text-align: center; color: #475569; font-size: 0.8rem; margin-top: 2rem; }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div>
      <h1>🩺 EnvDoctor</h1>
      <p>Environment Diagnostics Report</p>
      <p style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;">
        File: <code style="color:#93c5fd">${escHtml(report.filePath)}</code>
        &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}
      </p>
    </div>
  </div>

  <!-- Score -->
  <div class="score-card">
    <div class="score-circle">
      <span class="score-number">${report.healthScore}</span>
      <span class="score-label">${grade} · ${label}</span>
    </div>
    <div class="score-stats">
      <div class="stat">
        <div class="stat-value">${report.totalVars}</div>
        <div class="stat-label">Variables</div>
      </div>
      <div class="stat">
        <div class="stat-value passed">${report.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value warned">${report.warnings}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value errored">${report.errors}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color:#a78bfa">${report.securityFindings.length}</div>
        <div class="stat-label">Security</div>
      </div>
    </div>
  </div>

  <!-- Findings -->
  ${findingsHTML ? `
  <div class="section">
    <h2>🔍 Findings</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Code</th>
          <th>Variable</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${findingsHTML}</tbody>
    </table>
  </div>` : `
  <div class="section">
    <h2>🔍 Findings</h2>
    <p style="color:#4ade80">✓ No issues found — all checks passed!</p>
  </div>`}

  <!-- Fixes -->
  ${fixesHTML ? `
  <div class="section">
    <h2>🛠 Suggested Fixes</h2>
    <ul class="fixes-list">${fixesHTML}</ul>
  </div>` : ''}

  <!-- Score breakdown -->
  <div class="section">
    <h2>📊 Score Breakdown</h2>
    ${scoreBreakdownTable(report.scoreBreakdown)}
  </div>

  <div class="footer">
    Generated by <strong>EnvDoctor v1.0.0</strong> · MIT License
  </div>

</div>
</body>
</html>`;
}

function findingRow(f) {
  return `<tr>
    <td><span class="badge badge-${f.severity}">${escHtml(f.severity)}</span></td>
    <td><code style="color:#94a3b8;font-size:0.75rem">${escHtml(f.code)}</code></td>
    <td><strong>${escHtml(f.key || '—')}</strong>${f.line ? `<br><span style="color:#64748b;font-size:0.75rem">line ${f.line}</span>` : ''}</td>
    <td>${escHtml(f.message)}</td>
  </tr>`;
}

function scoreBreakdownTable(breakdown = {}) {
  const rows = Object.entries(breakdown)
    .filter(([k]) => k !== 'final')
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      return `<tr>
        <td>${escHtml(label)}</td>
        <td>${v.count ?? '—'}</td>
        <td style="color:#ef4444">${v.deduction ?? 0}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead><tr><th>Category</th><th>Count</th><th>Deduction</th></tr></thead>
    <tbody>${rows}<tr><td><strong>Final Score</strong></td><td colspan="2"><strong style="color:${breakdown.final >= 75 ? '#22c55e' : '#ef4444'}">${breakdown.final}/100</strong></td></tr></tbody>
  </table>`;
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

