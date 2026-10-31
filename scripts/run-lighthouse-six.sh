#!/usr/bin/env bash
set -euo pipefail
# Direct audited Lighthouse; preserve three independent desktop and mobile reports.
if [ "$#" -ne 1 ] || [ -z "$1" ]; then echo 'One trusted target URL is required' >&2; exit 2; fi
url="$1"
for profile in desktop mobile; do
  out=.lighthouseci
  if [ "$profile" = desktop ]; then out=.lighthouseci-desktop; fi
  if [ -d "$out" ] && find "$out" -maxdepth 1 -type f -name 'lhr-*.json' | grep -q .; then
    echo 'Refusing to combine fresh Lighthouse reports with existing evidence' >&2
    exit 1
  fi
  mkdir -p "$out"
  for index in 1 2 3; do
    args=("$url" '--output=json' "--output-path=$out/lhr-$index.json" '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage')
    if [ "$profile" = desktop ]; then args+=('--preset=desktop'); fi
    ./node_modules/.bin/lighthouse "${args[@]}"
  done
done
node --input-type=module <<'JS'
import {readFile} from 'node:fs/promises';
import {summarizeLighthouseRuns} from './legacy/checklist/src/lighthouse-summary.js';
for (const profile of ['desktop','mobile']) {
  const folder = profile === 'desktop' ? '.lighthouseci-desktop' : '.lighthouseci';
  const reports = await Promise.all([1,2,3].map(async (i) => JSON.parse(await readFile(`${folder}/lhr-${i}.json`, 'utf8'))));
  const summary = summarizeLighthouseRuns(reports, profile);
  if (summary.lighthouse_version !== '13.4.1' || summary.sample_count !== 3) throw new Error('Invalid Lighthouse CLI report contract');
  console.log(`Verified ${profile}: 3 Lighthouse reports, median and spread`);
}
JS
