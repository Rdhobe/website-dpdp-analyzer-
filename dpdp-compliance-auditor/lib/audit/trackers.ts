const TRACKER_DOMAINS: Array<{
  suffix: string;
  category: string;
}> = [
  { suffix: "google-analytics.com", category: "analytics" },
  { suffix: "analytics.google.com", category: "analytics" },
  { suffix: "googletagmanager.com", category: "tag-manager" },
  { suffix: "doubleclick.net", category: "advertising" },
  { suffix: "googlesyndication.com", category: "advertising" },
  { suffix: "googleadservices.com", category: "advertising" },
  { suffix: "facebook.com", category: "social/advertising" },
  { suffix: "facebook.net", category: "social/advertising" },
  { suffix: "connect.facebook.net", category: "social/advertising" },
  { suffix: "hotjar.com", category: "session-replay" },
  { suffix: "hotjar.io", category: "session-replay" },
  { suffix: "mixpanel.com", category: "analytics" },
  { suffix: "segment.com", category: "customer-data-platform" },
  { suffix: "segment.io", category: "customer-data-platform" },
  { suffix: "amplitude.com", category: "analytics" },
  { suffix: "hubspot.com", category: "marketing" },
  { suffix: "hs-scripts.com", category: "marketing" },
  { suffix: "intercom.io", category: "support/messaging" },
  { suffix: "clarity.ms", category: "session-replay" },
  { suffix: "tiktok.com", category: "advertising" },
  { suffix: "analytics.tiktok.com", category: "advertising" },
  { suffix: "linkedin.com", category: "social/advertising" },
  { suffix: "licdn.com", category: "social/advertising" },
  { suffix: "twitter.com", category: "social/advertising" },
  { suffix: "ads-twitter.com", category: "advertising" },
  { suffix: "snapchat.com", category: "advertising" },
  { suffix: "sc-static.net", category: "advertising" },
  { suffix: "criteo.com", category: "advertising" },
  { suffix: "taboola.com", category: "advertising" },
  { suffix: "outbrain.com", category: "advertising" },
  { suffix: "quantserve.com", category: "advertising" },
  { suffix: "scorecardresearch.com", category: "measurement" },
  { suffix: "yandex.ru", category: "analytics/advertising" },
  { suffix: "mc.yandex.ru", category: "analytics" },
  { suffix: "vk.com", category: "social" },
  { suffix: "baidu.com", category: "analytics" },
];

export function classifyTracker(host: string): {
  known: boolean;
  category: string | null;
  matchedDomain: string | null;
} {
  const normalized = host.toLowerCase();
  let match: { category: string; suffix: string } | null = null;
  for (const tracker of TRACKER_DOMAINS) {
    if (normalized === tracker.suffix || normalized.endsWith(`.${tracker.suffix}`)) {
      if (!match || tracker.suffix.length > match.suffix.length) {
        match = tracker;
      }
    }
  }
  if (match) {
    return { known: true, category: match.category, matchedDomain: match.suffix };
  }
  return { known: false, category: null, matchedDomain: null };
}

export function isThirdPartyHost(host: string, originHost: string): boolean {
  const left = host.toLowerCase();
  const right = originHost.toLowerCase();
  return left !== right && !left.endsWith(`.${right}`);
}
