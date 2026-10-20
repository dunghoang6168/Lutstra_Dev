import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  onExit(): void {
    this.devMode.disable();
    this.queueActions.notify('Developer mode off');
  }
}
