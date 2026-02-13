// background.js – minimal service worker (Manifest V3 requirement)
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ dimEnabled: true }); // default enabled
});