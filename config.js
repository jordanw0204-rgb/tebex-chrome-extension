// ADVANCED CONFIGURATION - Tebex File Downloader
//
// Use this file to customize the extension behavior
// (Optional - extension works fine with defaults)

// CUSTOM FILE LISTS
// If Tebex adds new templates, add them here:

const ADDITIONAL_HTML_FILES = [
  // Example:
  // 'custom-page.html',
  // 'special-checkout.html',
];

const ADDITIONAL_TWIG_FILES = [
  // Example:
  // 'custom-header.twig',
  // 'special-footer.twig',
];

// DOWNLOAD FOLDER NAMING
// Change this if you want a different folder name:
const DOWNLOAD_FOLDER_NAME = 'tebex-files'; // default: 'tebex-files'

// MIME TYPES
// Map file extensions to their MIME types:
const MIME_TYPES = {
  'html': 'text/html',
  'twig': 'text/x-twig',
  'js': 'text/javascript',
  'css': 'text/css',
  'json': 'application/json',
  'xml': 'text/xml'
};

// EXTRACTION STRATEGIES
// The extension tries these strategies in order to find content:

const EXTRACTION_STRATEGIES = [
  'extractFromEditors',      // Look for Monaco Editor or CodeMirror
  'extractFromDataAttributes', // Look for data-* attributes
  'extractFromSearch',       // Search page for filename references
  'extractFromContainers'    // Look in editor containers
];

// DEBUG MODE
// Set to true to see console logs during extraction:
const DEBUG_MODE = false; // Change to true for debugging

// AUTO-DOWNLOAD DELAY (milliseconds)
// How long to wait between downloads (to prevent overwhelming system):
const DOWNLOAD_DELAY = 50; // milliseconds (default: 50)

// PROGRESS UPDATE INTERVAL
// How often the progress bar updates:
const PROGRESS_UPDATE_INTERVAL = 100; // milliseconds (default: 100)

// TIMEOUT FOR EXTRACTION
// How long to wait for content extraction before using fallback:
const EXTRACTION_TIMEOUT = 5000; // milliseconds (default: 5000)

// ENABLE BATCH ZIP DOWNLOAD
// (Future feature) Download all files as ZIP instead of individual:
const ENABLE_ZIP_DOWNLOAD = false; // Coming soon!

// CUSTOM HEADERS FOR EXTRACTED CONTENT
// Add headers/comments to extracted files:
const ADD_CUSTOM_HEADER = false; // Set to true to add headers
const CUSTOM_HEADER = (filename) => `<!-- Extracted from Tebex Editor: ${filename} -->\n`;

// DOM SELECTORS FOR CONTENT EXTRACTION
// Additional CSS selectors to search for file content:
const CONTENT_SELECTORS = [
  '.editor-content',
  '.code-editor',
  '[data-editor]',
  '.template-editor',
  '[role="tabpanel"]'
];

// IGNORED ELEMENTS
// Skip these elements when searching for content:
const IGNORED_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT'];

// ==========================================
// DO NOT EDIT BELOW THIS LINE
// ==========================================
// The extension will use these settings when available.
// Keep this file in the same folder as the extension files.

