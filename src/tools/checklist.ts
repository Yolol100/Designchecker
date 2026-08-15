import { evidence } from '../core/evidence.js';
import { inspectDesign } from './design.js';
import { scanAccessibility } from './accessibility.js';
import { inspectSeo, checkLinks } from './seo.js';
import { inspectElementor } from './elementor.js';

export async function collectQaEvidence(target: string) {
  const owner = 'website-qa-checklist' as const;
  const [design, accessibility, seo, links, elementor] = await Promise.all([
    inspectDesign(target, owner, 'qa_design_signals'),
    scanAccessibility(target, owner, 'qa_accessibility_risks'),
    inspectSeo(target, owner, 'qa_seo_signals'),
    checkLinks(target, 25, owner, 'qa_check_links'),
    inspectElementor(target, owner, 'qa_elementor_signals')
  ]);
  return evidence({ owner, tool: 'qa_collect_page_evidence', target, data: { design, accessibility, seo, links, elementor }, limits: ['Evidence bundle only. It does not issue source_go, runtime GO, WCAG conformance, legal compliance or conversion guarantees.', 'Keyboard, screenreader, real-device, form-delivery, tracking and authenticated-flow tests remain separate when relevant.'] });
}
