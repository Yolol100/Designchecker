import {
  captureDesignBaseline,
  compareScreenshots,
  inspectDesign,
  scanAccessibility
} from './tools/index.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error('Command required: design|a11y|baseline|diff');
  const tool = process.env.WEBACTUEEL_EVIDENCE_TOOL || undefined;
  let result: unknown;
  switch (command) {
    case 'design': result = await inspectDesign(required(args[0], 'URL'), 'design', tool ?? 'design_inspect_page'); break;
    case 'a11y': result = await scanAccessibility(required(args[0], 'URL'), 'design', tool ?? 'design_accessibility_risks'); break;
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
