import { createRequire } from 'node:module';
import { evidence } from '../core/evidence.js';
import { assertSafeTarget } from '../core/url.js';

const require = createRequire(import.meta.url);
const vnuModule = require('vnu-jar') as { vnu: { check(args: string[]): Promise<string> } };

export async function validateHtml(target: string) {
  const url = assertSafeTarget(target).toString();
  try {
    const output = await vnuModule.vnu.check(['--format', 'json', url]);
    return evidence({ owner: 'website-qa-checklist', tool: 'html_validate_url', target, data: { valid: true, output }, limits: ['Validator output covers markup/CSS/SVG syntax rules, not UX or browser behavior.'] });
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : String(error);
    return evidence({ owner: 'website-qa-checklist', tool: 'html_validate_url', target, status: 'partial', data: { valid: false, output: message }, limits: ['Validation errors can be legitimate blockers or context-dependent warnings; specialist interpretation is required.'] });
  }
}
