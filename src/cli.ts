import {
  captureDesignBaseline,
  checkLinks,
  collectQaEvidence,
  compareScreenshots,
  inspectDesign,
  inspectElementor,
  inspectLeadSite,
  inspectSeo,
  runLighthouse,
  scanAccessibility,
  validateHtml
} from './tools/index.js';
import type { Owner } from './core/types.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error('Command required: design|seo|a11y|elementor|leads|qa|links|performance|html|baseline|diff');
  const owner = process.env.WEBACTUEEL_EVIDENCE_OWNER as Owner | undefined;
  const tool = process.env.WEBACTUEEL_EVIDENCE_TOOL || undefined;
  let result: unknown;
  switch (command) {
    case 'design': result = await inspectDesign(required(args[0], 'URL'), owner ?? 'design', tool ?? 'design_inspect_page'); break;
    case 'seo': result = await inspectSeo(required(args[0], 'URL'), owner ?? 'seo', tool ?? 'seo_inspect_page'); break;
    case 'a11y': result = await scanAccessibility(required(args[0], 'URL'), owner ?? 'design', tool ?? 'design_accessibility_risks'); break;
    case 'elementor': result = await inspectElementor(required(args[0], 'URL'), owner ?? 'elementor', tool ?? 'elementor_inspect_page'); break;
    case 'leads': result = await inspectLeadSite(required(args[0], 'URL'), owner ?? 'leads', tool ?? 'lead_inspect_public_site'); break;
    case 'qa': result = await collectQaEvidence(required(args[0], 'URL')); break;
    case 'links': result = await checkLinks(required(args[0], 'URL'), 40, owner ?? 'seo', tool ?? 'seo_check_links'); break;
    case 'performance': result = await runLighthouse(required(args[0], 'URL'), owner ?? 'website-qa-checklist', tool ?? 'performance_lighthouse'); break;
    case 'html': result = await validateHtml(required(args[0], 'URL'), owner ?? 'website-qa-checklist', tool ?? 'html_validate_url'); break;
    case 'baseline': result = await captureDesignBaseline(required(args[0], 'URL'), required(args[1], 'output directory')); break;
    case 'diff': result = await compareScreenshots(required(args[0], 'before image'), required(args[1], 'after image'), required(args[2], 'diff image')); break;
    default: throw new Error(`Unknown command: ${command}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined || value === '') throw new Error(`${label} is required.`);
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
