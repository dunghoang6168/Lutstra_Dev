import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getDesktopApi } from '../../../src/app/core/desktop/desktop-api';
import type { WebSite } from '../../web-sites';

/**
 * A webview site's route (`site` comes from the route's data). In the desktop app WebviewsShellComponent's
 * webview covers it; the browser preview cannot embed the site and says so.
 */
@Component({
  selector: 'dev-web-page',
  standalone: true,
  templateUrl: './web-page.component.html',
  styleUrl: './web-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebPageComponent {
  readonly site: WebSite = inject(ActivatedRoute).snapshot.data['site'];
  readonly isDesktop = Boolean(getDesktopApi());
}
