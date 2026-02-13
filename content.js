// ────────────────────────────────────────────────
// Early invalidation guard (put this near the top, after any const/let)
function isContextValid() {
    try {
        chrome.runtime.getURL(''); // throws if context dead
        return true;
    } catch (e) {
        if (e.message.includes('Extension context invalidated')) {
            console.log('[Dim Restorer] Old instance stopped');
            // Cleanup
            const oldStyle = document.getElementById('dim-restore');
            if (oldStyle) oldStyle.remove();
            return false;
        }
        return true; // other errors are ok
    }
}

// Global style ref
let styleElement = null;

// Single apply function (promise-based, safe)
function applyDimTheme() {
    if (!isContextValid()) return;

    chrome.storage.local.get(['dimEnabled', 'dimIntensity']).then(data => {
        if (!isContextValid()) return;

        const enabled = data.dimEnabled !== false;
        const intensity = typeof data.dimIntensity === 'number' ? data.dimIntensity : 60;
        const t = intensity / 100;

        if (!enabled) {
            if (styleElement) {
                styleElement.remove();
                styleElement = null;
            }
            return;
        }

        if (styleElement) styleElement.remove();

        styleElement = document.createElement('style');
        styleElement.id = 'dim-restore';

        const mainBg = interpolate('#000000', '#0f1a24', t);
        const cardBg = interpolate('#000000', '#142230', t);

        styleElement.textContent = `
      /* Core page & timeline */
      body, html, main, [role="main"], [data-testid="primaryColumn"],
      [data-testid="cellInnerDiv"], article, [role*="Timeline" i],
      section, footer, header {
        background-color: ${mainBg} !important;
      }

      /* Cards, compose, sidebars, premium/news/live panels */
      [data-testid="tweet"], [data-testid="sidebarColumn"],
      [data-testid^="tweetTextarea"] ~ *, div[aria-label*="What’s happening"],
      div[aria-label*="Subscribe to Premium" i] ~ *,
      div[aria-label*="Today’s News" i] ~ *,
      div[aria-label*="Live on X" i] ~ *,
      [data-testid*="Ad"], [data-testid*="promoted"],
      [data-testid="ocf_ComposeTweetButton"] ~ * {
        background-color: ${cardBg} !important;
      }

      /* Text contrast */
      span, div, p, time, a, [data-testid*="Text"] {
        color: #e7e9ea !important;
      }
      [data-testid="User-Name"] span:not([dir="ltr"]), time, [aria-label*="·"] {
        color: #8899a6 !important;A
      }
    `;

        document.head.appendChild(styleElement);

        console.log(`Dim applied: enabled=${enabled}, intensity=${intensity}%`);
    }).catch(err => {
        if (!isContextValid()) return;
        console.warn("Storage failed (normal during reload):", err.message);
        // Fallback: apply defaults safely
        applyDimThemeFallback(true, 60);
    });
}

// Fallback version (sync, minimal, used only on error)
function applyDimThemeFallback(enabled, intensity) {
    if (!isContextValid()) return;

    const t = intensity / 100;
    const mainBg = interpolate('#000000', '#0f1a24', t);
    const cardBg = interpolate('#000000', '#142230', t);

    if (styleElement) styleElement.remove();

    styleElement = document.createElement('style');
    styleElement.id = 'dim-restore';
    styleElement.textContent = `... same CSS as above using ${mainBg} and ${cardBg} ...`;

    document.head.appendChild(styleElement);
}

// Helper
function interpolate(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    return `#${Math.round(r1 + t * (r2 - r1)).toString(16).padStart(2, '0')}${Math.round(g1 + t * (g2 - g1)).toString(16).padStart(2, '0')}${Math.round(b1 + t * (b2 - b1)).toString(16).padStart(2, '0')}`;
}

// ────────────────────────────────────────────────
// Run once on load
if (isContextValid()) {
    applyDimTheme();

    // Listen for changes
    chrome.storage.onChanged.addListener((changes) => {
        if (isContextValid() && (changes.dimEnabled || changes.dimIntensity)) {
            applyDimTheme();
        }
    });

    // Listen for popup messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!isContextValid()) return true;
        if (msg.action === "refreshDim") {
            applyDimTheme();
        }
        return true;
    });
}