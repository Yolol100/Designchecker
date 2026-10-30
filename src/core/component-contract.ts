/**
 * Generic design acceptance oracles. A screenshot cannot prove behavior.
 * Actual interaction evidence must be supplied by a controlled browser test.
 */
export type ContractVerdict = { status: 'passed' | 'failed' | 'needs_interaction_test'; failures: string[] };

export interface CarouselSnapshot {
  totalItems: number;
  fullyVisibleItems: number;
  scrollWidth: number;
  clientWidth: number;
  navigationControlCount: number;
}

export interface CarouselContract {
  expectedVisibleItems: number;
  minimumItems: number;
}

export interface CarouselInteractionEvidence {
  nextMoved: boolean;
  keyboardMoved: boolean;
}

export function assessCarouselContract(
  expected: CarouselContract,
  observed: CarouselSnapshot,
  interaction?: CarouselInteractionEvidence
): ContractVerdict {
  const failures: string[] = [];
  if (!Number.isInteger(expected.expectedVisibleItems) || expected.expectedVisibleItems < 1 ||
      !Number.isInteger(expected.minimumItems) || expected.minimumItems < 1) {
    throw new TypeError('Carousel contract must contain positive integer expectations.');
  }
  if (observed.totalItems < expected.minimumItems) failures.push('too_few_items');
  if (observed.fullyVisibleItems !== expected.expectedVisibleItems) failures.push('wrong_visible_item_count');
  if (observed.totalItems > expected.expectedVisibleItems &&
      observed.scrollWidth <= observed.clientWidth + 1) failures.push('not_horizontally_scrollable');
  if (observed.totalItems > expected.expectedVisibleItems &&
      observed.navigationControlCount < 2) failures.push('missing_navigation_controls');
  if (interaction && !interaction.nextMoved) failures.push('next_control_does_not_move');
  if (interaction && !interaction.keyboardMoved) failures.push('keyboard_control_does_not_move');
  return {
    status: failures.length ? 'failed' : !interaction ? 'needs_interaction_test' : 'passed',
    failures
  };
}

export interface ClickOnlyMenuObservation {
  opensOnClick: boolean | null;
  opensOnHover: boolean | null;
  closesOnEscape: boolean | null;
  closesOnOutside: boolean | null;
}

export function assessClickOnlyMenu(observed: ClickOnlyMenuObservation): ContractVerdict {
  const failures: string[] = [];
  if (observed.opensOnClick === false) failures.push('click_does_not_open');
  if (observed.opensOnHover === true) failures.push('hover_opens_menu');
  if (observed.closesOnEscape === false) failures.push('escape_does_not_close');
  if (observed.closesOnOutside === false) failures.push('outside_click_does_not_close');
  const untested = Object.values(observed).some((value) => value === null);
  return { status: failures.length ? 'failed' : untested ? 'needs_interaction_test' : 'passed', failures };
}

export interface ResponsiveObservation {
  viewportWidth: number;
  documentWidth: number;
}

export function assessResponsiveOverflow(rows: ResponsiveObservation[]): ContractVerdict {
  if (!rows.length) return { status: 'needs_interaction_test', failures: [] };
  const failures = rows
    .filter((row) => row.documentWidth > row.viewportWidth + 1 || row.viewportWidth < 1)
    .map((row) => 'horizontal_overflow_at_' + row.viewportWidth);
  return { status: failures.length ? 'failed' : 'passed', failures };
}
