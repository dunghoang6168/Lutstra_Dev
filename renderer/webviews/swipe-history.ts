/*
 * Two-finger swipe on a touchpad walks a webview's history, as in Chrome: Windows sends the swipe as
 * horizontal wheel events, which Electron's <webview> does not turn into navigation. The script below is
 * injected into each page (webview.component.ts); swipeStep() decides, the rest draws the disc.
 * Both functions are stringified into the page, so they must not use anything from outside themselves.
 */

/** One swipe: its direction (-1 back, 1 forward), how far it went, or ignored (scrolls, or nowhere to go). */
export interface SwipeState {
  dir: -1 | 0 | 1;
  travel: number;
  ignored: boolean;
}

export interface SwipeContext {
  /** Something under the pointer still scrolls that way: the swipe is its scroll, not a navigation. */
  canScroll(dir: -1 | 1): boolean;
  canGo(dir: -1 | 1): boolean;
}

/** Wheel pixels a swipe needs before letting go navigates (Windows sends about 1px per px of finger travel). */
export const SWIPE_THRESHOLD = 10;

/** Folds one wheel event into the swipe; `state` null starts a new one. */
export function swipeStep(state: SwipeState | null, dx: number, dy: number, context: SwipeContext): SwipeState {
  if (state) {
    if (state.ignored) return state;
    return { ...state, travel: Math.max(0, state.travel + dx * state.dir) };
  }
  // A swipe starts mostly sideways; a vertical scroll that drifts never becomes one.
  if (dx === 0 || Math.abs(dx) <= Math.abs(dy) * 1.5) return { dir: 0, travel: 0, ignored: true };
  const dir = dx < 0 ? -1 : 1;
  if (context.canScroll(dir) || !context.canGo(dir)) return { dir, travel: 0, ignored: true };
  return { dir, travel: Math.abs(dx), ignored: false };
}

export interface SwipeColors {
  /** --color-accent-fill and --color-on-accent: the disc and its arrow. */
  fill: string;
  onFill: string;
}

/** Runs in the page: listens to wheel events and draws the disc at the edge. */
function installSwipe(step: typeof swipeStep, threshold: number, colors: SwipeColors): void {
  const win = window as Window & { __lutstraSwipe?: boolean; navigation?: { canGoBack: boolean; canGoForward: boolean } };
  if (win.__lutstraSwipe) return;
  win.__lutstraSwipe = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const disc = document.createElement('div');
  disc.setAttribute('aria-hidden', 'true');
  Object.assign(disc.style, {
    position: 'fixed', top: '50%', width: '44px', height: '44px', marginTop: '-22px', zIndex: '2147483647',
    pointerEvents: 'none', borderRadius: '50%', display: 'none', placeItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.45)', background: colors.fill, color: colors.onFill, willChange: 'transform, opacity',
  });
  // Built node by node: pages such as YouTube refuse innerHTML under Trusted Types.
  const svgNs = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNs, 'svg');
  for (const [name, value] of Object.entries({ width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) icon.setAttribute(name, value);
  const shaft = document.createElementNS(svgNs, 'path');
  const head = document.createElementNS(svgNs, 'path');
  icon.append(shaft, head);
  disc.append(icon);

  let state: SwipeState | null = null;
  let target: Element | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let hide: ReturnType<typeof setTimeout> | undefined;

  const scrolls = (dir: -1 | 1) => {
    for (let el = target; el; el = el.parentElement) {
      const overflow = getComputedStyle(el).overflowX;
      const scroller = el === document.scrollingElement || overflow === 'auto' || overflow === 'scroll';
      if (!scroller || el.scrollWidth <= el.clientWidth + 1) continue;
      if (dir < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
    }
    return false;
  };
  const goes = (dir: -1 | 1) => {
    const nav = win.navigation;
    if (nav) return dir < 0 ? nav.canGoBack : nav.canGoForward;
    return dir < 0 && history.length > 1;
  };

  // The disc rests 16px in from the edge and slides out past it (60px) as the swipe lets go. A short
  // transition smooths the gaps between the touchpad's wheel events; reduced motion only fades.
  const glide = reduced ? 'opacity 120ms linear' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms linear';
  const away = (back: boolean) => `translateX(${back ? -60 : 60}px)`;
  const draw = (swipe: SwipeState) => {
    const progress = Math.min(1, swipe.travel / threshold);
    const back = swipe.dir < 0;
    clearTimeout(hide);
    if (!disc.isConnected) document.documentElement.append(disc);
    if (disc.style.display === 'none') {
      // Start past the edge, so the first frame slides in instead of appearing in place.
      Object.assign(disc.style, { display: 'grid', transition: 'none', left: back ? '16px' : '', right: back ? '' : '16px', transform: away(back), opacity: '0' });
      shaft.setAttribute('d', back ? 'M19 12H5' : 'M5 12h14');
      head.setAttribute('d', back ? 'm12 19-7-7 7-7' : 'm12 5 7 7-7 7');
      void disc.getBoundingClientRect();
    }
    const shift = reduced ? 0 : (1 - progress) * (back ? -60 : 60);
    Object.assign(disc.style, { transition: glide, transform: `translateX(${shift}px)`, opacity: String(reduced ? 1 : 0.4 + progress * 0.6) });
  };
  const finish = () => {
    const swipe = state;
    state = null;
    if (!swipe || swipe.ignored) return;
    if (swipe.travel >= threshold) {
      if (swipe.dir < 0) history.back();
      else history.forward();
    }
    Object.assign(disc.style, { transition: glide, transform: reduced ? 'none' : away(swipe.dir < 0), opacity: '0' });
    hide = setTimeout(() => { disc.style.display = 'none'; }, 200);
  };

  addEventListener('wheel', (event) => {
    // Ctrl + wheel is a pinch zoom; a mouse wheel scrolls in whole lines or pages.
    if (event.ctrlKey || event.deltaMode !== 0) return;
    if (!state) target = event.target instanceof Element ? event.target : null;
    state = step(state, event.deltaX, event.deltaY, { canScroll: scrolls, canGo: goes });
    if (!state.ignored) draw(state);
    clearTimeout(idle);
    // The touchpad sends no end event: the swipe ends when the wheel goes quiet.
    idle = setTimeout(finish, 140);
  }, { passive: true, capture: true });
}

/** The script for one page, coloured like Lutstra (the tokens read from the app's root). */
export function swipeScript(colors: SwipeColors): string {
  return `(${installSwipe.toString()})(${swipeStep.toString()}, ${SWIPE_THRESHOLD}, ${JSON.stringify(colors)});`;
}
