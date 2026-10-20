import { ChangeDetectionStrategy, Component, effect, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { getDesktopApi } from '../../../src/app/core/desktop/desktop-api';
import { ContentSheetService } from '../../../src/app/core/layout/content-sheet.service';
import { devModeEnabled } from '../dev-mode.service';
import { YoutubeViewComponent } from './youtube-view.component';

/**
 * In the shell's content sheet (devShellContent): creates the YouTube webview on the first visit to
 * /youtube and keeps it, so it plays on while other pages show, and marks the sheet embedded while the
 * page shows.
 */
@Component({
  selector: 'dev-youtube-shell',
  standalone: true,
  imports: [YoutubeViewComponent],
  templateUrl: './youtube-shell.component.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YoutubeShellComponent {
  private readonly router = inject(Router);
  private readonly url = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  private readonly desktop = Boolean(getDesktopApi());
  readonly onPage = () => this.desktop && devModeEnabled() && this.url().split(/[?#]/, 1)[0] === '/youtube';
  readonly opened = linkedSignal<{ onPage: boolean; devMode: boolean }, boolean>({
    source: () => ({ onPage: this.onPage(), devMode: devModeEnabled() }),
    // Kept once opened; turning developer mode off closes it.
    computation: ({ onPage, devMode }, previous) => devMode && ((previous?.value ?? false) || onPage),
  });

  constructor() {
    const embedded = inject(ContentSheetService).embedded;
    effect(() => embedded.set(this.onPage()));
  }
}
