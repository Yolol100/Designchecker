import { evidence } from '../core/evidence.js';
import { inspectDesign } from './design.js';
import { scanAccessibility } from './accessibility.js';
import { inspectSeo, checkLinks } from './seo.js';
import { inspectElementor } from './elementor.js';

export async function collectQaEvidence(target: string) {
  const [design, accessibility, seo, links, elementor] = await Promise.all([inspectDesign(target), scanAccessibility(target), inspectSeo(target), checkLinks(target, 25), inspectElementor(target)]);
  return evidence({ owner: 'website-qa-checklist', tool: 'qa_collect_page_evidence', target, data: { design, accessibility, seo, links, elementor }, limits: ['Evidence bundle only. It does not issue source_go, runtime GO, WCAG conformance, legal compliance or conversion guarantees.', 'Keyboard, screenreader, real-device, form-delivery, tracking and authenticated-flow tests remain separate when relevant.'] });
}
