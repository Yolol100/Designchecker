import axe from 'axe-core';
import { evidence } from '../core/evidence.js';
import { withPage } from '../core/browser.js';
import type { Owner } from '../core/types.js';

export async function scanAccessibility(target: string, owner: Owner = 'design', toolName = 'design_accessibility_risks') {
  const data = await withPage(target, {}, async (page) => {
    await page.addScriptTag({ content: axe.source });
    return page.evaluate(async () => {
      const result = await (window as unknown as { axe: { run: () => Promise<any> } }).axe.run();
      return {
        violations: result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description, help: item.help, helpUrl: item.helpUrl, nodes: item.nodes.slice(0, 20).map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) })),
        incomplete: result.incomplete.map((item: any) => ({ id: item.id, impact: item.impact, help: item.help, nodeCount: item.nodes.length })),
        passesCount: result.passes.length,
        inapplicableCount: result.inapplicable.length
      };
    });
  });
  return evidence({ owner, tool: toolName, target, data, limits: ['Automated axe-core findings cover only machine-testable rules.', 'Keyboard, screenreader, zoom, text spacing, cognitive usability and full WCAG conformance require additional manual/runtime testing.'] });
}
