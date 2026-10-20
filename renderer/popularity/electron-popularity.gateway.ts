import { Observable } from 'rxjs';
import { PopularityBatchSummary, PopularityGateway, PopularityProgress, TrackPopularity } from '../../../src/app/core/contracts';
import { getDesktopApi } from '../../../src/app/core/desktop/desktop-api';

/** The developer edition's preload API (dev/electron/preload.ts), beside the public `DesktopApi`. */
export interface DevDesktopApi {
  popularity: {
    get(trackIds: string[]): Promise<TrackPopularity[]>;
    fetchBatch(trackIds: string[]): Promise<PopularityBatchSummary>;
    cancel(): Promise<void>;
    onProgress(listener: (progress: PopularityProgress) => void): () => void;
  };
}

const devApi = () => getDesktopApi() as unknown as DevDesktopApi | undefined;

export class ElectronPopularityGateway implements PopularityGateway {
  readonly progress$ = new Observable<PopularityProgress>((subscriber) =>
    devApi()?.popularity.onProgress((progress) => subscriber.next(progress)));

  getPopularity(trackIds: string[]): Promise<TrackPopularity[]> {
    const api = devApi();
    if (!api) return Promise.reject(new Error('Electron desktop API is unavailable'));
    return api.popularity.get(trackIds);
  }

  fetchPopularity(trackIds: string[]): Promise<PopularityBatchSummary> {
    const api = devApi();
    if (!api) return Promise.reject(new Error('Electron desktop API is unavailable'));
    return api.popularity.fetchBatch(trackIds);
  }

  async cancelFetch(): Promise<void> {
    await devApi()?.popularity.cancel();
  }
}
