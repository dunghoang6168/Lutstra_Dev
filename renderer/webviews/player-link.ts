import type { NativeMediaKeyAction } from '../../../src/app/core/desktop/desktop-api';
import { SYSTEM_DEFAULT_OUTPUT_ID } from '../../../src/app/core/models/audio-output.model';

/*
 * A site that shares Lutstra's output (YouTube Music): its media plays on the device Lutstra plays on,
 * the two pause each other so they never play over one another, and the media keys go to whichever
 * played last.
 */

/** What the page reports when its media starts, read from the webview's console-message event. */
export const MEDIA_PLAY_MESSAGE = '__lutstra:media-play';

// Runs in the page. Chromium hashes device ids per site, so the device is matched by its name; Chromium may
// add a USB "(vid:pid)" to a name Windows gives without one.
export const OUTPUT_SCRIPT = `(() => {
  if (window.__lutstraOutput) return;
  let wanted = '';
  const sinkId = async () => {
    if (!wanted) return '';
    const devices = await navigator.mediaDevices.enumerateDevices();
    const device = devices.find((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications'
      && (d.label === wanted || d.label.startsWith(wanted + ' (')));
    return device ? device.deviceId : '';
  };
  const apply = async () => {
    const id = await sinkId();
    for (const media of document.querySelectorAll('video, audio')) {
      if (media.sinkId !== id) await media.setSinkId(id).catch(() => undefined);
    }
  };
  addEventListener('play', (event) => {
    if (!(event.target instanceof HTMLMediaElement)) return;
    void apply();
    console.debug('${MEDIA_PLAY_MESSAGE}');
  }, true);
  window.__lutstraOutput = (name) => { wanted = name; return apply(); };
  window.__lutstraPause = () => document.querySelectorAll('video, audio').forEach((media) => media.pause());
})();`;

export interface PlayerOutput {
  preferredAudioOutputId(): string;
  preferredAudioOutputName(): string;
  audioEngineBackend(): string;
  outputMode(): string;
}

/** The device name the site should play on; '' is Windows' default output. */
export function sharedOutputName(player: PlayerOutput): string {
  // Exclusive holds the device for Lutstra alone, so the site waits it out on the default output.
  const exclusive = player.audioEngineBackend() === 'native-shared' && player.outputMode() !== 'shared';
  if (exclusive || player.preferredAudioOutputId() === SYSTEM_DEFAULT_OUTPUT_ID) return '';
  return player.preferredAudioOutputName();
}

/** Runs in the page: a media key pressed in Lutstra, on YouTube Music's own player bar. */
export function mediaKeyScript(action: NativeMediaKeyAction): string {
  return `((action) => {
  const bar = document.querySelector('ytmusic-player-bar');
  // Each control is a yt-icon-button wrapping the real <button>.
  const click = (selector) => {
    const control = bar && bar.querySelector(selector);
    if (control) (control.querySelector('button') || control).click();
    return Boolean(control);
  };
  const media = document.querySelector('video');
  if (action === 'play-pause') { if (!click('#play-pause-button') && media) void (media.paused ? media.play() : media.pause()); }
  else if (action === 'next') click('.next-button');
  else if (action === 'previous') click('.previous-button');
  else if (media) media.pause();
})(${JSON.stringify(action)})`;
}

let mediaKeys: ((action: NativeMediaKeyAction) => void) | null = null;

/** The site played last and takes the media keys, until Lutstra plays or the site closes. */
export function claimMediaKeys(handler: (action: NativeMediaKeyAction) => void): void {
  mediaKeys = handler;
}

export function releaseMediaKeys(handler: (action: NativeMediaKeyAction) => void): void {
  if (mediaKeys === handler) mediaKeys = null;
}

/** devMediaKey (dev-hooks): sends the key to the site that played last, if one did. */
export function routeMediaKey(action: NativeMediaKeyAction): boolean {
  if (!mediaKeys) return false;
  mediaKeys(action);
  return true;
}
