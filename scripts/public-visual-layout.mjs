// Automated layout signals are triage only; human screenshot review decides defects.
// The only input is an already-open, read-only Playwright page.
export async function captureVisualLayout(page, viewport) {
  return page.evaluate(({ width, height }) => {
    const round = (n) => Math.round(n * 10) / 10;
    const px = (s) => Number.parseFloat(s) || 0;
    const getRect = (el) => el.getBoundingClientRect();
    const escapeClass = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '');
    const selector = (el) => {
      if (el.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(el.id)) return '#' + el.id;
      const classes = String(el.className && typeof el.className === 'string' ? el.className : '')
        .split(/\s+/).filter((x) => /^[A-Za-z][A-Za-z0-9_-]+$/.test(x)).slice(0, 2);
      const parent = el.parentElement;
      const siblings = parent ? [...parent.children].filter((s) => s.tagName === el.tagName) : [];
      const position = siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')' : '';
      return el.tagName.toLowerCase() + classes.map((x) => '.' + escapeClass(x)).join('') + position;
    };
    const visible = (el) => {
      const s = getComputedStyle(el), r = getRect(el);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.03 ||
          r.width < 2 || r.height < 2) return false;
      if (el.closest('[aria-hidden="true"],[hidden]')) return false;
      return true;
    };
    const issues = [];
    const counts = {};
    const add = (rule, el, observation, severity = 'review') => {
      counts[rule] = (counts[rule] || 0) + 1;
      if (issues.length >= 48 || issues.filter((x) => x.rule === rule).length >= 5) return;
      const r = el ? getRect(el) : null;
      issues.push({
        rule, severity, selector: el ? selector(el) : null, observation,
        rect: r ? { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) } : null
      });
    };
    const elements = [...document.body.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,p,li,a,button,label,input,select,textarea,img,section,article,main,.e-con,.elementor-section,.elementor-widget-heading'
    )].filter(visible);
    const paragraphs = elements.filter((e) => e.matches('p') && e.textContent.trim().length > 18);
    const headings = elements.filter((e) => /^H[1-6]$/.test(e.tagName));
    const usableText = elements.filter((e) => e.matches('p,h1,h2,h3,h4,h5,h6,label,button,a') &&
      (e.textContent || '').trim().length > 3);
    const typography = {};
    const samples = { p: paragraphs, h1: headings.filter((e) => e.matches('h1')),
      h2: headings.filter((e) => e.matches('h2')), h3: headings.filter((e) => e.matches('h3')),
      button: elements.filter((e) => e.matches('button')), label: elements.filter((e) => e.matches('label')) };
    for (const [tag, list] of Object.entries(samples)) {
      const sizes = list.map((e) => round(px(getComputedStyle(e).fontSize))).filter((n) => n > 0);
      if (!sizes.length) continue;
      const sorted = sizes.slice().sort((a, b) => a - b);
      typography[tag] = { count: sizes.length, min_px: sorted[0], median_px: sorted[Math.floor(sorted.length / 2)],
        max_px: sorted[sorted.length - 1], distinct_px: [...new Set(sorted)].slice(0, 16) };
    }
    const headingMetrics = headings.slice(0, 30).map((el) => {
      const s = getComputedStyle(el), r = getRect(el);
      const font = px(s.fontSize);
      const line = s.lineHeight === 'normal' ? font * 1.2 : px(s.lineHeight);
      return { tag: el.tagName, text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 85),
        font_px: round(font), line_height_px: round(line), lines_estimate: line > 0 ? round(r.height / line) : null,
        width: round(r.width), x: round(r.left), y: round(r.top), selector: selector(el) };
    });
    const skippedNav = (el) => el.closest('nav,[role="navigation"],.swiper,.swiper-container,.slick-slider,.owl-carousel');
    for (const el of usableText) {
      const s = getComputedStyle(el), r = getRect(el), font = px(s.fontSize), raw = (el.textContent || '').trim();
      if (font < 12.5 && raw.length > 40 && el.matches('p,label')) {
        add('small_body_font', el, { font_px: round(font), chars: raw.length });
      }
      if (width <= 390 && el.matches('h1,h2') && font > (el.matches('h1') ? 48 : 42)) {
        add('oversized_mobile_heading_review', el, { font_px: round(font), width: round(r.width) });
      }
      if (el.matches('h1,h2,h3')) {
        const line = s.lineHeight === 'normal' ? font * 1.2 : px(s.lineHeight);
        if (line && r.height / line > (width <= 390 ? 4.2 : 3.2)) {
          add('heading_many_lines', el, { lines_estimate: round(r.height / line), font_px: round(font) });
        }
      }
      if (r.width >= 14 && !skippedNav(el) && (r.left < -7 || r.right > width + 7)) {
        add('visible_text_outside_viewport', el, { left: round(r.left), right: round(r.right), viewport_width: width });
      }
      if (r.width > 15 && r.height > 8 && !skippedNav(el) &&
          (s.overflowX === 'hidden' || s.overflowX === 'clip') &&
          el.scrollWidth > el.clientWidth + 6 && s.textOverflow !== 'ellipsis' && raw.length > 10) {
        add('clipped_text_horizontal', el, { scroll: el.scrollWidth, client: el.clientWidth });
      }
      if (r.height > 9 && !skippedNav(el) && (s.overflowY === 'hidden' || s.overflowY === 'clip') &&
          el.scrollHeight > el.clientHeight + Math.max(6, font * 0.4) && raw.length > 10) {
        add('clipped_text_vertical', el, { scroll: el.scrollHeight, client: el.clientHeight });
      }
      if (el.matches('p') && raw.length > 125 && width >= 768 && r.width < width * (width < 1100 ? 0.43 : 0.25)) {
        add('narrow_long_text_column', el, { width: round(r.width), viewport: width, chars: raw.length });
      }
      if (el.matches('p') && r.width > 0 && font && r.width / (font * 0.5) > 105) {
        add('very_long_text_line_review', el, { width: round(r.width), font_px: round(font) });
      }
      if (el.matches('p') && raw.length > 80) {
        const line = s.lineHeight === 'normal' ? font * 1.2 : px(s.lineHeight);
        if (font && line && line / font < 1.14) {
          add('tight_body_line_height', el, { font_px: round(font), line_height_px: round(line) });
        }
      }
      if (el.matches('p,h1,h2,h3') && width <= 390 && r.width > 0 &&
          (r.left < 8 || r.right > width - 8) && !skippedNav(el)) {
        add('text_near_mobile_edge', el, { left: round(r.left), right: round(r.right) });
      }
    }
    for (const el of elements.filter((e) => e.matches('img'))) {
      if (!el.naturalWidth || !el.naturalHeight) continue;
      const s = getComputedStyle(el), r = getRect(el);
      const natural = el.naturalWidth / el.naturalHeight, rendered = r.width / r.height;
      const relativeDistortion = Math.abs(rendered / natural - 1);
      if (s.objectFit === 'fill' && relativeDistortion > 0.18 && r.width >= 60 && r.height >= 60) {
        add('possibly_stretched_image', el, { natural_ratio: round(natural), display_ratio: round(rendered) });
      }
    }
    if (width <= 768) {
      for (const el of elements.filter((e) => e.matches('button,input,select,textarea,a') && !e.closest('p,li') && !skippedNav(e))) {
        const r = getRect(el);
        if ((r.width < 24 || r.height < 24) && r.width > 3 && r.height > 3) {
          add('small_touch_target_review', el, { width: round(r.width), height: round(r.height) });
        }
      }
    }
    const sections = elements.filter((el) => el.matches('section,main,.e-con,.elementor-section') &&
      getRect(el).width >= Math.min(280, width * 0.75) && getRect(el).height >= 100);
    const sectionMetrics = sections.filter((el) => {
      const parent = el.parentElement;
      return el.matches('main,.elementor-top-section') || (parent && parent.matches('body,article,main,.elementor'));
    }).slice(0, 32).map((el) => {
      const s = getComputedStyle(el), r = getRect(el);
      const text = (el.innerText || '').trim();
      const imgs = el.querySelectorAll('img').length;
      const bg = s.backgroundImage !== 'none';
      const data = { selector: selector(el), y: round(r.top), height: round(r.height), width: round(r.width),
        padding_top: round(px(s.paddingTop)), padding_bottom: round(px(s.paddingBottom)),
        text_length: text.length, image_count: imgs, background_image: bg };
      if (width <= 768 && (data.padding_top > 170 || data.padding_bottom > 170)) {
        add('large_section_padding_review', el, data);
      }
      if (data.height > Math.max(440, height * 0.8) && data.text_length < 25 && imgs === 0 && !bg) {
        add('possibly_empty_tall_section', el, data);
      }
      return data;
    });
    const contentRects = [...document.querySelectorAll(
      'main h1,main h2,main h3,main p,main img,article h1,article h2,article p,article img,.elementor-widget-heading h1,.elementor-widget-heading h2,.elementor-widget-text-editor p'
    )].filter(visible).map((el) => ({ el, rect: getRect(el) }))
      .filter(({ rect }) => rect.width > 30 && rect.height > 5).sort((a, b) => a.rect.top - b.rect.top);
    let prev = null;
    for (const entry of contentRects) {
      if (prev && entry.rect.top > prev.rect.bottom) {
        const gap = entry.rect.top - prev.rect.bottom;
        if (gap > Math.max(380, height * 0.5) && entry.rect.top < document.body.scrollHeight - 100) {
          add('large_vertical_content_gap_review', entry.el, { gap_px: round(gap), previous: selector(prev.el) });
        }
      }
      if (!prev || entry.rect.bottom > prev.rect.bottom) prev = entry;
    }
    const firstContent = headings.find((el) => !el.closest('header')) || paragraphs[0] || null;
    const firstContentY = firstContent ? round(getRect(firstContent).top) : null;
    return {
      schema_version: 'visual-layout-signals/1', viewport: { width, height },
      document: { scroll_width: document.documentElement.scrollWidth, scroll_height: document.documentElement.scrollHeight,
        first_content_top: firstContentY, root_font_px: round(px(getComputedStyle(document.documentElement).fontSize)),
        body_font_px: round(px(getComputedStyle(document.body).fontSize)) },
      typography, heading_metrics: headingMetrics, section_metrics: sectionMetrics,
      issue_counts: counts, issues,
      limitations: ['Heuristic visual signals require screenshot review', 'Clipping may be intentional for carousels',
        'Font thresholds are review thresholds, not legal compliance criteria']
    };
  }, viewport);
}

// Applies the WCAG 1.4.12 override transiently. No form is submitted or site is mutated.
export async function captureTextSpacingStress(page) {
  const before = await page.evaluate(() => ({
    scroll_width: document.documentElement.scrollWidth,
    clipping: [...document.querySelectorAll('p,h1,h2,h3,button,label')]
      .filter((el) => { const s = getComputedStyle(el); return (s.overflowX === 'hidden' || s.overflowX === 'clip') &&
        el.scrollWidth > el.clientWidth + 6 && el.getBoundingClientRect().width > 0; }).length
  }));
  const style = await page.addStyleTag({ content:
    'p,li,button,label,textarea,input,select { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }'
  });
  try {
    return await page.evaluate((before) => {
      const clipped = [...document.querySelectorAll('p,h1,h2,h3,button,label')].filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflowY === 'hidden' || s.overflowY === 'clip') &&
          ((el.scrollWidth > el.clientWidth + 6) || (el.scrollHeight > el.clientHeight + 6)) &&
          el.getBoundingClientRect().width > 0;
      });
      return { before, after: { scroll_width: document.documentElement.scrollWidth, clipping_count: clipped.length,
        clipping_targets: clipped.slice(0, 6).map((e) => e.id || e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')) },
        after: null },
        requires_manual_review: true };
    }, before);
  } finally {
    await style.evaluate((element) => element.remove());
  }
}
