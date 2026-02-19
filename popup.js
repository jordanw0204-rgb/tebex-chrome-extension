const DEFAULT_TEBEX_FILES = [
  "category.html",
  "checkout.html",
  "cms/page.html",
  "index.html",
  "layout.html",
  "module.communitygoal.html",
  "module.featuredpackage.html",
  "module.giftcardbalance.html",
  "module.goal.html",
  "module.payments.html",
  "module.serverstatus.html",
  "module.textbox.html",
  "module.topdonator.html",
  "options.html",
  "package.html",
  "username.html",
  "header.twig",
  "package-media.twig",
  "tiered-actions.twig",
  "quote.html",
  "category/tiered.html",
  "package-actions.twig",
  "discount.twig",
  "head.twig",
  "constants.twig",
  "price.twig",
  "package-entry.twig",
  "sidebar.twig",
  "footer.twig",
  "pagination.twig",
  "main.js",
  "swiper-element-bundle.min.js",
  "styles.css"
];

const SUPPORTED_FILE_EXTENSIONS = ["html", "twig", "js", "css"];
const SUPPORTED_FILE_PATTERN = new RegExp(
  `\\.(${SUPPORTED_FILE_EXTENSIONS.join("|")})$`,
  "i"
);

const downloadBtn = document.getElementById("downloadBtn");
const uploadBtn = document.getElementById("uploadBtn");
const clearBtn = document.getElementById("clearBtn");
const zipInput = document.getElementById("zipInput");
const statusDiv = document.getElementById("status");
const fileListDiv = document.getElementById("fileList");
const progressFill = document.getElementById("progressFill");

downloadBtn.addEventListener("click", () => {
  void exportAsZip();
});
uploadBtn.addEventListener("click", () => {
  zipInput.value = "";
  zipInput.click();
});
zipInput.addEventListener("change", () => {
  const file = zipInput.files && zipInput.files[0] ? zipInput.files[0] : null;
  if (file) {
    void importFromZip(file);
  }
});
clearBtn.addEventListener("click", clearResults);

function setStatus(text) {
  statusDiv.textContent = text;
}

function setProgress(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  progressFill.style.width = `${clamped}%`;
}

function addFileLine(text, isError = false) {
  const item = document.createElement("div");
  item.className = `file-item${isError ? " error" : ""}`;
  item.textContent = text;
  fileListDiv.appendChild(item);
}

function clearResults() {
  fileListDiv.innerHTML = "";
  setProgress(0);
  setStatus("Ready to export or import Tebex files.");
}

function setControlsDisabled(disabled) {
  downloadBtn.disabled = disabled;
  uploadBtn.disabled = disabled;
  clearBtn.disabled = disabled;
}

function normalizePath(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function isSupportedFilePath(path) {
  return SUPPORTED_FILE_PATTERN.test(String(path || ""));
}

function buildZipFileName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `tebex-templates-${yyyy}-${mm}-${dd}.zip`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    throw new Error("No active tab found.");
  }
  return tabs[0];
}

async function extractFromPage(tabId) {
  async function runExtraction(allFrames) {
    const injection = await chrome.scripting.executeScript({
      target: { tabId, allFrames },
      world: "MAIN",
      func: extractTebexFilesInPage,
      args: [DEFAULT_TEBEX_FILES]
    });

    if (!Array.isArray(injection) || injection.length === 0) {
      throw new Error("Failed to read extraction result from the Tebex page.");
    }

    const combinedFiles = Object.create(null);
    const combinedSources = Object.create(null);
    const detectedNames = new Set();
    const missingNames = new Set();
    const combinedErrors = Object.create(null);
    const frameErrors = [];
    let supportedFrameFound = false;
    let pageUrl = "";

    for (const frameResult of injection) {
      if (frameResult && frameResult.error) {
        frameErrors.push(String(frameResult.error));
        continue;
      }
      const result = frameResult ? frameResult.result : null;
      if (!result || typeof result !== "object") {
        continue;
      }
      if (!result.isSupportedPage) {
        continue;
      }

      supportedFrameFound = true;
      if (!pageUrl && result.pageUrl) {
        pageUrl = result.pageUrl;
      }

      const files = result.files || {};
      const sources = result.sources || {};
      const errors = result.errors || {};
      for (const [name, content] of Object.entries(files)) {
        const normalizedName = normalizePath(name);
        const nextContent = String(content || "");
        const currentContent = combinedFiles[normalizedName] || "";
        if (nextContent.length > currentContent.length) {
          combinedFiles[normalizedName] = nextContent;
          combinedSources[normalizedName] = sources[name] || sources[normalizedName] || "frame";
        }
        detectedNames.add(normalizedName);
      }

      for (const [name, reason] of Object.entries(errors)) {
        const normalizedName = normalizePath(name);
        if (!combinedErrors[normalizedName]) {
          combinedErrors[normalizedName] = String(reason || "");
        }
      }

      const missingFiles = result.missingFiles || [];
      for (const missingFile of missingFiles) {
        missingNames.add(normalizePath(missingFile));
        detectedNames.add(normalizePath(missingFile));
      }
    }

    if (!supportedFrameFound) {
      if (frameErrors.length > 0) {
        return {
          isSupportedPage: false,
          errorMessage: `Extraction script error: ${frameErrors[0]}`,
          files: {},
          sources: {},
          errors: {},
          detectedFileCount: 0,
          missingFiles: []
        };
      }
      return {
        isSupportedPage: false,
        errorMessage: "This page is not a supported Tebex editor domain.",
        files: {},
        sources: {},
        errors: {},
        detectedFileCount: 0,
        missingFiles: []
      };
    }

    const finalMissing = Array.from(missingNames).filter((name) => !combinedFiles[name]);

    return {
      isSupportedPage: true,
      pageUrl,
      files: combinedFiles,
      sources: combinedSources,
      errors: combinedErrors,
      detectedFileCount: detectedNames.size,
      extractedFileCount: Object.keys(combinedFiles).length,
      missingFiles: finalMissing
    };
  }

  const topFrameResult = await runExtraction(false);
  if (!topFrameResult.isSupportedPage) {
    return topFrameResult;
  }

  if (Object.keys(topFrameResult.files || {}).length > 0) {
    return topFrameResult;
  }

  try {
    const allFramesResult = await runExtraction(true);
    if (Object.keys(allFramesResult.files || {}).length > 0) {
      return allFramesResult;
    }
  } catch (_error) {
    // If all-frame extraction fails due cross-origin frames, keep top-frame result.
  }

  return topFrameResult;
}

async function buildZipBlob(files, metadata) {
  if (typeof JSZip === "undefined") {
    throw new Error("ZIP library failed to load.");
  }

  const zip = new JSZip();
  const sortedNames = Object.keys(files).sort((a, b) => a.localeCompare(b));

  for (const filename of sortedNames) {
    const normalizedName = normalizePath(filename);
    const content = String(files[filename] || "").replace(/\r\n?/g, "\n");
    zip.file(normalizedName, content);
  }

  zip.file(
    "_tebex_export_report.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        extractedFileCount: sortedNames.length,
        detectedFileCount: metadata.detectedFileCount || sortedNames.length,
        missingFiles: metadata.missingFiles || [],
        sourcePage: metadata.pageUrl || ""
      },
      null,
      2
    )
  );

  return zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    },
    (progressMeta) => {
      const zipPercent = Number(progressMeta.percent || 0);
      setProgress(60 + zipPercent * 0.4);
    }
  );
}

function renderExtractionSummary(result) {
  fileListDiv.innerHTML = "";

  const extractedNames = Object.keys(result.files || {}).sort((a, b) => a.localeCompare(b));
  const missingNames = (result.missingFiles || []).slice().sort((a, b) => a.localeCompare(b));
  const sources = result.sources || {};
  const errors = result.errors || {};

  addFileLine(
    `Extracted ${extractedNames.length} file(s), detected ${result.detectedFileCount || extractedNames.length}.`
  );

  for (const name of extractedNames) {
    const source = sources[name] ? ` [${sources[name]}]` : "";
    addFileLine(`OK ${name}${source}`);
  }

  if (missingNames.length > 0) {
    addFileLine(`Missing ${missingNames.length} file(s):`, true);
    for (const name of missingNames) {
      const reason = errors[name] ? ` - ${errors[name]}` : "";
      addFileLine(`MISS ${name}${reason}`, true);
    }
  }
}

async function exportAsZip() {
  setControlsDisabled(true);
  fileListDiv.innerHTML = "";

  try {
    setProgress(5);
    setStatus("Checking active tab...");
    const tab = await getActiveTab();

    setProgress(15);
    setStatus("Extracting code from Tebex editor...");
    const extraction = await extractFromPage(tab.id);

    if (!extraction.isSupportedPage) {
      throw new Error(
        extraction.errorMessage || "Open a Tebex editor page before exporting."
      );
    }

    const files = extraction.files || {};
    const extractedCount = Object.keys(files).length;

    renderExtractionSummary(extraction);

    if (extractedCount === 0) {
      throw new Error(
        "No file content was extracted. Open the Tebex editor, make files visible, and try again."
      );
    }

    setProgress(55);
    setStatus(`Creating ZIP from ${extractedCount} extracted file(s)...`);
    const zipBlob = await buildZipBlob(files, extraction);

    const zipName = buildZipFileName();
    const zipUrl = URL.createObjectURL(zipBlob);

    setProgress(98);
    setStatus("Downloading ZIP...");
    await chrome.downloads.download({
      url: zipUrl,
      filename: zipName,
      saveAs: false,
      conflictAction: "uniquify"
    });

    window.setTimeout(() => {
      URL.revokeObjectURL(zipUrl);
    }, 60000);

    setProgress(100);
    setStatus(
      `Done. Downloaded ${zipName} with ${extractedCount} extracted file(s).`
    );
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    setStatus(`Export failed: ${message}`);
    addFileLine(`Error: ${message}`, true);
    setProgress(0);
  } finally {
    setControlsDisabled(false);
  }
}

function isImportExportFilePath(path) {
  return isSupportedFilePath(path);
}

function stripSharedRootFolder(filesByPath) {
  const names = Object.keys(filesByPath);
  if (names.length === 0) {
    return filesByPath;
  }

  const rootSegments = names.map((name) => name.split("/")[0]).filter(Boolean);
  const uniqueRoots = Array.from(new Set(rootSegments));
  if (uniqueRoots.length !== 1) {
    return filesByPath;
  }

  const root = uniqueRoots[0];
  if (!root || isImportExportFilePath(root)) {
    return filesByPath;
  }

  if (!names.every((name) => name.startsWith(`${root}/`))) {
    return filesByPath;
  }

  const stripped = {};
  for (const [name, content] of Object.entries(filesByPath)) {
    stripped[name.slice(root.length + 1)] = content;
  }
  return stripped;
}

async function readTemplateFilesFromZip(zipFile) {
  if (typeof JSZip === "undefined") {
    throw new Error("ZIP library failed to load.");
  }

  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const fileEntries = entries.filter((entry) => {
    const name = normalizePath(entry.name);
    return (
      !!name &&
      !name.startsWith("__MACOSX/") &&
      name !== "_tebex_export_report.json" &&
      isImportExportFilePath(name)
    );
  });

  if (fileEntries.length === 0) {
    throw new Error("No .html/.twig/.js/.css files found in ZIP.");
  }

  const filesByPath = {};
  let index = 0;
  for (const entry of fileEntries) {
    index += 1;
    const progress = 10 + (index / fileEntries.length) * 25;
    setProgress(progress);
    setStatus(`Reading ZIP entries (${index}/${fileEntries.length})...`);

    const rawName = normalizePath(entry.name);
    const content = await entry.async("string");
    filesByPath[rawName] = String(content || "").replace(/\r\n?/g, "\n");
  }

  return stripSharedRootFolder(filesByPath);
}

function renderUploadSummary(result) {
  fileListDiv.innerHTML = "";

  const uploaded = Array.isArray(result.uploadedFiles) ? result.uploadedFiles : [];
  const failed = Array.isArray(result.failedFiles) ? result.failedFiles : [];
  const blockedSwitchPrompts = Number(result.blockedSwitchPrompts || 0);

  addFileLine(
    `Uploaded ${uploaded.length}/${result.totalRequested || uploaded.length} file(s). Matched ${result.matchedCount || 0}.`
  );

  if (blockedSwitchPrompts > 0) {
    addFileLine(
      `Warn: blocked ${blockedSwitchPrompts} unsaved-change switch prompt(s) and retried save.`,
      true
    );
  }

  for (const item of uploaded) {
    const method = item && item.method ? ` [${item.method}]` : "";
    const saveMethod = item && item.saveMethod ? ` [save:${item.saveMethod}]` : "";
    addFileLine(`OK ${item.file}${method}${saveMethod}`);
  }

  if (failed.length > 0) {
    addFileLine(`Failed ${failed.length} file(s):`, true);
    for (const item of failed) {
      addFileLine(`MISS ${item.file} - ${item.reason}`, true);
    }
  }
}

async function applyZipFilesToPage(tabId, filesByPath) {
  function withTimeout(promise, timeoutMs, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      })
    ]);
  }

  async function runApply(allFrames) {
    const injection = await withTimeout(
      chrome.scripting.executeScript({
        target: { tabId, allFrames },
        world: "MAIN",
        func: applyTemplatesInPage,
        args: [filesByPath]
      }),
      90000,
      "Upload script"
    );

    if (!Array.isArray(injection) || injection.length === 0) {
      throw new Error("Failed to run uploader script in the active tab.");
    }

    const supportedResults = [];
    const frameErrors = [];
    for (const frameResult of injection) {
      if (frameResult && frameResult.error) {
        frameErrors.push(String(frameResult.error));
        continue;
      }
      const result = frameResult ? frameResult.result : null;
      if (result && result.isSupportedPage) {
        supportedResults.push(result);
      }
    }

    if (supportedResults.length === 0) {
      if (frameErrors.length > 0) {
        return {
          isSupportedPage: false,
          errorMessage: `Upload script error: ${frameErrors[0]}`,
          totalRequested: Object.keys(filesByPath).length,
          matchedCount: 0,
          uploadedFiles: [],
          failedFiles: []
        };
      }
      return {
        isSupportedPage: false,
        errorMessage: "This page is not a supported Tebex editor domain.",
        totalRequested: Object.keys(filesByPath).length,
        matchedCount: 0,
        uploadedFiles: [],
        failedFiles: []
      };
    }

    supportedResults.sort((a, b) => {
      const uploadedA = Number(a.uploadedCount || 0);
      const uploadedB = Number(b.uploadedCount || 0);
      if (uploadedA !== uploadedB) {
        return uploadedB - uploadedA;
      }
      return Number(b.matchedCount || 0) - Number(a.matchedCount || 0);
    });

    return supportedResults[0];
  }

  const topFrameResult = await runApply(false);
  if (!topFrameResult.isSupportedPage) {
    return topFrameResult;
  }

  if (Number(topFrameResult.uploadedCount || 0) > 0) {
    return topFrameResult;
  }

  try {
    const allFramesResult = await runApply(true);
    if (Number(allFramesResult.uploadedCount || 0) > 0) {
      return allFramesResult;
    }
  } catch (_error) {
    // Keep top-frame result if all-frame execution fails.
  }

  return topFrameResult;
}

async function importFromZip(zipFile) {
  setControlsDisabled(true);
  fileListDiv.innerHTML = "";

  try {
    setProgress(5);
    setStatus("Checking active tab...");
    const tab = await getActiveTab();

    setProgress(8);
    setStatus(`Loading ZIP: ${zipFile.name}`);
    const filesByPath = await readTemplateFilesFromZip(zipFile);

    const sortedFiles = Object.keys(filesByPath)
      .map((name) => normalizePath(name))
      .filter((name) => isImportExportFilePath(name))
      .sort((a, b) => a.localeCompare(b));

    if (sortedFiles.length === 0) {
      throw new Error("ZIP does not contain importable .html/.twig/.js/.css files.");
    }

    const cleanedFiles = {};
    for (const fileName of sortedFiles) {
      cleanedFiles[fileName] = filesByPath[fileName];
    }

    setProgress(40);
    setStatus(`Uploading ${sortedFiles.length} file(s) to Tebex editor...`);
    const uploadResult = await applyZipFilesToPage(tab.id, cleanedFiles);

    if (!uploadResult.isSupportedPage) {
      throw new Error(uploadResult.errorMessage || "Open a Tebex editor page before uploading.");
    }

    renderUploadSummary(uploadResult);

    const uploadedCount = Number(uploadResult.uploadedCount || 0);
    if (uploadedCount === 0) {
      throw new Error(
        "No files were uploaded. Keep the Tebex template/file tree visible, then try again."
      );
    }

    setProgress(100);
    const blockedPrompts = Number(uploadResult.blockedSwitchPrompts || 0);
    if (blockedPrompts > 0) {
      setStatus(
        `Done. Uploaded ${uploadedCount}/${sortedFiles.length} file(s). Blocked ${blockedPrompts} unsaved switch prompt(s).`
      );
    } else {
      setStatus(
        `Done. Uploaded ${uploadedCount}/${sortedFiles.length} file(s) from ZIP.`
      );
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    setStatus(`Upload failed: ${message}`);
    addFileLine(`Error: ${message}`, true);
    setProgress(0);
  } finally {
    setControlsDisabled(false);
  }
}

async function extractTebexFilesInPage(defaultFiles) {
  const FILE_REGEX = /([A-Za-z0-9_./-]+\.(?:html|twig|js|css))/gi;
  const MAX_SCAN_ELEMENTS = 15000;

  function normalizeFileName(value) {
    return String(value || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/{2,}/g, "/")
      .trim();
  }

  function isTemplatePath(path) {
    return /\.(html|twig|js|css)$/i.test(path);
  }

  function isLikelyEditorFilePath(path) {
    const normalized = normalizeFileName(path).split(/[?#]/)[0];
    if (!normalized) {
      return false;
    }
    if (/^(?:https?:|chrome:|file:|data:|blob:)/i.test(normalized)) {
      return false;
    }
    if (normalized.includes("://") || normalized.includes("//")) {
      return false;
    }
    const firstSegment = normalized.split("/")[0] || "";
    if (normalized.includes("/") && firstSegment.includes(".") && !isTemplatePath(firstSegment)) {
      return false;
    }
    return true;
  }

  function getBaseName(path) {
    const normalized = normalizeFileName(path);
    const segments = normalized.split("/");
    return segments[segments.length - 1] || normalized;
  }

  function getParentDir(path) {
    const normalized = normalizeFileName(path).toLowerCase();
    const segments = normalized.split("/");
    if (segments.length <= 1) {
      return "";
    }
    return segments.slice(0, -1).join("/");
  }

  function strictPathMatch(targetPath, candidatePath) {
    const target = normalizeFileName(targetPath).toLowerCase();
    const candidate = normalizeFileName(candidatePath).toLowerCase();
    if (!target || !candidate) {
      return false;
    }
    if (target === candidate) {
      return true;
    }
    return candidate.endsWith("/" + target);
  }

  function isSameFileName(a, b) {
    const left = normalizeFileName(a).toLowerCase();
    const right = normalizeFileName(b).toLowerCase();
    if (!left || !right) {
      return false;
    }
    if (left === right) {
      return true;
    }
    if (left.endsWith("/" + right) || right.endsWith("/" + left)) {
      return true;
    }
    return getBaseName(left) === getBaseName(right);
  }

  function findFileNames(raw) {
    if (!raw) {
      return [];
    }

    const text = String(raw);
    const matches = new Set();
    let match = null;

    while ((match = FILE_REGEX.exec(text)) !== null) {
      const cleaned = normalizeFileName(match[1]).replace(/[\'\"`),;:]+$/, "");
      if (isTemplatePath(cleaned) && isLikelyEditorFilePath(cleaned)) {
        matches.add(cleaned);
      }
    }

    FILE_REGEX.lastIndex = 0;
    return Array.from(matches);
  }

  function namesFromElement(element) {
    if (!element) {
      return [];
    }

    return findFileNames(
      [
        element.getAttribute("data-filename"),
        element.getAttribute("data-file"),
        element.getAttribute("data-path"),
        element.getAttribute("data-name"),
        element.getAttribute("title"),
        element.getAttribute("aria-label"),
        element.textContent
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function isVisible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (!style || style.visibility === "hidden" || style.display === "none") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isProbablyClickable(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    const role = String(element.getAttribute("role") || "").toLowerCase();
    const tag = element.tagName.toLowerCase();
    if (tag === "button" || tag === "a") {
      return true;
    }
    if (role === "tab" || role === "treeitem" || role === "menuitem" || role === "option") {
      return true;
    }
    if (typeof element.onclick === "function") {
      return true;
    }
    return element.tabIndex >= 0;
  }

  function hasFileNodeHints(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    if (
      element.hasAttribute("data-filename") ||
      element.hasAttribute("data-file") ||
      element.hasAttribute("data-path") ||
      element.hasAttribute("data-name")
    ) {
      return true;
    }

    const role = String(element.getAttribute("role") || "").toLowerCase();
    if (role === "tab" || role === "treeitem" || role === "option") {
      return true;
    }

    const classHint = String(element.className || "").toLowerCase();
    if (/file|template|editor|tree|sidebar|list-item/.test(classHint)) {
      return true;
    }

    return false;
  }

  async function wait(ms) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function fireClick(element) {
    element.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    element.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  }

  function getActiveFileName() {
    const activeSelectors = [
      '[role="tab"][aria-selected="true"]',
      '[role="treeitem"][aria-selected="true"]',
      '[aria-current="true"]',
      '.active',
      '.is-active',
      '.selected'
    ];

    for (const selector of activeSelectors) {
      const node = document.querySelector(selector);
      if (!node) {
        continue;
      }
      const names = namesFromElement(node);
      if (names.length > 0) {
        return names[0];
      }
    }

    return null;
  }

  function contentLooksReasonable(content, fileName) {
    if (typeof content !== "string") {
      return false;
    }

    const raw = content.replace(/\r\n?/g, "\n");
    const trimmed = raw.trim();
    if (!trimmed) {
      return false;
    }
    if (trimmed.length <= 2) {
      return true;
    }

    const normalized = normalizeFileName(fileName).toLowerCase();

    if (normalized.endsWith(".html") || normalized.endsWith(".twig")) {
      if (/[<>]/.test(trimmed) || /\{\{|\{%|\{#/.test(trimmed)) {
        return true;
      }
      return trimmed.length > 40;
    }

    if (normalized.endsWith(".js")) {
      if (/\b(function|const|let|var|import|export|class|return|=>)\b/.test(trimmed)) {
        return true;
      }
      if (/[=;(){}]/.test(trimmed) && /[A-Za-z_$]/.test(trimmed)) {
        return true;
      }
      return trimmed.length > 60;
    }

    if (normalized.endsWith(".css")) {
      if (/@media|@keyframes|:root|--[a-z0-9_-]+/i.test(trimmed)) {
        return true;
      }
      if (/[{}:;]/.test(trimmed) && /[.#a-zA-Z0-9_-]/.test(trimmed)) {
        return true;
      }
      return trimmed.length > 30;
    }

    return trimmed.length > 10;
  }

  function pickMonacoEditor() {
    if (!window.monaco || !window.monaco.editor || typeof window.monaco.editor.getEditors !== "function") {
      return null;
    }

    const editors = window.monaco.editor.getEditors() || [];
    if (editors.length === 0) {
      return null;
    }

    const scored = editors.map((editor) => {
      let score = 0;
      try {
        if (typeof editor.hasTextFocus === "function" && editor.hasTextFocus()) {
          score += 10;
        }
      } catch (_error) {
        // Ignore editor focus errors.
      }
      try {
        const node = typeof editor.getDomNode === "function" ? editor.getDomNode() : null;
        if (node && isVisible(node)) {
          score += 8;
        }
      } catch (_error) {
        // Ignore editor visibility errors.
      }
      return { editor, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].editor || null;
  }

  function pickCodeMirrorInstance() {
    const wrappers = Array.from(document.querySelectorAll(".CodeMirror"));
    if (wrappers.length === 0) {
      return null;
    }

    const scored = wrappers
      .map((wrapper) => {
        const instance = wrapper.CodeMirror;
        if (!instance || typeof instance.getValue !== "function") {
          return null;
        }
        let score = isVisible(wrapper) ? 6 : 0;
        if (wrapper.classList.contains("CodeMirror-focused") || wrapper.contains(document.activeElement)) {
          score += 8;
        }
        return { instance, score };
      })
      .filter(Boolean);

    if (scored.length === 0) {
      return null;
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0].instance || null;
  }

  function pickAceEditor() {
    if (!window.ace || typeof window.ace.edit !== "function") {
      return null;
    }

    const nodes = Array.from(document.querySelectorAll(".ace_editor"));
    if (nodes.length === 0) {
      return null;
    }

    const scored = [];
    for (const node of nodes) {
      try {
        const editor = window.ace.edit(node);
        if (!editor || typeof editor.getValue !== "function") {
          continue;
        }
        let score = isVisible(node) ? 6 : 0;
        if (node.contains(document.activeElement)) {
          score += 8;
        }
        scored.push({ editor, score });
      } catch (_error) {
        // Ignore bad ACE nodes.
      }
    }

    if (scored.length === 0) {
      return null;
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0].editor || null;
  }

  function pickTextarea() {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    if (textareas.length === 0) {
      return null;
    }

    const scored = textareas.map((textarea) => {
      const rect = textarea.getBoundingClientRect();
      let score = isVisible(textarea) ? 4 : 0;
      score += Math.min(6, Math.round((rect.width * rect.height) / 90000));
      if (textarea === document.activeElement) {
        score += 6;
      }
      return { textarea, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].textarea || null;
  }

  function pickContentEditable() {
    const nodes = Array.from(document.querySelectorAll("[contenteditable='true']"));
    if (nodes.length === 0) {
      return null;
    }

    const scored = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      let score = isVisible(node) ? 4 : 0;
      score += Math.min(6, Math.round((rect.width * rect.height) / 90000));
      if (node === document.activeElement || node.contains(document.activeElement)) {
        score += 6;
      }
      return { node, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].node || null;
  }

  function getEditorSnapshot(targetFile) {
    try {
      const monacoEditor = pickMonacoEditor();
      if (monacoEditor && typeof monacoEditor.getModel === "function") {
        const model = monacoEditor.getModel();
        if (model && typeof model.getValue === "function") {
          const value = String(model.getValue() || "").replace(/\r\n?/g, "\n");
          if (contentLooksReasonable(value, targetFile)) {
            return { content: value, method: "monaco-editor" };
          }
        }
      }
    } catch (_error) {
      // Ignore Monaco editor errors.
    }

    try {
      if (window.monaco && window.monaco.editor && typeof window.monaco.editor.getModels === "function") {
        const models = window.monaco.editor.getModels() || [];
        for (const model of models) {
          if (!model || typeof model.getValue !== "function") {
            continue;
          }

          const value = String(model.getValue() || "").replace(/\r\n?/g, "\n");
          if (!contentLooksReasonable(value, targetFile)) {
            continue;
          }

          const nameSources = [];
          if (model.uri) {
            nameSources.push(model.uri.path);
            nameSources.push(model.uri.fsPath);
            if (typeof model.uri.toString === "function") {
              nameSources.push(model.uri.toString());
            }
          }
          if (model.id) {
            nameSources.push(model.id);
          }

          let matched = false;
          for (const sourceName of nameSources) {
            const found = findFileNames(sourceName || "");
            if (found.some((name) => isSameFileName(name, targetFile))) {
              matched = true;
              break;
            }
          }

          if (matched) {
            return { content: value, method: "monaco-model" };
          }
        }
      }
    } catch (_error) {
      // Ignore Monaco model errors.
    }

    try {
      const cm = pickCodeMirrorInstance();
      if (cm && typeof cm.getValue === "function") {
        const value = String(cm.getValue() || "").replace(/\r\n?/g, "\n");
        if (contentLooksReasonable(value, targetFile)) {
          return { content: value, method: "codemirror" };
        }
      }
    } catch (_error) {
      // Ignore CodeMirror errors.
    }

    try {
      const aceEditor = pickAceEditor();
      if (aceEditor && typeof aceEditor.getValue === "function") {
        const value = String(aceEditor.getValue() || "").replace(/\r\n?/g, "\n");
        if (contentLooksReasonable(value, targetFile)) {
          return { content: value, method: "ace" };
        }
      }
    } catch (_error) {
      // Ignore ACE errors.
    }

    const textarea = pickTextarea();
    if (textarea) {
      const value = String(textarea.value || textarea.textContent || "").replace(/\r\n?/g, "\n");
      if (contentLooksReasonable(value, targetFile)) {
        return { content: value, method: "textarea" };
      }
    }

    const contentEditable = pickContentEditable();
    if (contentEditable) {
      const value = String(contentEditable.textContent || "").replace(/\r\n?/g, "\n");
      if (contentLooksReasonable(value, targetFile)) {
        return { content: value, method: "contenteditable" };
      }
    }

    return null;
  }

  function buildFileNodeIndex() {
    const exactMap = new Map();
    const lowerMap = new Map();
    const baseMap = new Map();
    const detectedSet = new Set();

    function addEntry(path, element, labelText) {
      const normalized = normalizeFileName(path);
      if (!isTemplatePath(normalized) || !isLikelyEditorFilePath(normalized)) {
        return;
      }

      detectedSet.add(normalized);

      const normalizedLower = normalized.toLowerCase();
      const label = String(labelText || "").toLowerCase();
      let score = 0;
      if (isVisible(element)) {
        score += 100;
      }
      if (label.includes(normalizedLower)) {
        score += 40;
      }
      if (label.includes(getBaseName(normalizedLower))) {
        score += 25;
      }
      if (element.getAttribute("aria-selected") === "true") {
        score += 20;
      }
      const textLength = label.replace(/\s+/g, " ").trim().length;
      score += Math.max(0, 30 - Math.min(30, textLength));

      const current = exactMap.get(normalized);
      if (!current || score > current.score) {
        const next = {
          path: normalized,
          pathLower: normalizedLower,
          element,
          score
        };
        exactMap.set(normalized, next);
        lowerMap.set(normalizedLower, next);
      }

      const base = getBaseName(normalizedLower);
      const list = baseMap.get(base) || [];
      if (!list.some((item) => item.pathLower === normalizedLower && item.element === element)) {
        list.push({
          path: normalized,
          pathLower: normalizedLower,
          element,
          score
        });
        baseMap.set(base, list);
      }
    }

    const elements = document.querySelectorAll(
      "[data-filename], [data-file], [data-path], [data-name], [role='tab'], [role='treeitem'], li, a, button, span, div"
    );

    let scanned = 0;
    for (const element of elements) {
      scanned += 1;
      if (scanned > MAX_SCAN_ELEMENTS) {
        break;
      }

      const candidate =
        element.closest("button, a, [role='tab'], [role='treeitem'], li, [tabindex]") || element;
      if (!isProbablyClickable(candidate)) {
        continue;
      }
      if (!hasFileNodeHints(element) && !hasFileNodeHints(candidate)) {
        continue;
      }

      const names = [
        ...namesFromElement(element),
        ...namesFromElement(candidate)
      ];
      if (names.length === 0) {
        continue;
      }

      const label = [
        candidate.textContent,
        candidate.getAttribute("title"),
        candidate.getAttribute("aria-label"),
        element.textContent,
        element.getAttribute("title"),
        element.getAttribute("aria-label")
      ]
        .filter(Boolean)
        .join(" ");

      for (const name of names) {
        addEntry(name, candidate, label);
      }
    }

    return { exactMap, lowerMap, baseMap, detectedSet };
  }

  function findNodeForFile(targetPath, index) {
    const normalized = normalizeFileName(targetPath);
    const normalizedLower = normalized.toLowerCase();

    if (index.exactMap.has(normalized)) {
      return index.exactMap.get(normalized).element;
    }
    if (index.lowerMap.has(normalizedLower)) {
      return index.lowerMap.get(normalizedLower).element;
    }

    for (const entry of index.lowerMap.values()) {
      if (
        entry.pathLower.endsWith("/" + normalizedLower) ||
        normalizedLower.endsWith("/" + entry.pathLower)
      ) {
        return entry.element;
      }
    }

    const base = getBaseName(normalizedLower);
    const candidates = (index.baseMap.get(base) || []).slice();
    if (candidates.length === 0) {
      return null;
    }
    if (candidates.length === 1) {
      return candidates[0].element;
    }

    const parent = getParentDir(normalizedLower);
    const inSameDir = parent
      ? candidates.filter((item) => item.pathLower.includes(parent))
      : [];

    const ranked = (inSameDir.length > 0 ? inSameDir : candidates).sort(
      (a, b) => b.score - a.score
    );
    return ranked[0].element;
  }

  function collectNamesFromMonaco() {
    const names = new Set();
    try {
      if (!window.monaco || !window.monaco.editor || typeof window.monaco.editor.getModels !== "function") {
        return names;
      }

      const models = window.monaco.editor.getModels() || [];
      for (const model of models) {
        if (!model) {
          continue;
        }

        const sources = [];
        if (model.uri) {
          sources.push(model.uri.path);
          sources.push(model.uri.fsPath);
          if (typeof model.uri.toString === "function") {
            sources.push(model.uri.toString());
          }
        }
        if (model.id) {
          sources.push(model.id);
        }

        for (const sourceName of sources) {
          const found = findFileNames(sourceName || "");
          for (const name of found) {
            names.add(name);
          }
        }
      }
    } catch (_error) {
      // Ignore Monaco model discovery errors.
    }

    return names;
  }

  const host = String(window.location.hostname || "").toLowerCase();
  const isSupportedPage = host.includes("tebex.io") || host.includes("buildersoftware.com");

  if (!isSupportedPage) {
    return {
      isSupportedPage: false,
      errorMessage: "This page is not a supported Tebex editor domain.",
      files: {},
      sources: {},
      detectedFileCount: 0,
      missingFiles: []
    };
  }

  const nodeIndex = buildFileNodeIndex();
  const detected = new Set();

  for (const value of Array.isArray(defaultFiles) ? defaultFiles : []) {
    const normalized = normalizeFileName(value);
    if (isTemplatePath(normalized) && isLikelyEditorFilePath(normalized)) {
      detected.add(normalized);
    }
  }

  for (const value of nodeIndex.detectedSet) {
    detected.add(value);
  }

  const monacoNames = collectNamesFromMonaco();
  for (const value of monacoNames) {
    detected.add(normalizeFileName(value));
  }

  const targetFiles = Array.from(detected)
    .filter((name) => isTemplatePath(name) && isLikelyEditorFilePath(name))
    .sort((a, b) => a.localeCompare(b));

  const files = Object.create(null);
  const sources = Object.create(null);
  const failures = Object.create(null);

  for (const targetFile of targetFiles) {
    const node = findNodeForFile(targetFile, nodeIndex);
    if (!node) {
      failures[targetFile] = "No matching file node found.";
      continue;
    }

    try {
      if (isVisible(node)) {
        node.scrollIntoView({ block: "center", inline: "nearest" });
      }

      const before = getEditorSnapshot(targetFile);
      fireClick(node);

      let best = null;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await wait(attempt < 4 ? 110 : 170);

        const activeName = getActiveFileName();
        const snapshot = getEditorSnapshot(targetFile);
        if (!snapshot) {
          continue;
        }

        const changed = !before || snapshot.content !== before.content;
        const nameMatches = activeName ? isSameFileName(activeName, targetFile) : false;

        if (nameMatches && (changed || attempt >= 2)) {
          best = snapshot;
          break;
        }

        if (nameMatches && !best) {
          best = snapshot;
        }

        if (!nameMatches && changed && attempt >= 4 && !best) {
          best = snapshot;
        }

        if (attempt === 11 && !best) {
          best = snapshot;
        }
      }

      if (best && contentLooksReasonable(best.content, targetFile)) {
        files[targetFile] = String(best.content || "").replace(/\r\n?/g, "\n");
        sources[targetFile] = "ui-click:" + best.method;
      } else {
        failures[targetFile] = "Editor content was not available after opening file.";
      }
    } catch (error) {
      failures[targetFile] = error && error.message ? error.message : "Extraction error.";
    }
  }

  const activeName = getActiveFileName();
  if (activeName) {
    const missingMatch = targetFiles.find(
      (name) => !files[name] && isSameFileName(name, activeName)
    );
    if (missingMatch) {
      const snapshot = getEditorSnapshot(missingMatch);
      if (snapshot && contentLooksReasonable(snapshot.content, missingMatch)) {
        files[missingMatch] = String(snapshot.content || "").replace(/\r\n?/g, "\n");
        sources[missingMatch] = "active-editor:" + snapshot.method;
      }
    }
  }

  const missingFiles = targetFiles.filter((name) => !files[name]);

  return {
    isSupportedPage: true,
    pageUrl: String(window.location.href || ""),
    files,
    sources,
    errors: failures,
    detectedFileCount: targetFiles.length,
    extractedFileCount: Object.keys(files).length,
    missingFiles
  };
}

async function applyTemplatesInPage(filesByPath) {
  const FILE_REGEX = /([A-Za-z0-9_./-]+\.(?:html|twig|js|css))/gi;
  const host = String(window.location.hostname || "").toLowerCase();
  const isSupportedPage = host.includes("tebex.io") || host.includes("buildersoftware.com");

  if (!isSupportedPage) {
    return {
      isSupportedPage: false,
      errorMessage: "This page is not a supported Tebex editor domain.",
      totalRequested: 0,
      matchedCount: 0,
      uploadedCount: 0,
      uploadedFiles: [],
      failedFiles: []
    };
  }

  function normalizeFileName(value) {
    return String(value || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/{2,}/g, "/")
      .trim();
  }

  function isTemplatePath(path) {
    return /\.(html|twig|js|css)$/i.test(path);
  }

  function isLikelyEditorFilePath(path) {
    const normalized = normalizeFileName(path);
    if (!normalized) {
      return false;
    }
    if (/^(?:https?:|chrome:|file:|data:|blob:)/i.test(normalized)) {
      return false;
    }
    if (normalized.includes("://") || normalized.includes("//")) {
      return false;
    }
    const firstSegment = normalized.split("/")[0] || "";
    if (normalized.includes("/") && firstSegment.includes(".") && !isTemplatePath(firstSegment)) {
      return false;
    }
    return true;
  }

  function getBaseName(path) {
    const normalized = normalizeFileName(path);
    const segments = normalized.split("/");
    return segments[segments.length - 1] || normalized;
  }

  function getParentDir(path) {
    const normalized = normalizeFileName(path).toLowerCase();
    const segments = normalized.split("/");
    if (segments.length <= 1) {
      return "";
    }
    return segments.slice(0, -1).join("/");
  }

  function strictPathMatch(targetPath, candidatePath) {
    const target = normalizeFileName(targetPath).toLowerCase();
    const candidate = normalizeFileName(candidatePath).toLowerCase();
    if (!target || !candidate) {
      return false;
    }
    if (target === candidate) {
      return true;
    }
    return candidate.endsWith("/" + target);
  }

  function isSameFileName(a, b) {
    const left = normalizeFileName(a).toLowerCase();
    const right = normalizeFileName(b).toLowerCase();
    if (!left || !right) {
      return false;
    }
    if (left === right) {
      return true;
    }
    if (left.endsWith("/" + right) || right.endsWith("/" + left)) {
      return true;
    }
    return getBaseName(left) === getBaseName(right);
  }

  function extractNames(raw) {
    if (!raw) {
      return [];
    }

    const text = String(raw);
    const names = new Set();
    let match = null;
    while ((match = FILE_REGEX.exec(text)) !== null) {
      const cleaned = normalizeFileName(match[1]).replace(/['"`),;:]+$/, "");
      if (isTemplatePath(cleaned) && isLikelyEditorFilePath(cleaned)) {
        names.add(cleaned);
      }
    }
    FILE_REGEX.lastIndex = 0;
    return Array.from(names);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function isVisible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (!style || style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isProbablyClickable(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }
    const tag = element.tagName.toLowerCase();
    const role = String(element.getAttribute("role") || "").toLowerCase();
    return (
      tag === "button" ||
      tag === "a" ||
      role === "tab" ||
      role === "treeitem" ||
      role === "option" ||
      typeof element.onclick === "function" ||
      element.tabIndex >= 0
    );
  }

  function hasFileNodeHints(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    if (
      element.hasAttribute("data-filename") ||
      element.hasAttribute("data-file") ||
      element.hasAttribute("data-path") ||
      element.hasAttribute("data-name")
    ) {
      return true;
    }

    const role = String(element.getAttribute("role") || "").toLowerCase();
    if (role === "tab" || role === "treeitem" || role === "option") {
      return true;
    }

    const classHint = String(element.className || "").toLowerCase();
    if (/file|template|editor|tree|sidebar|list-item/.test(classHint)) {
      return true;
    }

    return false;
  }

  function fireClick(element) {
    element.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window })
    );
    element.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window })
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
    );
  }

  function dispatchInputEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function collectNamesFromElement(element) {
    if (!element) {
      return [];
    }
    return extractNames(
      [
        element.getAttribute("data-filename"),
        element.getAttribute("data-file"),
        element.getAttribute("data-path"),
        element.getAttribute("data-name"),
        element.getAttribute("title"),
        element.getAttribute("aria-label"),
        element.textContent
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function getActiveFileNode() {
    const selectors = [
      '[role="tab"][aria-selected="true"]',
      '[role="treeitem"][aria-selected="true"]',
      '[aria-current="true"]',
      ".active",
      ".is-active",
      ".selected"
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function getActiveFileName() {
    const activeNode = getActiveFileNode();
    if (!activeNode) {
      return null;
    }
    const names = collectNamesFromElement(activeNode);
    return names.length > 0 ? names[0] : null;
  }

  function activeFileLooksDirty() {
    const node = getActiveFileNode();
    if (!node) {
      return null;
    }
    const label = [
      node.textContent,
      node.getAttribute("title"),
      node.getAttribute("aria-label"),
      node.className
    ]
      .filter(Boolean)
      .join(" ");
    if (!label) {
      return null;
    }
    const normalized = label.toLowerCase();
    if (/\*/.test(label) || /\bunsaved\b/.test(normalized) || /\bdirty\b/.test(normalized)) {
      return true;
    }
    return false;
  }

  function collectTreeMaps() {
    const exactMap = new Map();
    const lowerMap = new Map();
    const baseMap = new Map();
    const elements = document.querySelectorAll(
      "[data-filename], [data-file], [data-path], [data-name], [role='tab'], [role='treeitem'], li, a, button, span, div"
    );

    let scanned = 0;
    for (const element of elements) {
      scanned += 1;
      if (scanned > 15000) {
        break;
      }

      const candidate =
        element.closest("button, a, [role='tab'], [role='treeitem'], li, [tabindex]") || element;

      if (!isProbablyClickable(candidate)) {
        continue;
      }
      if (!hasFileNodeHints(element) && !hasFileNodeHints(candidate)) {
        continue;
      }

      const names = [
        ...collectNamesFromElement(element),
        ...collectNamesFromElement(candidate)
      ];
      if (names.length === 0) {
        continue;
      }

      for (const rawName of names) {
        const normalizedName = normalizeFileName(rawName);
        if (!isTemplatePath(normalizedName) || !isLikelyEditorFilePath(normalizedName)) {
          continue;
        }

        const normalizedLower = normalizedName.toLowerCase();
        const label = [
          candidate.textContent,
          candidate.getAttribute("title"),
          candidate.getAttribute("aria-label"),
          element.textContent,
          element.getAttribute("title"),
          element.getAttribute("aria-label")
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        let score = 0;
        if (isVisible(candidate)) {
          score += 100;
        }
        if (label.includes(normalizedLower)) {
          score += 40;
        }
        if (label.includes(getBaseName(normalizedLower))) {
          score += 25;
        }
        if (candidate.getAttribute("aria-selected") === "true") {
          score += 20;
        }

        const existing = exactMap.get(normalizedName);
        if (!existing || (!isVisible(existing) && isVisible(candidate))) {
          exactMap.set(normalizedName, candidate);
          lowerMap.set(normalizedLower, candidate);
        }

        const base = getBaseName(normalizedName).toLowerCase();
        const list = baseMap.get(base) || [];
        if (!list.some((item) => item.pathLower === normalizedLower && item.element === candidate)) {
          list.push({
            path: normalizedName,
            pathLower: normalizedLower,
            dirLower: getParentDir(normalizedLower),
            element: candidate,
            score
          });
          baseMap.set(base, list);
        }
      }
    }

    return { exactMap, lowerMap, baseMap };
  }

  function findNodeForFile(filePath, maps) {
    const normalizedPath = normalizeFileName(filePath);
    const lowerPath = normalizedPath.toLowerCase();
    const targetDir = getParentDir(lowerPath);
    const targetBase = getBaseName(lowerPath);

    if (maps.exactMap.has(normalizedPath)) {
      return {
        element: maps.exactMap.get(normalizedPath),
        matchedPath: normalizedPath,
        matchType: "exact"
      };
    }
    if (maps.lowerMap.has(lowerPath)) {
      return {
        element: maps.lowerMap.get(lowerPath),
        matchedPath: lowerPath,
        matchType: "exact-ci"
      };
    }

    const suffixMatches = [];
    for (const [knownPath, element] of maps.exactMap.entries()) {
      const lowerKnown = knownPath.toLowerCase();
      if (strictPathMatch(lowerPath, lowerKnown)) {
        suffixMatches.push({ path: knownPath, pathLower: lowerKnown, element });
      }
    }
    if (suffixMatches.length === 1) {
      return {
        element: suffixMatches[0].element,
        matchedPath: suffixMatches[0].path,
        matchType: "suffix"
      };
    }
    if (suffixMatches.length > 1) {
      return {
        element: null,
        reason: `Ambiguous path match for ${normalizedPath}. Multiple directories matched.`,
        matchType: "ambiguous-suffix"
      };
    }

    const candidates = (maps.baseMap.get(targetBase) || []).slice();
    if (candidates.length === 1) {
      const only = candidates[0];
      if (!targetDir || only.dirLower === targetDir) {
        return {
          element: only.element,
          matchedPath: only.path,
          matchType: "basename-unique"
        };
      }
      return {
        element: null,
        reason: `Directory mismatch for ${normalizedPath}. Found ${only.path}.`,
        matchType: "dir-mismatch"
      };
    }

    if (candidates.length > 1) {
      const exactDirMatches = candidates.filter((candidate) =>
        candidate.dirLower === targetDir
      );
      if (exactDirMatches.length === 1) {
        return {
          element: exactDirMatches[0].element,
          matchedPath: exactDirMatches[0].path,
          matchType: "basename-dir"
        };
      }
      if (exactDirMatches.length > 1) {
        return {
          element: null,
          reason: `Ambiguous file in directory for ${normalizedPath}.`,
          matchType: "ambiguous-dir"
        };
      }

      return {
        element: null,
        reason: `Ambiguous filename for ${normalizedPath}. Multiple directories contain ${targetBase}.`,
        matchType: "ambiguous-base"
      };
    }

    return {
      element: null,
      reason: `No matching file entry found for ${normalizedPath}.`,
      matchType: "missing"
    };
  }

  function pickMonacoEditor() {
    if (!window.monaco || !window.monaco.editor || typeof window.monaco.editor.getEditors !== "function") {
      return null;
    }
    const editors = window.monaco.editor.getEditors() || [];
    if (editors.length === 0) {
      return null;
    }

    const scored = editors.map((editor) => {
      let score = 0;
      try {
        if (typeof editor.hasTextFocus === "function" && editor.hasTextFocus()) {
          score += 6;
        }
      } catch (_error) {
        // Ignore focus errors.
      }
      try {
        const node = typeof editor.getDomNode === "function" ? editor.getDomNode() : null;
        if (node && isVisible(node)) {
          score += 4;
        }
      } catch (_error) {
        // Ignore visibility errors.
      }
      return { editor, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].editor || null;
  }

  function pickCodeMirrorInstance() {
    const wrappers = Array.from(document.querySelectorAll(".CodeMirror"));
    if (wrappers.length === 0) {
      return null;
    }

    const scored = wrappers
      .map((wrapper) => {
        const instance = wrapper.CodeMirror;
        if (!instance || typeof instance.setValue !== "function") {
          return null;
        }
        let score = isVisible(wrapper) ? 4 : 0;
        if (
          wrapper.classList.contains("CodeMirror-focused") ||
          wrapper.contains(document.activeElement)
        ) {
          score += 5;
        }
        return { instance, score };
      })
      .filter(Boolean);

    if (scored.length === 0) {
      return null;
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0].instance || null;
  }

  function pickAceEditor() {
    if (!window.ace || typeof window.ace.edit !== "function") {
      return null;
    }

    const nodes = Array.from(document.querySelectorAll(".ace_editor"));
    if (nodes.length === 0) {
      return null;
    }

    const scored = [];
    for (const node of nodes) {
      try {
        const editor = window.ace.edit(node);
        if (!editor || typeof editor.setValue !== "function") {
          continue;
        }
        let score = isVisible(node) ? 4 : 0;
        if (node.contains(document.activeElement)) {
          score += 4;
        }
        scored.push({ editor, score });
      } catch (_error) {
        // Ignore invalid ACE nodes.
      }
    }

    if (scored.length === 0) {
      return null;
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0].editor || null;
  }

  function pickTextarea() {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    if (textareas.length === 0) {
      return null;
    }

    const scored = textareas.map((textarea) => {
      const rect = textarea.getBoundingClientRect();
      let score = isVisible(textarea) ? 4 : 0;
      score += Math.min(5, Math.round((rect.width * rect.height) / 90000));
      if (textarea === document.activeElement) {
        score += 3;
      }
      return { textarea, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].textarea || null;
  }

  function pickContentEditable() {
    const editables = Array.from(document.querySelectorAll("[contenteditable='true']"));
    if (editables.length === 0) {
      return null;
    }

    const visible = editables.find((element) => isVisible(element));
    return visible || editables[0];
  }

  function writeEditorContent(content) {
    const normalized = String(content || "").replace(/\r\n?/g, "\n");

    try {
      const monacoEditor = pickMonacoEditor();
      if (monacoEditor && typeof monacoEditor.getModel === "function") {
        const model = monacoEditor.getModel();
        if (model && typeof model.setValue === "function") {
          model.setValue(normalized);
          if (typeof monacoEditor.focus === "function") {
            monacoEditor.focus();
          }
          return "monaco";
        }
      }
    } catch (_error) {
      // Fall through to other strategies.
    }

    try {
      const codeMirror = pickCodeMirrorInstance();
      if (codeMirror) {
        codeMirror.setValue(normalized);
        if (typeof codeMirror.focus === "function") {
          codeMirror.focus();
        }
        return "codemirror";
      }
    } catch (_error) {
      // Fall through to other strategies.
    }

    try {
      const aceEditor = pickAceEditor();
      if (aceEditor) {
        aceEditor.setValue(normalized, -1);
        if (typeof aceEditor.focus === "function") {
          aceEditor.focus();
        }
        return "ace";
      }
    } catch (_error) {
      // Fall through to other strategies.
    }

    const textarea = pickTextarea();
    if (textarea) {
      textarea.focus();
      textarea.value = normalized;
      dispatchInputEvents(textarea);
      return "textarea";
    }

    const contentEditable = pickContentEditable();
    if (contentEditable) {
      contentEditable.focus();
      contentEditable.textContent = normalized;
      dispatchInputEvents(contentEditable);
      return "contenteditable";
    }

    return null;
  }

  function findSaveControls() {
    const candidates = Array.from(
      document.querySelectorAll(
        "button, [role='button'], [type='submit'], a, [title], [aria-label], [data-action], [data-testid]"
      )
    );

    const saveControls = [];
    for (const element of candidates) {
      if (!isVisible(element)) {
        continue;
      }
      const text = [
        element.textContent,
        element.getAttribute("title"),
        element.getAttribute("aria-label"),
        element.getAttribute("data-action"),
        element.getAttribute("data-testid"),
        element.id,
        element.className
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!/\bsave\b/.test(text)) {
        continue;
      }

      let score = 0;
      if (element.tagName.toLowerCase() === "button") {
        score += 15;
      }
      if (element.getAttribute("type") === "submit") {
        score += 10;
      }
      if (/\bsave\b/.test(text)) {
        score += 20;
      }
      if (/publish|update|apply/.test(text)) {
        score += 4;
      }
      if (element.disabled || element.getAttribute("aria-disabled") === "true") {
        score -= 30;
      }

      saveControls.push({ element, score });
    }

    saveControls.sort((a, b) => b.score - a.score);
    return saveControls.map((item) => item.element);
  }

  function dispatchSaveShortcut(ctrlKey, metaKey, target) {
    const eventInit = {
      key: "s",
      code: "KeyS",
      bubbles: true,
      cancelable: true,
      ctrlKey,
      metaKey
    };

    const targets = [target, document.activeElement, document, window].filter(Boolean);
    for (const currentTarget of targets) {
      try {
        currentTarget.dispatchEvent(new KeyboardEvent("keydown", eventInit));
        currentTarget.dispatchEvent(new KeyboardEvent("keypress", eventInit));
        currentTarget.dispatchEvent(new KeyboardEvent("keyup", eventInit));
      } catch (_error) {
        // Keep trying remaining targets.
      }
    }
  }

  function activeNameMatchesTarget(activeName, targetPath, maps) {
    if (!activeName) {
      return false;
    }

    if (strictPathMatch(targetPath, activeName) || strictPathMatch(activeName, targetPath)) {
      return true;
    }

    const activeBase = getBaseName(activeName).toLowerCase();
    const targetBase = getBaseName(targetPath).toLowerCase();
    if (activeBase !== targetBase) {
      return false;
    }

    const sameBaseCandidates = maps.baseMap.get(activeBase) || [];
    return sameBaseCandidates.length === 1;
  }

  async function triggerSaveForFile(targetPath, maps) {
    let saveMethod = "shortcut";
    const target =
      document.activeElement && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : document.body;
    const saveControls = findSaveControls();
    const dirtyBefore = activeFileLooksDirty();
    let lastDirtyState = dirtyBefore;

    function areSaveControlsIdle(controls) {
      if (!controls || controls.length === 0) {
        return null;
      }

      let sawVisible = false;
      for (const control of controls.slice(0, 3)) {
        if (!isVisible(control)) {
          continue;
        }
        sawVisible = true;
        const disabled =
          control.disabled ||
          control.getAttribute("aria-disabled") === "true" ||
          control.classList.contains("disabled");
        if (!disabled) {
          return false;
        }
      }

      return sawVisible ? true : null;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      dispatchSaveShortcut(true, false, target);
      dispatchSaveShortcut(false, true, target);
      await wait(100);

      let clicked = false;
      for (const control of saveControls.slice(0, 3)) {
        try {
          fireClick(control);
          if (typeof control.click === "function") {
            control.click();
          }
          clicked = true;
          break;
        } catch (_error) {
          // Try next save control.
        }
      }

      if (clicked) {
        saveMethod = "button+shortcut";
      } else if (attempt > 0) {
        saveMethod = "shortcut-retry";
      }

      await wait(220);

      const activeName = getActiveFileName();
      if (activeName && !activeNameMatchesTarget(activeName, targetPath, maps)) {
        return {
          ok: false,
          method: saveMethod,
          reason: `Active file switched to ${activeName} while saving ${targetPath}.`
        };
      }

      const dirtyAfter = activeFileLooksDirty();
      lastDirtyState = dirtyAfter;
      const controlsIdle = areSaveControlsIdle(saveControls);
      if (dirtyAfter === false) {
        return { ok: true, method: saveMethod };
      }
      if (dirtyAfter === null && controlsIdle === true && attempt >= 2) {
        return { ok: true, method: saveMethod };
      }
    }

    if (lastDirtyState === true) {
      return {
        ok: false,
        method: saveMethod,
        reason: `Save did not clear dirty state for ${targetPath}.`
      };
    }

    return { ok: true, method: saveMethod };
  }

  const confirmPatches = [];
  let blockedSwitchPrompts = 0;

  function patchConfirm(targetWindow) {
    if (!targetWindow || typeof targetWindow.confirm !== "function") {
      return;
    }

    const original = targetWindow.confirm.bind(targetWindow);
    const patched = (message) => {
      const text = String(message || "").toLowerCase();
      if (
        text.includes("unsaved") ||
        text.includes("different page") ||
        text.includes("leave site")
      ) {
        blockedSwitchPrompts += 1;
        return false;
      }
      return original(message);
    };

    try {
      targetWindow.confirm = patched;
      if (targetWindow.confirm === patched) {
        confirmPatches.push({ targetWindow, original });
      }
    } catch (_error) {
      // Ignore non-writable confirm.
    }
  }

  patchConfirm(window);
  try {
    if (window.top && window.top !== window) {
      patchConfirm(window.top);
    }
  } catch (_error) {
    // Cross-origin top window.
  }

  try {
    const requestedEntries = Object.entries(filesByPath || {})
      .map(([path, content]) => [normalizeFileName(path), String(content || "")])
      .filter(([path]) => isTemplatePath(path) && isLikelyEditorFilePath(path))
      .sort((a, b) => a[0].localeCompare(b[0]));

    const uploadedFiles = [];
    const failedFiles = [];
    let matchedCount = 0;

    for (const [filePath, content] of requestedEntries) {
      let maps = collectTreeMaps();
      let nodeMatch = findNodeForFile(filePath, maps);

      if (!nodeMatch.element) {
        await wait(120);
        maps = collectTreeMaps();
        nodeMatch = findNodeForFile(filePath, maps);
      }

      if (!nodeMatch.element) {
        failedFiles.push({
          file: filePath,
          reason: nodeMatch.reason || "No matching file entry found in Tebex file tree."
        });
        continue;
      }

      matchedCount += 1;

      try {
        const currentlyActive = getActiveFileName();
        if (
          activeFileLooksDirty() === true &&
          currentlyActive &&
          !activeNameMatchesTarget(currentlyActive, filePath, maps)
        ) {
          const preSwitchSave = await triggerSaveForFile(currentlyActive, maps);
          if (!preSwitchSave.ok) {
            failedFiles.push({
              file: filePath,
              reason:
                preSwitchSave.reason ||
                `Current file ${currentlyActive} is unsaved and could not be saved before switching.`
            });
            continue;
          }
          await wait(260);
        }

        const node = nodeMatch.element;
        if (isVisible(node)) {
          node.scrollIntoView({ block: "center", inline: "nearest" });
        }

        let promptCountBefore = blockedSwitchPrompts;
        fireClick(node);
        if (blockedSwitchPrompts > promptCountBefore) {
          const activeName = getActiveFileName() || currentlyActive || filePath;
          const preRetrySave = await triggerSaveForFile(activeName, maps);
          if (!preRetrySave.ok) {
            failedFiles.push({
              file: filePath,
              reason:
                preRetrySave.reason ||
                `Unsaved-change prompt blocked switch while opening ${filePath}.`
            });
            continue;
          }
          await wait(260);
          promptCountBefore = blockedSwitchPrompts;
          fireClick(node);
          if (blockedSwitchPrompts > promptCountBefore) {
            failedFiles.push({
              file: filePath,
              reason: `Switch to ${filePath} still blocked by unsaved changes after save retry.`
            });
            continue;
          }
        }

        let confirmedActive = false;
        for (let attempt = 0; attempt < 7; attempt += 1) {
          await wait(attempt < 3 ? 110 : 170);
          const activeName = getActiveFileName();
          if (!activeName) {
            if (attempt >= 3 && (nodeMatch.matchType === "exact" || nodeMatch.matchType === "suffix")) {
              confirmedActive = true;
              break;
            }
            continue;
          }
          if (activeNameMatchesTarget(activeName, filePath, maps)) {
            confirmedActive = true;
            break;
          }
        }

        if (!confirmedActive) {
          failedFiles.push({
            file: filePath,
            reason: "Could not confirm the exact target file/directory became active."
          });
          continue;
        }

        const writeMethod = writeEditorContent(content);
        if (!writeMethod) {
          failedFiles.push({
            file: filePath,
            reason: "Could not find a writable editor instance after opening file."
          });
          continue;
        }

        const saveResult = await triggerSaveForFile(filePath, maps);
        if (!saveResult.ok) {
          failedFiles.push({
            file: filePath,
            reason: saveResult.reason || "Save verification failed."
          });
          continue;
        }

        uploadedFiles.push({
          file: filePath,
          method: writeMethod,
          saveMethod: saveResult.method
        });
      } catch (error) {
        failedFiles.push({
          file: filePath,
          reason: error && error.message ? error.message : "Unknown upload error."
        });
      }
    }

    return {
      isSupportedPage: true,
      pageUrl: String(window.location.href || ""),
      totalRequested: requestedEntries.length,
      matchedCount,
      uploadedCount: uploadedFiles.length,
      uploadedFiles,
      failedFiles,
      blockedSwitchPrompts
    };
  } finally {
    for (const patch of confirmPatches) {
      try {
        patch.targetWindow.confirm = patch.original;
      } catch (_error) {
        // Ignore restore failures.
      }
    }
  }
}
