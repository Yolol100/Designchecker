export const STABLE_SCREENSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const
};

export const SCREENSHOT_STABILITY_NOTE =
  'Animations are disabled, the text caret is hidden and CSS-pixel scaling is used to reduce visual-regression noise.';
