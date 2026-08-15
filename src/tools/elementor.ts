import { evidence } from '../core/evidence.js';
import { withPage } from '../core/browser.js';
import type { Owner } from '../core/types.js';

export async function inspectElementor(target: string, owner: Owner = 'elementor', toolName = 'elementor_inspect_page') {
  const data = await withPage(target, {}, async (page) => page.evaluate(() => {
    const all = [...document.querySelectorAll<HTMLElement>('[class*="elementor"], [data-element_type], [data-widget_type]')];
    const widgets = [...document.querySelectorAll<HTMLElement>('[data-widget_type]')].map((el) => el.dataset.widget_type).filter(Boolean);
    const hiddenResponsive = [...document.querySelectorAll<HTMLElement>('.elementor-hidden-desktop,.elementor-hidden-tablet,.elementor-hidden-mobile')];
    return {
      detected: all.length > 0,
      elementorNodeCount: all.length,
      containers: document.querySelectorAll('.e-con,[data-element_type="container"]').length,
      sectionsLegacy: document.querySelectorAll('.elementor-section').length,
      columnsLegacy: document.querySelectorAll('.elementor-column').length,
      widgetCount: widgets.length,
      widgetTypes: Object.entries(widgets.reduce<Record<string, number>>((acc, item) => { if (item) acc[item] = (acc[item] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 60),
      responsiveHiddenCount: hiddenResponsive.length,
      inlineStyleAttributes: document.querySelectorAll('[style]').length,
      styleTags: document.querySelectorAll('style').length
    };
  }));
  return evidence({ owner, tool: toolName, target, data, limits: ['Rendered DOM heuristics only; does not inspect Elementor editor data, Theme Builder conditions, Kit JSON or server-side configuration.'] });
}
