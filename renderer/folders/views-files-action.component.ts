import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { FolderView } from '../../../src/app/dev-hooks/dev-hooks.types';
import { IconComponent } from '../../../src/app/shared/components/icon/icon.component';
import { PopularityFetchService } from './popularity-fetch.service';

/** "Fetch views" on the file list: looks the listed files up again, cached or not. */
@Component({
  selector: 'dev-views-files-action',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './views-files-action.component.html',
  styleUrls: ['../../../src/app/features/folders/folders.component.scss', './views.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewsFilesActionComponent {
  readonly folder = input.required<FolderView>();
  readonly views = inject(PopularityFetchService);

  fetch(): void {
    void this.views.fetch(this.folder().listedTrackIds());
  }
}
