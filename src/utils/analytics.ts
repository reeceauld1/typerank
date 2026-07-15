declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = 'G-KDN9KFDF70';

let loaded = false;

// Only called once the visitor has accepted the cookie consent banner (see
// CookieConsentBanner.tsx) — never injected unconditionally in index.html,
// so Google Analytics never runs before consent is given.
export function loadGoogleAnalytics(): void {
  if (loaded) return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
