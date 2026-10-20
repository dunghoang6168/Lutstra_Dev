import { ipcRenderer } from 'electron';
import type { PopularityProgress } from '../../src/app/core/contracts/popularity.gateway';
import type { DevDesktopApi } from '../renderer/popularity/electron-popularity.gateway';

/* The developer edition's side of electron/dev-hooks-preload.ts, swapped in by tsup.config.ts. */

export const devPreloadApi: DevDesktopApi = {
  popularity: {
    get: (trackIds) => ipcRenderer.invoke('popularity:get', trackIds),
    fetchBatch: (trackIds) => ipcRenderer.invoke('popularity:fetch-batch', trackIds),
    cancel: () => ipcRenderer.invoke('popularity:cancel'),
    onProgress: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, value: PopularityProgress) => listener(value);
      ipcRenderer.on('popularity:progress', handler);
      return () => ipcRenderer.removeListener('popularity:progress', handler);
    },
  },
};
