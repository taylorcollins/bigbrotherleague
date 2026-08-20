// Google Analytics (GA4) integration. Loads only in production builds so
// local dev and preview testing don't pollute real analytics data.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const enabled = import.meta.env.PROD && Boolean(GA_ID)

let initialized = false

export function initGA() {
  if (!enabled || initialized) return
  initialized = true

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  gtag("js", new Date())
  // Send page_view manually on route changes instead of the default
  // location-based auto view, since this is a client-side-routed SPA.
  gtag("config", GA_ID, { send_page_view: false })
}

export function trackPageView(path) {
  if (!enabled || !window.gtag) return
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
