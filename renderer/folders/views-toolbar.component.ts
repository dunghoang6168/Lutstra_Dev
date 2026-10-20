import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import type { FolderView } from '../../../src/app/dev-hooks/dev-hooks.types';
import { IconComponent } from '../../../src/app/shared/components/icon/icon.component';
import { TipDirective } from '../../../src/app/shared/directives/tip.directive';
import { DevModeService } from '../dev-mode.service';
import { PopularityFetchService } from './popularity-fetch.service';

/**
 * Folders' toolbar while a folder is open: the views error, the No match filter (every unmatched track
 * under the folder, with its relative folder) and Fetch missing views.
 */
@Component({
  selector: 'dev-views-toolbar',
  standalone: true,
  imports: [IconComponent, TipDirective],
  templateUrl: './views-toolbar.component.html',
  styleUrls: ['../../../src/app/features/folders/folders.component.scss', './views.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewsToolbarComponent {
  readonly folder = input.required<FolderView>();
  readonly views = inject(PopularityFetchService);
  private readonly devMode = inject(DevModeService).enabled;
  private readonly noMatchOnly = signal(false);

  readonly missingCount = computed(() => this.folder().subtreeTrackIds().filter((id) => !this.views.popularity().has(id)).length);
  readonly unmatched = computed(() => this.folder().subtreeFiles()
    .filter((file) => file.trackId && this.views.popularity().get(file.trackId)?.status === 'unmatched')
    .sort((a, b) => a.path.localeCompare(b.path)));
  readonly showNoMatchFilter = computed(() => this.devMode() && this.folder().hasSubfolders());
  readonly noMatchActive = computed(() => this.noMatchOnly() && this.showNoMatchFilter());
  private readonly override = { title: 'No match', files: this.unmatched };

  constructor() {
    effect(() => {
      if (this.devMode()) void this.views.load(this.folder().subtreeTrackIds());
    });
    // The No match list replaces Folders' file list while it is on.
    effect(() => {
      const active = this.noMatchActive();
      const override = this.folder().override;
      untracked(() => {
        if (active) override.set(this.override);
        else if (override() === this.override) override.set(null);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.folder().override() === this.override) this.folder().override.set(null);
    });
  }

  toggleNoMatch(): void {
    this.noMatchOnly.set(!this.noMatchActive());
  }

  /** Looks up YouTube views for every uncached track under this folder, subfolders included. */
  fetchMissing(): void {
    void this.views.fetch(this.folder().subtreeTrackIds(), true);
  }
}
