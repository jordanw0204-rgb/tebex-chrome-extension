// Tebex File Downloader - Content Extraction Script
console.log('✓ Tebex File Downloader content script loaded and ready to extract');

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractAllContent') {
    console.log('📦 Extracting content...');

    // If files array is empty, auto-detect all files on the page
    let filesToExtract = request.files;
    if (!filesToExtract || filesToExtract.length === 0) {
      filesToExtract = detectAllFilesOnPage();
      console.log(`✓ Auto-detected ${filesToExtract.length} files on page`);
    }

    const extractedFiles = extractAllFiles(filesToExtract);
    console.log('✓ Extracted', Object.keys(extractedFiles).length, 'files');
    sendResponse({ files: extractedFiles });
  }
});

function detectAllFilesOnPage() {
  console.log('🔍 Auto-detecting files on page...');
  const detectedFiles = new Set();

  // Look for file references in the page
  const allText = document.documentElement.innerText;

  // Common file patterns
  const patterns = [
    /[\w.-]+\.html/g,
    /[\w.-]+\.twig/g,
    /[\w.-]+\.htm/g
  ];

  for (const pattern of patterns) {
    const matches = allText.match(pattern);
    if (matches) {
      matches.forEach(file => {
        if (isValidTebexFile(file)) {
          detectedFiles.add(file);
        }
      });
    }
  }

  // Look in DOM for file names
  const elements = document.querySelectorAll('[data-filename], [data-file], [data-name], [title], [alt]');
  for (const el of elements) {
    const attrs = [el.dataset.filename, el.dataset.file, el.dataset.name, el.title, el.alt];
    for (const attr of attrs) {
      if (attr && (attr.endsWith('.html') || attr.endsWith('.twig'))) {
        if (isValidTebexFile(attr)) {
          detectedFiles.add(attr);
        }
      }
    }
  }

  // Check all text nodes for file references
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent;
    const htmlMatches = text.match(/[\w.\/-]+\.html/g);
    const twigMatches = text.match(/[\w.\/-]+\.twig/g);

    if (htmlMatches) {
      htmlMatches.forEach(file => {
        if (isValidTebexFile(file)) {
          detectedFiles.add(file);
        }
      });
    }

    if (twigMatches) {
      twigMatches.forEach(file => {
        if (isValidTebexFile(file)) {
          detectedFiles.add(file);
        }
      });
    }
  }

  const result = Array.from(detectedFiles).sort();
  console.log('✓ Detected files:', result);
  return result;
}

function isValidTebexFile(filename) {
  // Filter out common false positives
  const invalidPatterns = [
    'chrome://',
    'http://',
    'https://',
    'file://',
    'data:',
    'blob:',
    '.css',
    '.js',
    '.json',
    '.xml',
    '.txt'
  ];

  for (const pattern of invalidPatterns) {
    if (filename.includes(pattern)) {
      return false;
    }
  }

  return filename.endsWith('.html') || filename.endsWith('.twig');
}

function extractAllFiles(filenames) {
  const extractedFiles = {};

  for (const filename of filenames) {
    const content = extractFileContent(filename);
    if (content) {
      extractedFiles[filename] = content;
      console.log(`✓ Extracted: ${filename} (${content.length} bytes)`);
    }
  }

  return extractedFiles;
}

function extractFileContent(filename) {
  // Try all extraction methods
  const editorContent = extractFromEditorElements(filename);
  if (editorContent && editorContent.length > 50) {
    return editorContent;
  }

  const searchContent = searchPageForContent(filename);
  if (searchContent && searchContent.length > 50) {
    return searchContent;
  }

  const codeContent = extractFromCodeBlocks(filename);
  if (codeContent && codeContent.length > 50) {
    return codeContent;
  }

  const editorInstance = extractFromEditorInstances(filename);
  if (editorInstance && editorInstance.length > 50) {
    return editorInstance;
  }

  const iframeContent = extractFromIframes(filename);
  if (iframeContent && iframeContent.length > 50) {
    return iframeContent;
  }

  console.log(`⚠️ Could not extract content for ${filename}`);
  return null;
}

function extractFromEditorElements(filename) {
  const cleanName = filename.replace(/\.(html|twig)$/, '').split('/').pop();

  const selectors = [
    `[data-filename*="${filename}"]`,
    `[data-name*="${filename}"]`,
    `[class*="editor"][class*="${cleanName}"]`,
    'div[contenteditable="true"]',
    '.template-content',
    '.code-content',
    '.file-content',
    '[role="tabpanel"] code',
    '[role="tabpanel"] pre'
  ];

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent || el.innerText;
        if (text && text.length > 50 && (text.includes('<') || text.includes('{'))) {
          return text.trim();
        }
      }
    } catch (e) {
      // Invalid selector
    }
  }

  return null;
}

function searchPageForContent(filename) {
  const cleanName = filename.replace(/\.(html|twig)$/, '').split('/').pop();
  const containers = document.querySelectorAll('div, section, article, main, [role="main"]');

  for (const container of containers) {
    const text = container.textContent;

    if (text.includes(filename) || text.includes(cleanName)) {
      const codeEl = container.querySelector('code, pre, textarea, [contenteditable="true"]');
      if (codeEl) {
        const code = codeEl.textContent || codeEl.innerText || codeEl.value;
        if (code && code.length > 50) {
          return code.trim();
        }
      }

      if (text.includes('<') && text.includes('>')) {
        return text.trim();
      }
    }
  }

  return null;
}

function extractFromCodeBlocks(filename) {
  const codeElements = document.querySelectorAll('code, pre, textarea, xmp, plaintext, .hljs');

  for (const el of codeElements) {
    let content = el.textContent || el.innerText || el.value;

    if (!content) continue;
    if (content.length < 50) continue;
    if (content.includes('<') || content.includes('{')) {
      return content.trim();
    }
  }

  return null;
}

function extractFromEditorInstances(filename) {
  // Monaco Editor
  if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
    try {
      const editors = window.monaco.editor.getEditors();
      for (const editor of editors) {
        const model = editor.getModel();
        if (model) {
          const value = model.getValue();
          if (value && value.length > 50) {
            return value;
          }
        }
      }
    } catch (e) {
      console.log('Monaco extraction failed');
    }
  }

  // CodeMirror
  if (typeof window.CodeMirror !== 'undefined') {
    try {
      const mirrors = document.querySelectorAll('.CodeMirror');
      for (const mirror of mirrors) {
        if (mirror.CodeMirror && mirror.CodeMirror.getValue) {
          const value = mirror.CodeMirror.getValue();
          if (value && value.length > 50) {
            return value;
          }
        }
      }
    } catch (e) {
      console.log('CodeMirror extraction failed');
    }
  }

  // ACE Editor
  if (typeof window.ace !== 'undefined') {
    try {
      const editors = window.ace.edit.sessions;
      if (editors) {
        for (const session of Object.values(editors)) {
          if (session && session.getValue) {
            const value = session.getValue();
            if (value && value.length > 50) {
              return value;
            }
          }
        }
      }
    } catch (e) {
      console.log('ACE extraction failed');
    }
  }

  return null;
}

function extractFromIframes(filename) {
  const iframes = document.querySelectorAll('iframe');

  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const text = iframeDoc.body.textContent;
        if (text && text.includes('<')) {
          return text.trim();
        }
      }
    } catch (e) {
      // Cross-origin or sandboxed
    }
  }

  return null;
}

function extractFileContent(filename) {
  // Try all extraction methods in order

  // Method 1: Look for visible editor content
  const editorContent = extractFromEditorElements(filename);
  if (editorContent && editorContent.length > 50) {
    return editorContent;
  }

  // Method 2: Search page content by filename
  const searchContent = searchPageForContent(filename);
  if (searchContent && searchContent.length > 50) {
    return searchContent;
  }

  // Method 3: Look in code blocks and textareas
  const codeContent = extractFromCodeBlocks(filename);
  if (codeContent && codeContent.length > 50) {
    return codeContent;
  }

  // Method 4: Look for Monaco/CodeMirror editors
  const editorInstance = extractFromEditorInstances(filename);
  if (editorInstance && editorInstance.length > 50) {
    return editorInstance;
  }

  // Method 5: Check iframe content
  const iframeContent = extractFromIframes(filename);
  if (iframeContent && iframeContent.length > 50) {
    return iframeContent;
  }

  console.log(`⚠️ Could not extract content for ${filename}`);
  return null;
}

function extractFromEditorElements(filename) {
  // Look for any element that contains the filename
  const cleanName = filename.replace(/\.(html|twig)$/, '').split('/').pop();

  // Common selector patterns for editor content
  const selectors = [
    '[data-filename*="' + filename + '"]',
    '[data-name*="' + filename + '"]',
    '[class*="editor"][class*="' + cleanName + '"]',
    'div[contenteditable="true"]',
    '.template-content',
    '.code-content',
    '.file-content',
    '[role="tabpanel"] code',
    '[role="tabpanel"] pre'
  ];

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent || el.innerText;
        if (text && text.length > 50 && (text.includes('<') || text.includes('{'))) {
          return text.trim();
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  return null;
}

function searchPageForContent(filename) {
  // Search the entire page for content related to this file
  const cleanName = filename.replace(/\.(html|twig)$/, '').split('/').pop();

  // Look through all divs, sections, articles
  const containers = document.querySelectorAll('div, section, article, main, [role="main"]');

  for (const container of containers) {
    const text = container.textContent;

    // Check if this container mentions our file
    if (text.includes(filename) || text.includes(cleanName)) {
      // Look for code blocks inside
      const codeEl = container.querySelector('code, pre, textarea, [contenteditable="true"]');
      if (codeEl) {
        const code = codeEl.textContent || codeEl.innerText || codeEl.value;
        if (code && code.length > 50) {
          return code.trim();
        }
      }

      // Check direct content
      if (text.includes('<') && text.includes('>')) {
        return text.trim();
      }
    }
  }

  return null;
}

function extractFromCodeBlocks(filename) {
  // Look in all code/pre/textarea elements
  const codeElements = document.querySelectorAll('code, pre, textarea, xmp, plaintext, .hljs');

  for (const el of codeElements) {
    let content = el.textContent || el.innerText || el.value;

    if (!content) continue;

    // Filter out very small content
    if (content.length < 50) continue;

    // Check if it looks like code (has HTML tags or Twig syntax)
    if (content.includes('<') || content.includes('{')) {
      return content.trim();
    }
  }

  return null;
}

function extractFromEditorInstances(filename) {
  // Try Monaco Editor
  if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
    try {
      const editors = window.monaco.editor.getEditors();
      for (const editor of editors) {
        const model = editor.getModel();
        if (model) {
          const value = model.getValue();
          if (value && value.length > 50) {
            return value;
          }
        }
      }
    } catch (e) {
      console.log('Monaco extraction failed:', e.message);
    }
  }

  // Try CodeMirror
  if (typeof window.CodeMirror !== 'undefined') {
    try {
      const mirrors = document.querySelectorAll('.CodeMirror');
      for (const mirror of mirrors) {
        if (mirror.CodeMirror && mirror.CodeMirror.getValue) {
          const value = mirror.CodeMirror.getValue();
          if (value && value.length > 50) {
            return value;
          }
        }
      }
    } catch (e) {
      console.log('CodeMirror extraction failed:', e.message);
    }
  }

  // Try ACE Editor
  if (typeof window.ace !== 'undefined') {
    try {
      const editors = window.ace.edit.sessions;
      if (editors) {
        for (const session of Object.values(editors)) {
          if (session && session.getValue) {
            const value = session.getValue();
            if (value && value.length > 50) {
              return value;
            }
          }
        }
      }
    } catch (e) {
      console.log('ACE extraction failed:', e.message);
    }
  }

  return null;
}

function extractFromIframes(filename) {
  // Check content in iframes
  const iframes = document.querySelectorAll('iframe');

  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const text = iframeDoc.body.textContent;
        if (text && text.includes('<')) {
          return text.trim();
        }
      }
    } catch (e) {
      // Cross-origin or sandboxed iframe
    }
  }

  return null;
}

