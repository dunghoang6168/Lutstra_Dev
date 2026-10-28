/** A site the developer edition embeds in a `<webview>`, each in its own persistent session (sign-in). */
export interface WebSite {
  id: string;
  label: string;
  /** The Lutstra route that shows it. */
  path: string;
  /** Served at assets/dev/; drawn as a mask so it takes the text colour. */
  icon: string;
  /** The only URL its webview may start on. */
  home: string;
  partition: string;
  /** Domains (and their subdomains) its webview may navigate to; anything else opens in the browser. */
  domains: readonly string[];
  /** Permissions granted to its pages besides fullscreen. */
  permissions: readonly string[];
  /** Send a plain Chrome User-Agent. Google refuses one (YouTube keeps Electron's), Facebook warns without one. */
  chromeUserAgent: boolean;
  /** Play on Lutstra's output and pause with it (renderer/webviews/player-link.ts). */
  sharesPlayerOutput: boolean;
  /** Reports unread messages, by its title ("(3) Facebook") or its app badge (Telegram's setAppBadge), shown
   *  as a badge in the Developer menu. */
  showsUnread: boolean;
}

export const WEB_SITES: readonly WebSite[] = [
  {
    id: 'youtube', label: 'YouTube Music', path: '/youtube', icon: 'assets/dev/youtube.svg',
    home: 'https://music.youtube.com/', partition: 'persist:youtube-music',
    domains: ['youtube.com', 'google.com'], permissions: [], chromeUserAgent: false, sharesPlayerOutput: true, showsUnread: false,
  },
  {
    id: 'facebook', label: 'Facebook', path: '/facebook', icon: 'assets/dev/facebook.svg',
    home: 'https://www.facebook.com/', partition: 'persist:facebook',
    domains: ['facebook.com', 'messenger.com'], permissions: ['notifications'], chromeUserAgent: true, sharesPlayerOutput: false, showsUnread: true,
  },
  {
    id: 'telegram', label: 'Telegram', path: '/telegram', icon: 'assets/dev/telegram.svg',
    home: 'https://web.telegram.org/a/', partition: 'persist:telegram',
    domains: ['telegram.org'], permissions: ['notifications'], chromeUserAgent: true, sharesPlayerOutput: false, showsUnread: true,
  },
  {
    // Google sign-in runs here too, so it keeps Electron's User-Agent; no microphone (voice mode).
    id: 'claude', label: 'Claude', path: '/claude', icon: 'assets/dev/claude.svg',
    home: 'https://claude.ai/', partition: 'persist:claude',
    domains: ['claude.ai', 'anthropic.com', 'google.com'], permissions: ['notifications', 'clipboard-sanitized-write'],
    chromeUserAgent: false, sharesPlayerOutput: false, showsUnread: false,
  },
];

/** The unread count a page title carries: "(3) Facebook", "(99+) …", "12 unread …"; 0 without one. */
export function unreadFromTitle(title: string): number {
  const match = /^\s*\((\d+)\+?\)/.exec(title) ?? /(\d+)\+?\s+unread/i.exec(title);
  return match ? Number(match[1]) : 0;
}

/** What the page logs when it sets its app badge (electron/webviews.ts wraps navigator.setAppBadge). */
export const BADGE_MESSAGE = '__lutstra:badge:';

/** The count in a badge message; null for any other console message. */
export function unreadFromBadge(message: string): number | null {
  if (!message.startsWith(BADGE_MESSAGE)) return null;
  const count = Number(message.slice(BADGE_MESSAGE.length));
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export function siteAllows(site: WebSite, url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && site.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
