import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { TrackPopularity } from '../../../src/app/core/contracts';
import { TipDirective } from '../../../src/app/shared/directives/tip.directive';
import { PopularityFetchService } from './popularity-fetch.service';

const VIEWS_FORMAT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** A file's YouTube views in Folders' Views column: a dash until fetched, "No match", or the count. */
@Component({
  selector: 'dev-views-cell',
  standalone: true,
  imports: [TipDirective],
  templateUrl: './views-cell.component.html',
  styleUrl: './views.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewsCellComponent {
  readonly trackId = input<string | null>(null);
  private readonly views = inject(PopularityFetchService);
  readonly entry = computed(() => this.views.popularity().get(this.trackId() ?? '') ?? null);

  format(views: number | null): string {
    return views == null ? '—' : VIEWS_FORMAT.format(views);
  }

  tooltip(entry: TrackPopularity): string {
    return entry.status === 'matched' ? `${entry.videoTitle ?? 'Unknown video'} · ${entry.channel ?? 'Unknown channel'}` : 'No matching upload found';
  }
}
