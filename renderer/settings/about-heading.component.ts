import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueueActionsService } from '../../../src/app/core/player/queue-actions.service';
import { DevModeService } from '../dev-mode.service';
import { DevModeDialogComponent } from './dev-mode-dialog/dev-mode-dialog.component';

/** Settings › About's title: while developer mode is off, a button that asks for the developer code. */
@Component({
  selector: 'dev-about-heading',
  standalone: true,
  imports: [DevModeDialogComponent],
  templateUrl: './about-heading.component.html',
  styleUrl: './about-heading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutHeadingComponent {
  readonly devMode = inject(DevModeService);
  private readonly queueActions = inject(QueueActionsService);
  readonly dialogOpen = signal(false);

  onUnlocked(): void {
    this.dialogOpen.set(false);
    this.queueActions.notify('Developer mode on');
  }
}
