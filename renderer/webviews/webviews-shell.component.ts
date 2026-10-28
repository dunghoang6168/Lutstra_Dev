import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { getDesktopApi } from '../../../src/app/core/desktop/desktop-api';
import { ContentSheetService } from '../../../src/app/core/layout/content-sheet.service';
import { NavigationHistoryService } from '../../../src/app/core/layout/navigation-history.service';
import { WEB_SITES, type WebSite } from '../../web-sites';
import { devModeEnabled } from '../dev-mode.service';
import { runningSites, setSiteRunning } from './running-sites';
import { WebviewComponent } from './webview.component';

/**
 * In the shell's content sheet (devShellContent): keeps a webview for each running site, so it plays on
 * while other pages show, starts a site on a visit to its page, and there marks the sheet embedded and lets
 * the header's Back and Forward walk the site's history first.
 */
@Component({
  selector: 'dev-webviews-shell',
  standalone: true,
  imports: [WebviewComponent],
  templateUrl: './webviews-shell.component.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebviewsShellComponent {
  readonly sites = WEB_SITES;
  private readonly router = inject(Router);
  private readonly url = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  // Turning developer mode off closes every webview (the switches stay as they were).
  private readonly live = Boolean(getDesktopApi()) ? devModeEnabled : () => false;
  readonly pageSite = computed(() => {
    const path = this.url().split(/[?#]/, 1)[0];
    return this.live() ? WEB_SITES.find((site) => site.path === path) ?? null : null;
  });

  private readonly views = viewChildren(WebviewComponent);

  constructor() {
    const embedded = inject(ContentSheetService).embedded;
    effect(() => embedded.set(this.pageSite() !== null));
    const navHistory = inject(NavigationHistoryService);
    effect(() => navHistory.setInnerHistory(this.views().find((view) => view.active())?.history ?? null));
    inject(DestroyRef).onDestroy(() => navHistory.setInnerHistory(null));
    effect(() => {
      const site = this.pageSite();
      if (site) setSiteRunning(site.id, true);
    });
  }

  shown(site: WebSite): boolean {
    return this.live() && runningSites().has(site.id);
  }
}
