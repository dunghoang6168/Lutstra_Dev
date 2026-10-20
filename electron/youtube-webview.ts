import { session, shell, type BrowserWindow, type WebContents } from 'electron';

/** The YouTube Music page embeds music.youtube.com in a `<webview>` with its own persistent session (sign-in). */
export const YOUTUBE_PARTITION = 'persist:youtube-music';
const HOME = 'https://music.youtube.com/';

export function installYoutubeWebview(window: BrowserWindow): void {
  const youtube = session.fromPartition(YOUTUBE_PARTITION);
  // Keep Electron's own User-Agent: Google rejects a Chrome one whose client hints say Chromium
  // ("This browser or app may not be secure"), and accepts the honest one, as pear-desktop does.
  youtube.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'fullscreen'));
  youtube.setPermissionCheckHandler((_contents, permission) => permission === 'fullscreen');

  window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Only YouTube Music, in its own session, without Node or a preload.
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    if (params['partition'] !== YOUTUBE_PARTITION || !params['src']?.startsWith(HOME)) event.preventDefault();
  });
  window.webContents.on('did-attach-webview', (_event, contents) => {
    holdPasskeysForClicks(contents);
    // Links that leave YouTube Music and its Google sign-in open in the browser.
    contents.setWindowOpenHandler(({ url }) => {
      if (isWebUrl(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (allowedInWebview(url)) return;
      event.preventDefault();
      if (isWebUrl(url)) void shell.openExternal(url);
    });
  });
}

// Google's sign-in asks for a passkey in the background. Chrome would only list it under the email
// field; Electron has no such list, so Windows Hello opens on its own and offers whatever account the
// machine holds. Passkeys are kept for a click ("Use your passkey"); background requests wait or fail
// as if dismissed.
const PASSKEYS_ON_CLICK = `(() => {
  const credentials = navigator.credentials;
  if (!credentials) return;
  const get = credentials.get.bind(credentials);
  credentials.get = (options) => {
    if (!options?.publicKey) return get(options);
    if (options.mediation === 'conditional') return new Promise(() => {});
    if (!navigator.userActivation?.isActive) return Promise.reject(new DOMException('No passkey was asked for.', 'NotAllowedError'));
    return get(options);
  };
})();`;

function holdPasskeysForClicks(contents: WebContents): void {
  try {
    // Runs before the page's own scripts on each later document (the first is YouTube Music, which asks
    // for no passkey; Google's sign-in is a navigation), which a script injected at dom-ready would not.
    contents.debugger.attach('1.3');
    void contents.debugger.sendCommand('Page.enable')
      .then(() => contents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: PASSKEYS_ON_CLICK }))
      .catch(() => undefined);
  } catch {
    // DevTools already attached (debugging): the page keeps its own passkey prompt.
  }
}

function allowedInWebview(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    return protocol === 'https:' && (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname.endsWith('.google.com'));
  } catch {
    return false;
  }
}

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
