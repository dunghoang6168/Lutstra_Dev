import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { FolderView } from '../../../src/app/dev-hooks/dev-hooks.types';
import { IconComponent } from '../../../src/app/shared/components/icon/icon.component';
import { PopularityFetchService } from './popularity-fetch.service';

/** "Fetching views" with progress and Stop, for a fetch started by hand or after a scan. */
@Component({
  selector: 'dev-views-banner',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './views-banner.component.html',
  styleUrls: ['../../../src/app/features/folders/folders.component.scss', './views.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewsBannerComponent {
  readonly folder = input.required<FolderView>();
  readonly views = inject(PopularityFetchService);
}
