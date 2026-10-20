import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NO_ERRORS_SCHEMA, effect, inject, input, signal, viewChild } from '@angular/core';
import { InnerHistory, NavigationHistoryService } from '../../../src/app/core/layout/navigation-history.service';

/** The parts of Electron's `<webview>` element this page uses. */
interface WebviewElement extends HTMLElement {
  canGoBack(): boolean;
  canGoForward(): boolean;
  goBack(): void;
  goForward(): void;
  executeJavaScript(code: string): Promise<unknown>;
}

// The webview has no browser chrome, so the mouse's back and forward buttons walk the page's history.
const MOUSE_HISTORY = `addEventListener('mouseup', (event) => {
  if (event.button === 3) history.back();
  else if (event.button === 4) history.forward();
});`;

/**
 * music.youtube.com in a webview. The shell keeps it once opened, so YouTube keeps playing on other pages;
 * it shows only on /youtube, where the header's Back and Forward walk its history first.
 */
@Component({
  selector: 'app-youtube-view',
  standalone: true,
  templateUrl: './youtube-view.component.html',
  styleUrl: './youtube-view.component.scss',
  // <webview> is Electron's element, unknown to Angular; it is the only element in the template.
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.active]': 'active()' },
})
export class YoutubeViewComponent {
  readonly active = input(false);
  private readonly navHistory = inject(NavigationHistoryService);
  private readonly view = viewChild.required<ElementRef<WebviewElement>>('view');
  private readonly canGoBack = signal(false);
  private readonly canGoForward = signal(false);
  private readonly history: InnerHistory = {
    canGoBack: this.canGoBack.asReadonly(),
    canGoForward: this.canGoForward.asReadonly(),
    back: () => this.view().nativeElement.goBack(),
    forward: () => this.view().nativeElement.goForward(),
  };

  constructor() {
    effect(() => this.navHistory.setInnerHistory(this.active() ? this.history : null));
    inject(DestroyRef).onDestroy(() => this.navHistory.setInnerHistory(null));
  }

  onNavigate(): void {
    const view = this.view().nativeElement;
    this.canGoBack.set(view.canGoBack());
    this.canGoForward.set(view.canGoForward());
  }

  onDomReady(): void {
    this.onNavigate();
    void this.view().nativeElement.executeJavaScript(MOUSE_HISTORY);
  }
}
