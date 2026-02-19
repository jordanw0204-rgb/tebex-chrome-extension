// Background service worker for the extension
console.log('Tebex File Downloader background script loaded');

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

// Listen for download events
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log('File download completed:', delta.id);
  }
});

