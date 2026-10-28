import { computed, inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { POPULARITY_GATEWAY } from '../../src/app/core/contracts';
import { getDesktopApi } from '../../src/app/core/desktop/desktop-api';
import type { DevMenu, FolderExtension } from '../../src/app/dev-hooks/dev-hooks.types';
import { DevModeService, devModeEnabled } from './dev-mode.service';
import { ViewsBannerComponent } from './folders/views-banner.component';
import { ViewsCellComponent } from './folders/views-cell.component';
import { ViewsFilesActionComponent } from './folders/views-files-action.component';
import { ViewsToolbarComponent } from './folders/views-toolbar.component';
import { ElectronPopularityGateway } from './popularity/electron-popularity.gateway';
import { MockPopularityGateway } from './popularity/mock-popularity.gateway';
import { AboutHeadingComponent } from './settings/about-heading.component';
import { AboutItemComponent } from './settings/about-item.component';
import { WEB_SITES } from '../web-sites';
import { routeMediaKey } from './webviews/player-link';
import { runningSites, setSiteRunning, unreadCounts } from './webviews/running-sites';
import { WebviewsShellComponent } from './webviews/webviews-shell.component';

/*
 * The developer edition's side of src/app/dev-hooks/index.ts, swapped in by angular.json's `full`
 * configuration. It must export the same names with the same types.
 */

const devModeOnly = () => inject(DevModeService).enabled() || inject(Router).parseUrl('/home');

export const devRoutes: Routes = [
  {
    path: 'random-folder',
    canActivate: [devModeOnly],
    loadComponent: () => import('./random-folder/random-folder.component').then((m) => m.RandomFolderComponent),
  },
  ...WEB_SITES.map((site) => ({
    path: site.path.slice(1),
    canActivate: [devModeOnly],
    data: { site },
    loadComponent: () => import('./webviews/web-page.component').then((m) => m.WebPageComponent),
  })),
];

export const devProviders = [
  { provide: POPULARITY_GATEWAY, useFactory: () => getDesktopApi() ? new ElectronPopularityGateway() : new MockPopularityGateway() },
];

export const devMenu: DevMenu | null = {
  visible: devModeEnabled,
  entries: [
    { label: 'Music Roulette', path: '/random-folder', icon: 'assets/dev/gacha_cards_outline.svg' },
    ...WEB_SITES.map(({ id, label, path, icon, showsUnread }) => ({
      label, path, icon,
      running: { on: computed(() => runningSites().has(id)), set: (on: boolean) => setSiteRunning(id, on) },
      ...(showsUnread ? { unread: computed(() => unreadCounts().get(id) ?? 0) } : {}),
    })),
  ],
};

export const devAboutHeading = AboutHeadingComponent;
export const devAboutItem = AboutItemComponent;
export const devShellContent = WebviewsShellComponent;
export const devMediaKey = routeMediaKey;

export const devFolderExtension: FolderExtension | null = {
  visible: devModeEnabled,
  toolbar: ViewsToolbarComponent,
  banner: ViewsBannerComponent,
  filesAction: ViewsFilesActionComponent,
  column: { header: 'Views', cell: ViewsCellComponent },
};
