# Tebex File Downloader Chrome Extension

A powerful Chrome extension that **automatically downloads all Tebex webstore editor files** with proper file types and extracted code.

## ✨ Key Features

✅ **One-Click Download** - Click the button and all files download automatically  
✅ **Auto-Extract Code** - Pulls actual template code directly from the Tebex editor  
✅ **Correct File Types** - HTML files save as `.html`, TWIG files as `.twig` (not .txt)  
✅ **No Manual Saving** - Files download automatically to Downloads folder  
✅ **Progress Tracking** - See real-time download progress  
✅ **Error Handling** - Know which files succeeded or failed  
✅ **30+ Templates** - Covers all common Tebex webstore files  

## 📦 Files Included

### HTML Templates (16 files)
- category.html
- checkout.html
- cms/page.html
- index.html
- layout.html
- module.communitygoal.html
- module.featuredpackage.html
- module.giftcardbalance.html
- module.goal.html
- module.payments.html
- module.serverstatus.html
- module.textbox.html
- module.topdonator.html
- options.html
- package.html
- username.html

### TWIG Assets (14 files)
- header.twig
- package-media.twig
- tiered-actions.twig
- quote.html
- category/tiered.html
- package-actions.twig
- discount.twig
- head.twig
- constants.twig
- price.twig
- package-entry.twig
- sidebar.twig
- footer.twig
- pagination.twig

## 🚀 Installation

### Step 1: Load the Extension in Chrome
1. Open Chrome and go to **`chrome://extensions/`**
2. Toggle **"Developer mode"** (top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select the **`chrome-extension`** folder
5. ✅ Extension is now installed!

### Step 2: Verify Installation
- Look for the **Tebex Downloader** icon in your Chrome toolbar
- You should see it with a purple icon

## 💡 How to Use

1. **Go to your Tebex Webstore Editor** - Log in to your Tebex store
2. **Click the Extension Icon** - Click the Tebex Downloader button in your toolbar
3. **Click "Download All Files"** - The extension will:
   - Automatically extract code from all templates
   - Download all files with correct types
   - Save them to: `Downloads/tebex-files/`
4. **Done!** - All files are downloaded with proper extensions and content

## 📂 Downloaded File Structure

```
Downloads/
└── tebex-files/
    ├── category.html
    ├── checkout.html
    ├── index.html
    ├── layout.html
    ├── cms/
    │   └── page.html
    ├── module.communitygoal.html
    ├── module.featuredpackage.html
    ├── module.giftcardbalance.html
    ├── module.goal.html
    ├── module.payments.html
    ├── module.serverstatus.html
    ├── module.textbox.html
    ├── module.topdonator.html
    ├── options.html
    ├── package.html
    ├── username.html
    ├── header.twig
    ├── package-media.twig
    ├── tiered-actions.twig
    ├── category/
    │   └── tiered.html
    ├── package-actions.twig
    ├── discount.twig
    ├── head.twig
    ├── constants.twig
    ├── price.twig
    ├── package-entry.twig
    ├── sidebar.twig
    ├── footer.twig
    └── pagination.twig
```

## 🔧 How It Works

1. **Content Script** (`content-script.js`)
   - Runs on Tebex pages automatically
   - Extracts code from Monaco Editor, CodeMirror, or visible code blocks
   - Searches for file content in the page DOM

2. **Popup Interface** (`popup.html` + `popup.js`)
   - Beautiful, modern UI
   - One-click download trigger
   - Real-time progress tracking
   - File list with status indicators

3. **File Handling**
   - Automatically sets correct MIME types:
     - `.html` files → `text/html`
     - `.twig` files → `text/x-twig`
   - Creates proper folder structure
   - Files saved with correct extensions

## 🔐 Permissions

The extension requires minimal permissions:
- **activeTab** - Interact with current tab
- **scripting** - Run extraction scripts on Tebex pages
- **downloads** - Save files to your computer
- **Host access** - Only for `tebex.io` and `buildersoftware.com` domains

## ⚙️ Technical Details

### Content Extraction Strategy

The extension uses a multi-strategy approach to find file content:

1. **Monaco Editor Detection** - Checks for VS Code-like editor instances
2. **CodeMirror Detection** - Checks for code editor instances
3. **Data Attributes** - Looks for `data-filename` or `data-content` attributes
4. **DOM Search** - Scans page for file references and code blocks
5. **Container Detection** - Finds editor containers with code content
6. **Fallback Templates** - Generates template structure if content not found

### File Type Detection

Files are identified by extension:
- `.html` → Treated as HTML markup
- `.twig` → Treated as Twig template language
- Correct MIME type set for each file

## ❓ Troubleshooting

### Files not downloading?
- Check your Downloads folder and `tebex-files` subfolder
- Make sure you allowed the download in Chrome
- The extension will auto-accept download prompts

### Files saved as .txt instead of .html/.twig?
- **This is fixed!** The new version sets correct MIME types
- Old Chrome settings might still save as .txt - try clearing Settings > Reset settings

### Content not extracting?
- Make sure you're on an actual Tebex editor page with template files open
- The extension looks for visible code content on the page
- If not found, it generates template files for you to fill in

### Extension not appearing in toolbar?
- Go to `chrome://extensions/`
- Make sure "Tebex File Downloader" is enabled (toggle switch ON)
- Try refreshing the Tebex page (F5)

## 🔄 Auto-Download Settings

Chrome may ask about auto-downloads. To allow them:
1. Click the info icon next to the URL bar
2. Go to "Site settings" for tebex.io
3. Under "Additional permissions", set "Downloads" to "Allow"
4. Refresh the page

## 📝 What's New (v1.0)

- ✨ Auto-download all files at once (no save dialogs)
- 🎯 Smart content extraction from Tebex editor
- 📄 Correct file types (.html, .twig, not .txt)
- 🚀 Faster batch downloads
- 🎨 Beautiful modern UI with progress tracking
- 📦 Proper folder structure preservation

## 🐛 Known Issues & Limitations

- If Tebex editor uses non-standard code editors, fallback templates are used
- Some advanced template features may need manual adjustment
- File content must be visible/open in the editor to be extracted

## 💬 Support

For issues:
1. Check the console: Right-click → Inspect → Console tab
2. Make sure you're on a Tebex editor page with templates visible
3. Try the "Clear" button and download again

## 📄 License

Free to use for personal use with Tebex stores.

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Made for Tebex**: Download your webstore templates easily! 🚀

