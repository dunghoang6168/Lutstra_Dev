import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { getDesktopApi, type WindowMaterial } from '../../../src/app/core/desktop/desktop-api';
import { QueueActionsService } from '../../../src/app/core/player/queue-actions.service';
import { DevModeService } from '../dev-mode.service';


/** Settings › About's "Developer mode: On" item with its way out; the host hides while the mode is off. */
@Component({
  selector: 'dev-about-item',
  standalone: true,
  templateUrl: './about-item.component.html',
  styleUrl: './about-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.about-item]': 'devMode.enabled()', '[hidden]': '!devMode.enabled()' },
})
export class AboutItemComponent {
  readonly devMode = inject(DevModeService);
  private readonly queueActions = inject(QueueActionsService);
  private readonly windowControls = getDesktopApi()?.windowControls;
  /** Only Windows' Electron build draws a material; the browser preview has no API. */
  readonly canSetMaterial = !!this.windowControls && navigator.userAgent.includes('Windows');
  readonly materials: { value: WindowMaterial; label: string }[] = [
    { value: 'acrylic', label: 'Acrylic' }, { value: 'mica', label: 'Mica' }, { value: 'tabbed', label: 'Mica Alt' },
    { value: 'auto', label: 'Auto' }, { value: 'none', label: 'None' },
  ];
  readonly material = signal<WindowMaterial>('acrylic');

  async setMaterial(value: WindowMaterial): Promise<void> {
    try {
      await this.windowControls?.setMaterial(value);
      this.material.set(value);
    } catch {
      this.queueActions.notify('Could not change the window material');
    }
  }

  onExit(): void {
    this.devMode.disable();
    this.queueActions.notify('Developer mode off');
  }
}
