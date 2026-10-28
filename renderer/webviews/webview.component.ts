import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal } from '@angular/core';
import type { InnerHistory } from '../../../src/app/core/layout/navigation-history.service';
import { PlayerService } from '../../../src/app/core/player/player.service';
import type { WebSite } from '../../web-sites';
import type { NativeMediaKeyAction } from '../../../src/app/core/desktop/desktop-api';
import { MEDIA_PLAY_MESSAGE, OUTPUT_SCRIPT, claimMediaKeys, mediaKeyScript, releaseMediaKeys, sharedOutputName } from './player-link';
import { unreadFromBadge, unreadFromTitle } from '../../web-sites';
import { setSiteUnread } from './running-sites';
import { swipeScript } from './swipe-history';

/** The parts of Electron's `<webview>` element this page uses. */
interface WebviewElement extends HTMLElement {
  canGoBack(): boolean;
  canGoForward(): boolean;
  goBack(): void;
  goForward(): void;
  /** userGesture lets the page start playback, as from a click. */
  executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>;
}

// The webview has no browser chrome, so the mouse's back and forward buttons (and a two-finger swipe,
// swipe-history.ts) walk the page's history.
const MOUSE_HISTORY = `addEventListener('mouseup', (event) => {
  if (event.button === 3) history.back();
  else if (event.button === 4) history.forward();
});`;

/** The app's colours for the swipe disc, read when each page loads. */
function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return { fill: token('--color-accent-fill'), onFill: token('--color-on-accent') };
}

/**
 * One site in a webview. The shell keeps it while the site runs, so it plays on over other pages; it shows
 * only on the site's page.
 */
@Component({
  selector: 'dev-webview',
  standalone: true,
  template: '',
  styleUrl: './webview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.active]': 'active()' },
})
export class WebviewComponent {
  readonly site = input.required<WebSite>();
  readonly active = input(false);
  private view: WebviewElement | null = null;
  /** Media keys, while this site played last. */
  private readonly mediaKeys = (action: NativeMediaKeyAction) => void this.view?.executeJavaScript(mediaKeyScript(action), true);
  /** Bumped on each page load, once its scripts are in. */
  private readonly loads = signal(0);
  private readonly canGoBack = signal(false);
  private readonly canGoForward = signal(false);
  /** Walked by the header's Back and Forward while the page shows (the shell hands it over). */
  readonly history: InnerHistory = {
    canGoBack: this.canGoBack.asReadonly(),
    canGoForward: this.canGoForward.asReadonly(),
    back: () => this.view?.goBack(),
    forward: () => this.view?.goForward(),
  };

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const player = inject(PlayerService);
    // A site on Lutstra's output follows its device, and pauses when Lutstra starts playing.
    effect(() => {
      const name = sharedOutputName(player);
      if (this.site().sharesPlayerOutput && this.loads() > 0) void this.view?.executeJavaScript(`window.__lutstraOutput?.(${JSON.stringify(name)})`);
    });
    // Lutstra started playing: the site pauses and hands the media keys back.
    effect(() => {
      if (!this.site().sharesPlayerOutput || !player.isPlaying()) return;
      releaseMediaKeys(this.mediaKeys);
      if (this.loads() > 0) void this.view?.executeJavaScript('window.__lutstraPause?.()');
    });
    inject(DestroyRef).onDestroy(() => {
      releaseMediaKeys(this.mediaKeys);
      setSiteUnread(this.site().id, 0);
    });
    // Built by hand: the partition must be set before the webview attaches, and a template sets bound
    // attributes only after the element is in the page.
    afterNextRender(() => {
      const site = this.site();
      const view = document.createElement('webview') as WebviewElement;
      view.setAttribute('partition', site.partition);
      view.setAttribute('src', site.home);
      view.setAttribute('title', site.label);
      const onNavigate = () => {
        this.canGoBack.set(view.canGoBack());
        this.canGoForward.set(view.canGoForward());
      };
      view.addEventListener('did-navigate', onNavigate);
      view.addEventListener('did-navigate-in-page', onNavigate);
      view.addEventListener('dom-ready', () => {
        onNavigate();
        const output = site.sharesPlayerOutput ? OUTPUT_SCRIPT : '';
        void view.executeJavaScript(MOUSE_HISTORY + swipeScript(themeColors()) + output).then(() => this.loads.update((n) => n + 1));
      });
      if (site.showsUnread) {
        // Facebook counts in its title, Telegram in its app badge; whichever says more wins.
        let fromTitle = 0;
        let fromBadge = 0;
        const update = () => setSiteUnread(site.id, Math.max(fromTitle, fromBadge));
        view.addEventListener('page-title-updated', (event) => {
          fromTitle = unreadFromTitle((event as Event & { title: string }).title);
          update();
        });
        view.addEventListener('console-message', (event) => {
          const count = unreadFromBadge((event as Event & { message?: string }).message ?? '');
          if (count === null) return;
          fromBadge = count;
          update();
        });
      }
      if (site.sharesPlayerOutput) {
        // The site started playing: Lutstra pauses, so the two never play over one another, and the
        // media keys come here.
        view.addEventListener('console-message', (event) => {
          if ((event as Event & { message?: string }).message !== MEDIA_PLAY_MESSAGE) return;
          player.pause();
          claimMediaKeys(this.mediaKeys);
        });
      }
      host.append(view);
      this.view = view;
    });
  }
}
