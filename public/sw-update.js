// Service Worker Update Handler — detects new SW version and prompts user to refresh
// Injected via layout.tsx

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Wait for page to fully load before checking SW
  window.addEventListener('load', () => {
    let refreshing = false

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return

      // Check for updates every time the page loads
      registration.update().catch(() => {})

      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          // New SW installed and waiting — show update prompt
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              refreshing = true
              window.location.reload()
            })
          }
        })
      })
    })

    // If SW controller changes (skipWaiting triggered), reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) window.location.reload()
    })
  })
}

function showUpdateBanner(onRefresh) {
  // Don't show multiple banners
  if (document.getElementById('sw-update-banner')) return

  const banner = document.createElement('div')
  banner.id = 'sw-update-banner'
  banner.style.cssText = `
    position: fixed; bottom: 72px; left: 50%; transform: translateX(-50%); z-index: 9999;
    background: #1a1a1a; border: 1px solid #f59e0b; border-radius: 12px;
    padding: 12px 20px; display: flex; align-items: center; gap: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5); font-family: system-ui, sans-serif;
    max-width: 90vw; animation: swSlideUp 0.3s ease-out;
  `
  banner.innerHTML = `
    <style>
      @keyframes swSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    </style>
    <span style="color:#e5e5e5; font-size:13px; white-space:nowrap;">🔄 Update tersedia</span>
    <button id="sw-refresh-btn" style="
      background: #f59e0b; color: #0a0a0a; border: none; border-radius: 8px;
      padding: 6px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
      white-space: nowrap;
    ">Refresh</button>
  `
  document.body.appendChild(banner)

  document.getElementById('sw-refresh-btn')?.addEventListener('click', () => {
    banner.remove()
    onRefresh()
  })
}
