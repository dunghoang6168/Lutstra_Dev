import type { BrowserWindow, WebPreferences } from 'electron';
import type { DevContext } from '../../electron/dev-hooks.js';
import { validIdArray } from '../../electron/ipc/ipc-validation.js';
import { PopularityService } from './popularity.service.js';
import { installWebviews } from './webviews.js';

/*
 * The developer edition's side of electron/dev-hooks.ts, swapped in by tsup.config.ts. It must export the
 * same names with the same types.
 */

/** The webview pages; installWebviews() limits each to its own site. */
export const devWebPreferences: WebPreferences = { webviewTag: true };

export function installDev({ database, getWindow, handle }: DevContext): void {
  const popularity = new PopularityService(database, (progress) => {
    const window = getWindow();
    if (window && !window.isDestroyed()) window.webContents.send('popularity:progress', progress);
  });
  handle('popularity:get', (_event, trackIds) => popularity.get(validIdArray(trackIds)));
  handle('popularity:fetch-batch', (_event, trackIds) => popularity.fetchBatch(validIdArray(trackIds)));
  handle('popularity:cancel', () => popularity.cancel());
}

export function installDevWindow(window: BrowserWindow): void {
  installWebviews(window);
}
