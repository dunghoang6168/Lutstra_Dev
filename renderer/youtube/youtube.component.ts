import { ChangeDetectionStrategy, Component } from '@angular/core';
import { getDesktopApi } from '../../../src/app/core/desktop/desktop-api';

/**
 * The /youtube route. In the desktop app YoutubeShellComponent's webview covers it;
 * the browser preview cannot embed music.youtube.com and says so.
 */
@Component({
  selector: 'app-youtube',
  standalone: true,
  templateUrl: './youtube.component.html',
  styleUrl: './youtube.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YoutubeComponent {
  readonly isDesktop = Boolean(getDesktopApi());
}
