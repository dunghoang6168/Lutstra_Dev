import { inject } from '@angular/core';
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
import { YoutubeShellComponent } from './youtube/youtube-shell.component';

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
  {
    path: 'youtube',
    canActivate: [devModeOnly],
    loadComponent: () => import('./youtube/youtube.component').then((m) => m.YoutubeComponent),
  },
];

export const devProviders = [
  { provide: POPULARITY_GATEWAY, useFactory: () => getDesktopApi() ? new ElectronPopularityGateway() : new MockPopularityGateway() },
];

export const devMenu: DevMenu | null = {
  visible: devModeEnabled,
  entries: [
    { label: 'Music Roulette', path: '/random-folder', icon: 'assets/dev/gacha_cards_outline.svg' },
    { label: 'YouTube Music', path: '/youtube', icon: 'assets/dev/youtube.svg' },
  ],
};

export const devAboutHeading = AboutHeadingComponent;
export const devAboutItem = AboutItemComponent;
export const devShellContent = YoutubeShellComponent;

export const devFolderExtension: FolderExtension | null = {
  visible: devModeEnabled,
  toolbar: ViewsToolbarComponent,
  banner: ViewsBannerComponent,
  filesAction: ViewsFilesActionComponent,
  column: { header: 'Views', cell: ViewsCellComponent },
};
