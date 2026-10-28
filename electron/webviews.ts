import { app, session, shell, type BrowserWindow, type WebContents } from 'electron';
import { BADGE_MESSAGE, WEB_SITES, siteAllows } from '../web-sites.js';

/** The webview pages (YouTube Music, Facebook, Telegram): each site in its own persistent session (sign-in). */
export function installWebviews(window: BrowserWindow): void {
  for (const site of WEB_SITES) {
    const sites = session.fromPartition(site.partition);
    const allowed = (permission: string) => permission === 'fullscreen' || site.permissions.includes(permission);
    sites.setPermissionRequestHandler((_contents, permission, callback) => callback(allowed(permission)));
    // A site on Lutstra's output reads device names (enumerateDevices) and picks one (setSinkId), which
    // Chromium checks as 'media'. Only the check: a request for the microphone is still refused.
    sites.setPermissionCheckHandler((_contents, permission) => allowed(permission) || (site.sharesPlayerOutput && permission === 'media'));
    // Drop Electron's and Lutstra's tokens so the site sees plain Chrome. Not for YouTube: Google rejects a
    // Chrome one whose client hints say Chromium ("This browser or app may not be secure").
    if (site.chromeUserAgent) {
      const tokens = new RegExp(String.raw`\s(?:Electron|${app.getName()})/\S+`, 'gi');
      sites.setUserAgent(sites.getUserAgent().replace(tokens, ''));
    }
  }

  window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Only a listed site, on its home, in its own session, without Node or a preload.
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    const site = WEB_SITES.find((entry) => entry.partition === params['partition']);
    if (!site || !params['src']?.startsWith(site.home)) event.preventDefault();
  });
  window.webContents.on('did-attach-webview', (_event, contents) => {
    const site = WEB_SITES.find((entry) => session.fromPartition(entry.partition) === contents.session);
    if (!site) return;
    addPageScripts(contents, site.showsUnread);
    // Links that leave the site and its sign-in open in the browser.
    contents.setWindowOpenHandler(({ url }) => {
      if (isWebUrl(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (siteAllows(site, url)) return;
      event.preventDefault();
      if (isWebUrl(url)) void shell.openExternal(url);
    });
  });
}

// Sign-in pages ask for a passkey in the background. Chrome would only list it under the email field;
// Electron has no such list, so Windows Hello opens on its own and offers whatever account the machine
// holds. Passkeys are kept for a click ("Use your passkey"); background requests wait or fail as if
// dismissed.
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

// Telegram reports unread messages only through the Badging API (the number on the taskbar icon). The
// page's calls are logged for the renderer (BADGE_MESSAGE), then passed on, so the taskbar keeps its number.
// setAppBadge() without a count is a plain flag, counted as one.
const BADGE_REPORT = `(() => {
  const report = (count) => console.debug('${BADGE_MESSAGE}' + count);
  for (const [name, count] of [['setAppBadge', (value) => value ?? 1], ['clearAppBadge', () => 0]]) {
    const original = navigator[name] && navigator[name].bind(navigator);
    if (!original) continue;
    navigator[name] = (...args) => { report(count(args[0])); return original(...args); };
  }
})();`;

function addPageScripts(contents: WebContents, reportsBadge: boolean): void {
  try {
    // Runs before the page's own scripts on each later document (the first is the site's home, which asks
    // for no passkey; a sign-in is a navigation), which a script injected at dom-ready would not.
    contents.debugger.attach('1.3');
    void contents.debugger.sendCommand('Page.enable')
      .then(() => contents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: PASSKEYS_ON_CLICK + (reportsBadge ? BADGE_REPORT : '') }))
      // A single-page site sets its badge on that first document, so it starts over with the script in.
      .then(() => { if (reportsBadge) contents.reload(); })
      .catch(() => undefined);
  } catch {
    // DevTools already attached (debugging): the page keeps its own passkey prompt and reports no badge.
  }
}

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
