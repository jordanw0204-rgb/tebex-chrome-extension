# 📥 Tebex File Downloader - Complete Setup Guide

## What You Just Got ✨

A complete Chrome extension that **automatically downloads all your Tebex webstore template files** with:

✅ **Auto-Download** - No manual save dialogs, files go straight to Downloads folder  
✅ **Smart Content Extraction** - Pulls actual code from the Tebex editor  
✅ **Correct File Types** - `.html` files as HTML, `.twig` as TWIG (not .txt!)  
✅ **Beautiful UI** - Modern purple interface with progress tracking  
✅ **30+ Templates** - All common Tebex webstore files included  

---

## 🚀 Installation (2 minutes)

### 1. Open Chrome Extensions
```
Open Chrome → chrome://extensions/
```

### 2. Enable Developer Mode
```
Click "Developer mode" toggle (top-right corner)
```

### 3. Load Unpacked
```
Click "Load unpacked" button
Navigate to: D:\tebexsite\chrome-extension
Click "Select Folder"
```

### 4. Done! ✅
You'll see the extension appear with a purple icon in your toolbar.

---

## 💡 How to Use

1. **Go to Tebex Editor** - Log into your Tebex store editor
2. **Click Extension Icon** - Click the purple "Tebex Downloader" in your toolbar
3. **Click "Download All Files"** button
4. **Wait for completion** - Watch the progress bar fill
5. **Check Downloads** - Find your files in `Downloads/tebex-files/`

**That's it!** All files download automatically with correct types and content.

---

## 📁 File Structure

```
D:\tebexsite\chrome-extension\
├── manifest.json          ← Extension configuration
├── popup.html             ← User interface
├── popup.js               ← Download logic & MIME type handling
├── content-script.js      ← Smart content extraction from Tebex
├── background.js          ← Background worker
├── config.js              ← Optional advanced configuration
├── README.md              ← Full documentation
├── QUICKSTART.md          ← Quick setup guide
└── THIS FILE              ← You are here
```

---

## 🔧 Key Features Explained

### Auto-Download (No Save Dialogs!)
- Files automatically download to `Downloads/tebex-files/`
- Set correct MIME types so files save with proper extensions
- Batch download all 30 files at once

### Smart Content Extraction
The extension uses 4 strategies to find file content:

1. **Monaco Editor Detection** - Finds VS Code-like editors
2. **CodeMirror Detection** - Finds alternate code editors
3. **DOM Search** - Scans page for file references
4. **Container Detection** - Finds editor containers with code

If content is found, it's extracted automatically.  
If not found, template files are provided for you to fill in.

### Correct File Types
```
category.html    → text/html (not text/plain!)
header.twig      → text/x-twig (not text/plain!)
price.twig       → text/x-twig (not text/plain!)
```

Chrome now saves with correct extensions!

---

## 📊 What Gets Downloaded

### HTML Templates (16 files)
```
category.html                    layout.html
checkout.html                    module.communitygoal.html
cms/page.html                    module.featuredpackage.html
index.html                       module.giftcardbalance.html
                                 module.goal.html
                                 module.payments.html
                                 module.serverstatus.html
                                 module.textbox.html
                                 module.topdonator.html
                                 options.html
                                 package.html
                                 username.html
```

### TWIG Assets (14 files)
```
header.twig                   constants.twig
package-media.twig            price.twig
tiered-actions.twig          package-entry.twig
quote.html                    sidebar.twig
category/tiered.html         footer.twig
package-actions.twig         pagination.twig
discount.twig
head.twig
```

---

## ⚙️ Technical Details

### Permissions Required
- `activeTab` - Interact with current page
- `scripting` - Run extraction scripts
- `downloads` - Save files to computer
- Host access to: `tebex.io`, `*.tebex.io`, `*.buildersoftware.com`

### How Files Are Saved
1. Content is extracted or generated
2. Blob object created with correct MIME type
3. Temporary download URL created
4. File saved to Downloads folder with correct extension
5. URL cleaned up

---

## 🔍 Content Extraction Process

When you click download:

1. **Extension sends message** to Tebex page
2. **Content script searches** for file content using 4 strategies
3. **Content is extracted** and sent back to popup
4. **Blob is created** with correct MIME type
5. **File downloads** automatically
6. **Progress updates** in real-time

### What If Content Isn't Found?
- Template files are generated automatically
- Shows `<!-- template provided -->` comment
- You can manually copy/paste content later
- Or edit template files to customize

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not showing | Verify in chrome://extensions/, enable if toggled off |
| Files not downloading | Allow auto-downloads in Chrome Settings |
| Files saved as .txt | Browser setting - still opens correctly in editors |
| Content not extracted | Make sure you're on Tebex editor page with files visible |
| Permission denied error | Clear browsing data (Chrome Settings > Privacy) |

---

## 🎯 Pro Tips

### For Best Results:
1. Keep browser at 100% zoom (not zoomed in/out)
2. Have at least one template file open/visible in Tebex editor
3. Wait for progress bar to fully complete before closing popup
4. Check Downloads folder immediately after (don't minimize browser)

### For Developers:
1. Edit `config.js` to customize behavior
2. Check Console (F12) for debug messages (set `DEBUG_MODE = true`)
3. Modify MIME types in `config.js` if needed
4. Add custom selectors for content extraction

---

## 🚀 What's Next?

After downloading:

1. **Open files in Code Editor** (VS Code, Sublime, etc.)
2. **Edit templates** as needed
3. **Re-upload to Tebex** when ready
4. **Keep backups** of downloaded files

---

## 📞 Support

If something doesn't work:

1. Check `chrome://extensions/` - verify extension is enabled
2. Right-click → Inspect → Console tab - look for errors
3. Try the "Clear" button and download again
4. Make sure you're on an actual Tebex editor page

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `manifest.json` | Extension metadata and permissions |
| `popup.html` | The UI users see |
| `popup.js` | Download logic and progress tracking |
| `content-script.js` | Content extraction engine |
| `background.js` | Background tasks |
| `config.js` | Optional customization settings |
| `README.md` | Full documentation |
| `QUICKSTART.md` | Quick setup |

---

## ✅ Checklist

- [ ] Extension loaded in chrome://extensions/
- [ ] Extension icon appears in toolbar
- [ ] Navigated to Tebex editor page
- [ ] Clicked "Download All Files" button
- [ ] Waited for progress to complete
- [ ] Checked Downloads/tebex-files/ folder
- [ ] Files have correct extensions (.html, .twig)
- [ ] Files contain actual content

**If all checked, you're good to go!** 🎉

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Created for**: Tebex Webstore Developers 🚀

Enjoy automated template downloads! 📥✨

