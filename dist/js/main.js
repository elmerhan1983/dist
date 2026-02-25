window.__SJ_MAIN_LOADED__ = true;

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const inquiryForms = Array.from(document.querySelectorAll('form[data-inquiry-form]'));
for (const form of inquiryForms) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const statusId = form.getAttribute('data-status-target') || 'inquiryStatus';
    const status = document.getElementById(statusId);
    const payload = Object.fromEntries(new FormData(form).entries());

    if (status) status.textContent = 'Submitting...';
    try {
      const result = await postJson('/api/inquiry', payload);
      if (status) status.textContent = `Received (${result.inquiryId}). We will contact you soon.`;
      form.reset();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('loginStatus');
    const payload = Object.fromEntries(new FormData(loginForm).entries());

    status.textContent = 'Signing in...';
    try {
      const result = await postJson('/api/login', payload);
      window.location.href = result.redirect;
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await postJson('/api/logout', {});
    window.location.href = '/';
  });
}

const filterInputs = Array.from(document.querySelectorAll('.filter-input[data-filter-target]'));
for (const input of filterInputs) {
  const targetId = input.getAttribute('data-filter-target');
  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) continue;

  const linkedSelect = document.querySelector(`.filter-select[data-filter-target="${targetId}"]`);
  const attrName = linkedSelect?.getAttribute('data-filter-attr') || '';
  const items = Array.from(target.querySelectorAll('.admin-collapse'));

  function applyFilter() {
    const q = String(input.value || '').toLowerCase().trim();
    const selectValue = linkedSelect ? String(linkedSelect.value || '').trim() : '';

    items.forEach((item) => {
      const text = item.textContent?.toLowerCase() || '';
      const textMatch = !q || text.includes(q);
      const selectMatch = !linkedSelect || !selectValue || (attrName && item.getAttribute(attrName) === selectValue);
      item.style.display = textMatch && selectMatch ? '' : 'none';
    });
  }

  input.addEventListener('input', applyFilter);
  if (linkedSelect) linkedSelect.addEventListener('change', applyFilter);
}

let activeImageInput = null;
let activeMediaInput = null;

async function uploadFileToEndpoint(file, endpoint, targetInput, statusEl) {
  if (!file) return;
  statusEl.textContent = 'Uploading...';
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const payload = {
      dataUrl,
      filename: (file.name || targetInput.name || 'upload').replace(/[^a-z0-9._-]/gi, '-')
    };
    const result = await postJson(endpoint, payload);
    targetInput.value = result.url;
    statusEl.textContent = `Uploaded: ${result.url}`;
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function attachUploadTools(selector, options) {
  const inputs = Array.from(document.querySelectorAll(selector));
  for (const input of inputs) {
    input.addEventListener('focus', () => {
      if (selector === 'input.image-input') activeImageInput = input;
      if (selector === 'input.media-input') activeMediaInput = input;
    });

    const group = document.createElement('div');
    group.className = 'image-tools';

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn';
    uploadBtn.textContent = options.buttonText || 'Upload';

    const hiddenPicker = document.createElement('input');
    hiddenPicker.type = 'file';
    hiddenPicker.accept = options.accept;
    hiddenPicker.style.display = 'none';

    const pasteArea = document.createElement('div');
    pasteArea.className = 'paste-box';
    pasteArea.tabIndex = 0;
    pasteArea.textContent = options.pasteHint;

    const status = document.createElement('div');
    status.className = 'upload-status';

    uploadBtn.addEventListener('click', () => hiddenPicker.click());
    hiddenPicker.addEventListener('change', async () => {
      const file = hiddenPicker.files?.[0];
      await uploadFileToEndpoint(file, options.endpoint, input, status);
      hiddenPicker.value = '';
    });

    pasteArea.addEventListener('paste', async (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const targetItem = items.find((item) => options.match(item.type));
      if (!targetItem) {
        status.textContent = 'No supported media found in clipboard.';
        return;
      }
      const file = targetItem.getAsFile();
      await uploadFileToEndpoint(file, options.endpoint, input, status);
    });

    group.append(uploadBtn, hiddenPicker, pasteArea, status);
    input.insertAdjacentElement('afterend', group);
  }
}

attachUploadTools('input.image-input', {
  accept: 'image/*',
  endpoint: '/api/admin/upload-image',
  buttonText: 'Upload Image',
  pasteHint: 'Click here then Cmd+V / Ctrl+V to paste screenshot',
  match: (type) => type.startsWith('image/')
});

attachUploadTools('input.media-input', {
  accept: 'video/*,image/*',
  endpoint: '/api/admin/upload-media',
  buttonText: 'Upload Video/Image',
  pasteHint: 'Click here then Cmd+V / Ctrl+V to paste media',
  match: (type) => type.startsWith('video/') || type.startsWith('image/')
});

document.addEventListener('paste', async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  const mediaItem = items.find((item) => item.type.startsWith('video/')) || imageItem;

  if (activeMediaInput && mediaItem) {
    event.preventDefault();
    const file = mediaItem.getAsFile();
    const status = activeMediaInput.parentElement?.querySelector('.upload-status');
    await uploadFileToEndpoint(file, '/api/admin/upload-media', activeMediaInput, status || { textContent: '' });
    return;
  }

  if (activeImageInput && imageItem) {
    event.preventDefault();
    const file = imageItem.getAsFile();
    const status = activeImageInput.parentElement?.querySelector('.upload-status');
    await uploadFileToEndpoint(file, '/api/admin/upload-image', activeImageInput, status || { textContent: '' });
  }
});

const richEditorMap = new Map();
const richTextareas = Array.from(document.querySelectorAll('textarea[data-rich-editor]'));

function escapeToHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function plainTextToHtml(text) {
  const safe = escapeToHtml(text);
  return safe
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replaceAll('\n', '<br />')}</p>`;
    })
    .join('');
}

function insertHtmlAtCursor(html) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const fragment = document.createDocumentFragment();
  let node;
  let lastNode = null;
  while ((node = wrapper.firstChild)) {
    lastNode = fragment.appendChild(node);
  }
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

async function uploadDataUrlAndGetLocalUrl(dataUrl, filename = 'pasted-image') {
  const result = await postJson('/api/admin/upload-image', { dataUrl, filename });
  return result.url;
}

async function importImageUrlAndGetLocalUrl(url) {
  const result = await postJson('/api/admin/import-image-url', { url });
  return result.url;
}

function getCandidateImageSrc(img) {
  const srcAttr = String(img.getAttribute('src') || '').trim();
  if (srcAttr) return srcAttr;

  const dataSrc = String(img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-url') || '').trim();
  if (dataSrc) return dataSrc;

  const srcset = String(img.getAttribute('srcset') || '').trim();
  if (srcset) {
    const first = srcset
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .find(Boolean);
    if (first) return first;
  }
  return '';
}

function normalizeImageSrc(src, sourceOrigin = '') {
  const value = String(src || '').trim();
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/') && sourceOrigin) return `${sourceOrigin}${value}`;
  return value;
}

function normalizeElementInlineSize(element) {
  if (!element || !element.removeAttribute) return;
  element.removeAttribute('width');
  element.removeAttribute('height');
  const rawStyle = String(element.getAttribute('style') || '').trim();
  if (!rawStyle) return;

  const styleHolder = document.createElement('span');
  styleHolder.setAttribute('style', rawStyle);
  styleHolder.style.removeProperty('width');
  styleHolder.style.removeProperty('min-width');
  styleHolder.style.removeProperty('max-width');
  styleHolder.style.removeProperty('height');
  styleHolder.style.removeProperty('min-height');
  styleHolder.style.removeProperty('max-height');
  styleHolder.style.removeProperty('font-size');
  styleHolder.style.removeProperty('line-height');

  const normalizedStyle = styleHolder.getAttribute('style');
  if (normalizedStyle && normalizedStyle.trim()) {
    element.setAttribute('style', normalizedStyle);
  } else {
    element.removeAttribute('style');
  }
}

function normalizeTableSizing(root) {
  if (!root || !root.querySelectorAll) return;
  const sizeTargets = root.querySelectorAll('table, thead, tbody, tr, th, td, colgroup, col, img');
  sizeTargets.forEach((el) => normalizeElementInlineSize(el));
}

function wrapTablesForScroll(root) {
  if (!root || !root.querySelectorAll) return;
  const tables = Array.from(root.querySelectorAll('table'));
  for (const table of tables) {
    const parent = table.parentElement;
    if (!parent) continue;
    if (parent.classList.contains('table-scroll')) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
}

function getPasteSourceOrigin(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const candidates = Array.from(temp.querySelectorAll('a[href], img[src], img[data-src], img[data-original]'));
  for (const node of candidates) {
    const href = node.getAttribute?.('href');
    const src = node.getAttribute?.('src') || node.getAttribute?.('data-src') || node.getAttribute?.('data-original');
    const target = String(href || src || '').trim();
    if (!/^https?:\/\//i.test(target)) continue;
    try {
      const u = new URL(target);
      return `${u.protocol}//${u.host}`;
    } catch {
      continue;
    }
  }
  return '';
}

async function uploadClipboardImageFile(file, index = 0) {
  const dataUrl = await readFileAsDataUrl(file);
  return uploadDataUrlAndGetLocalUrl(dataUrl, `clipboard-image-${index + 1}`);
}

async function processPastedHtml(html, clipboardItems = []) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  normalizeTableSizing(doc.body);
  const imgs = Array.from(doc.querySelectorAll('img'));
  const sourceOrigin = getPasteSourceOrigin(html);
  const imageFiles = clipboardItems
    .filter((item) => item.type && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  let fallbackIndex = 0;

  for (const img of imgs) {
    const rawSrc = getCandidateImageSrc(img);
    const src = normalizeImageSrc(rawSrc, sourceOrigin);

    if (!src && imageFiles[fallbackIndex]) {
      try {
        const localUrl = await uploadClipboardImageFile(imageFiles[fallbackIndex], fallbackIndex);
        fallbackIndex += 1;
        img.setAttribute('src', localUrl);
        continue;
      } catch {
        fallbackIndex += 1;
      }
    }

    if (!src) continue;

    try {
      if (src.startsWith('/uploads/') || src.startsWith('/images/')) {
        img.setAttribute('src', src);
        continue;
      }

      if (src.startsWith('data:image/')) {
        const localUrl = await uploadDataUrlAndGetLocalUrl(src, 'pasted-data-image');
        img.setAttribute('src', localUrl);
        continue;
      }

      if (/^https?:\/\//i.test(src)) {
        const localUrl = await importImageUrlAndGetLocalUrl(src);
        img.setAttribute('src', localUrl);
        continue;
      }

      if (src.startsWith('blob:')) {
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], 'blob-pasted-image', { type: blob.type || 'image/png' });
        const dataUrl = await readFileAsDataUrl(file);
        const localUrl = await uploadDataUrlAndGetLocalUrl(dataUrl, 'blob-pasted-image');
        img.setAttribute('src', localUrl);
      }
    } catch (error) {
      if (imageFiles[fallbackIndex]) {
        try {
          const localUrl = await uploadClipboardImageFile(imageFiles[fallbackIndex], fallbackIndex);
          fallbackIndex += 1;
          img.setAttribute('src', localUrl);
          continue;
        } catch {
          fallbackIndex += 1;
        }
      }

      if (/^https?:\/\//i.test(src)) {
        // Keep absolute URL as last fallback.
        img.setAttribute('src', src);
      }
    }
  }

  return doc.body.innerHTML;
}

for (const textarea of richTextareas) {
  const editor = textarea.closest('.markdown-editor');
  if (!editor) continue;
  const toolbar = editor.querySelector('.markdown-toolbar');
  const value = String(textarea.value || '');
  const looksHtml = /<[a-z][\s\S]*>/i.test(value.trim());

  const surface = document.createElement('div');
  surface.className = 'rich-surface';
  surface.contentEditable = 'true';
  surface.setAttribute('data-expandable', '');
  surface.innerHTML = looksHtml ? value : plainTextToHtml(value);

  textarea.style.display = 'none';
  textarea.insertAdjacentElement('beforebegin', surface);
  richEditorMap.set(textarea.id || textarea.name || `r-${Math.random()}`, { textarea, surface, editor });

  if (toolbar) {
    let selectedImage = null;
    let selectedTable = null;
    let isResizingImage = false;
    let isResizingTable = false;
    const resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'image-resize-overlay';
    document.body.appendChild(resizeOverlay);
    const handleDefs = [
      { dir: 'nw', cursor: 'nwse-resize' },
      { dir: 'n', cursor: 'ns-resize' },
      { dir: 'ne', cursor: 'nesw-resize' },
      { dir: 'e', cursor: 'ew-resize' },
      { dir: 'se', cursor: 'nwse-resize' },
      { dir: 's', cursor: 'ns-resize' },
      { dir: 'sw', cursor: 'nesw-resize' },
      { dir: 'w', cursor: 'ew-resize' }
    ];
    const resizeHandles = handleDefs.map((def) => {
      const el = document.createElement('div');
      el.className = 'image-resize-handle';
      el.setAttribute('data-dir', def.dir);
      el.style.cursor = def.cursor;
      document.body.appendChild(el);
      return el;
    });
    const tableResizeHandle = document.createElement('div');
    tableResizeHandle.className = 'table-resize-handle';
    document.body.appendChild(tableResizeHandle);

    function updateSourceValue() {
      textarea.value = surface.innerHTML;
    }

    function getSurfaceSelectionRange() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      if (!surface.contains(ancestor)) return null;
      return { selection, range };
    }

    function applySelectedTextSize(sizePx) {
      const safeSize = Math.max(10, Math.min(48, Number(sizePx) || 13));
      const picked = getSurfaceSelectionRange();
      if (!picked || picked.range.collapsed) return;
      const { selection, range } = picked;
      const span = document.createElement('span');
      span.style.fontSize = `${safeSize}px`;
      span.style.lineHeight = '1.45';
      try {
        range.surroundContents(span);
      } catch {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      updateSourceValue();
    }

    function applyFontSizeToElements(elements, sizePx) {
      const safeSize = Math.max(10, Math.min(48, Number(sizePx) || 13));
      elements.forEach((el) => {
        el.style.fontSize = `${safeSize}px`;
        el.style.lineHeight = '1.45';
      });
      updateSourceValue();
    }

    function applyBlockTextSize(sizePx) {
      const picked = getSurfaceSelectionRange();
      if (!picked) return;
      const { range } = picked;
      const blocks = Array.from(surface.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre'));
      const targets = blocks.filter((el) => range.intersectsNode(el));
      if (targets.length) {
        applyFontSizeToElements(targets, sizePx);
        return;
      }
      const fallback =
        (range.startContainer instanceof Element
          ? range.startContainer.closest('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre')
          : range.startContainer.parentElement?.closest('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre')) || null;
      if (fallback) applyFontSizeToElements([fallback], sizePx);
    }

    function applyAllTextSize(sizePx) {
      const blocks = Array.from(surface.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre'));
      if (!blocks.length) {
        surface.style.fontSize = `${Math.max(10, Math.min(48, Number(sizePx) || 13))}px`;
        updateSourceValue();
        return;
      }
      applyFontSizeToElements(blocks, sizePx);
    }

    function setHandlePosition(handle, x, y) {
      handle.style.left = `${Math.round(x - 5)}px`;
      handle.style.top = `${Math.round(y - 5)}px`;
      handle.style.display = 'block';
    }

    function hideResizeTools() {
      resizeOverlay.style.display = 'none';
      resizeHandles.forEach((h) => {
        h.style.display = 'none';
      });
    }

    function updateTableResizeHandlePosition() {
      if (!selectedTable || !selectedTable.isConnected || !surface.contains(selectedTable)) {
        tableResizeHandle.style.display = 'none';
        return;
      }
      const rect = selectedTable.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) {
        tableResizeHandle.style.display = 'none';
        return;
      }
      tableResizeHandle.style.left = `${Math.round(rect.right - 5)}px`;
      tableResizeHandle.style.top = `${Math.round(rect.bottom - 5)}px`;
      tableResizeHandle.style.display = 'block';
    }

    function updateResizeHandlePosition() {
      if (!selectedImage || !selectedImage.isConnected || !surface.contains(selectedImage)) {
        hideResizeTools();
        return;
      }
      const rect = selectedImage.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) {
        hideResizeTools();
        return;
      }
      resizeOverlay.style.left = `${Math.round(rect.left)}px`;
      resizeOverlay.style.top = `${Math.round(rect.top)}px`;
      resizeOverlay.style.width = `${Math.round(rect.width)}px`;
      resizeOverlay.style.height = `${Math.round(rect.height)}px`;
      resizeOverlay.style.display = 'block';

      setHandlePosition(resizeHandles[0], rect.left, rect.top);
      setHandlePosition(resizeHandles[1], rect.left + rect.width / 2, rect.top);
      setHandlePosition(resizeHandles[2], rect.right, rect.top);
      setHandlePosition(resizeHandles[3], rect.right, rect.top + rect.height / 2);
      setHandlePosition(resizeHandles[4], rect.right, rect.bottom);
      setHandlePosition(resizeHandles[5], rect.left + rect.width / 2, rect.bottom);
      setHandlePosition(resizeHandles[6], rect.left, rect.bottom);
      setHandlePosition(resizeHandles[7], rect.left, rect.top + rect.height / 2);
    }

    function clearSelectedImage() {
      if (selectedImage) selectedImage.classList.remove('is-selected-image');
      selectedImage = null;
      imgSizeInput.value = '';
      hideResizeTools();
    }

    function clearSelectedTable() {
      if (selectedTable) selectedTable.classList.remove('is-selected-table');
      selectedTable = null;
      tableSizeInput.value = '';
      tableResizeHandle.style.display = 'none';
    }

    function selectImage(img) {
      if (!img) return;
      clearSelectedImage();
      selectedImage = img;
      selectedImage.classList.add('is-selected-image');
      const widthValue = String(selectedImage.style.width || '').trim();
      const match = widthValue.match(/^(\d+(?:\.\d+)?)%$/);
      if (match) {
        imgSizeInput.value = String(Math.round(Number(match[1])));
      } else {
        const pxMatch = widthValue.match(/^(\d+(?:\.\d+)?)px$/);
        const parentWidth = selectedImage.parentElement?.getBoundingClientRect().width || 0;
        imgSizeInput.value =
          pxMatch && parentWidth ? String(Math.max(1, Math.min(100, Math.round((Number(pxMatch[1]) / parentWidth) * 100)))) : '';
      }
      updateResizeHandlePosition();
    }

    function selectTable(table) {
      if (!table) return;
      clearSelectedTable();
      selectedTable = table;
      selectedTable.classList.add('is-selected-table');
      const widthValue = String(selectedTable.style.width || '').trim();
      const matchPct = widthValue.match(/^(\d+(?:\.\d+)?)%$/);
      const matchPx = widthValue.match(/^(\d+(?:\.\d+)?)px$/);
      const parentWidth = surface.getBoundingClientRect().width || 0;
      if (matchPct) {
        tableSizeInput.value = String(Math.round(Number(matchPct[1])));
      } else if (matchPx && parentWidth) {
        tableSizeInput.value = String(Math.max(1, Math.round((Number(matchPx[1]) / parentWidth) * 100)));
      } else {
        tableSizeInput.value = '';
      }
      updateTableResizeHandlePosition();
    }

    function applyImageWidth(percent) {
      if (!selectedImage) return;
      const safe = Math.max(10, Math.min(100, Number(percent) || 100));
      selectedImage.style.width = `${safe}%`;
      selectedImage.style.maxWidth = '100%';
      selectedImage.style.height = 'auto';
      updateSourceValue();
      updateResizeHandlePosition();
    }

    function applyImageAlign(mode) {
      if (!selectedImage) return;
      selectedImage.style.display = 'block';
      selectedImage.style.float = 'none';
      if (mode === 'left') {
        selectedImage.style.marginLeft = '0';
        selectedImage.style.marginRight = 'auto';
      } else if (mode === 'right') {
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = '0';
      } else {
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = 'auto';
      }
      updateSourceValue();
      updateResizeHandlePosition();
    }

    function resetImageSize() {
      if (!selectedImage) return;
      selectedImage.style.removeProperty('width');
      selectedImage.style.removeProperty('height');
      selectedImage.style.removeProperty('max-width');
      selectedImage.style.removeProperty('display');
      selectedImage.style.removeProperty('margin-left');
      selectedImage.style.removeProperty('margin-right');
      selectedImage.style.removeProperty('float');
      updateSourceValue();
      updateResizeHandlePosition();
    }

    function applyTableWidth(percent) {
      if (!selectedTable) return;
      const safe = Math.max(30, Math.min(200, Number(percent) || 100));
      selectedTable.style.width = `${safe}%`;
      selectedTable.style.minWidth = '0';
      selectedTable.style.maxWidth = 'none';
      updateSourceValue();
      updateTableResizeHandlePosition();
    }

    function resetTableSize() {
      if (!selectedTable) return;
      selectedTable.style.removeProperty('width');
      selectedTable.style.removeProperty('min-width');
      selectedTable.style.removeProperty('max-width');
      selectedTable.style.removeProperty('table-layout');
      updateSourceValue();
      updateTableResizeHandlePosition();
    }

    const imageSizeTools = document.createElement('div');
    imageSizeTools.className = 'image-size-tools';

    const imgSmBtn = document.createElement('button');
    imgSmBtn.type = 'button';
    imgSmBtn.className = 'btn';
    imgSmBtn.textContent = '小图';

    const imgMdBtn = document.createElement('button');
    imgMdBtn.type = 'button';
    imgMdBtn.className = 'btn';
    imgMdBtn.textContent = '中图';

    const imgLgBtn = document.createElement('button');
    imgLgBtn.type = 'button';
    imgLgBtn.className = 'btn';
    imgLgBtn.textContent = '大图';

    const imgFullBtn = document.createElement('button');
    imgFullBtn.type = 'button';
    imgFullBtn.className = 'btn';
    imgFullBtn.textContent = '满宽';

    const imgResetBtn = document.createElement('button');
    imgResetBtn.type = 'button';
    imgResetBtn.className = 'btn';
    imgResetBtn.textContent = '原始';

    const imgAlignLeftBtn = document.createElement('button');
    imgAlignLeftBtn.type = 'button';
    imgAlignLeftBtn.className = 'btn';
    imgAlignLeftBtn.textContent = '左对齐';

    const imgAlignCenterBtn = document.createElement('button');
    imgAlignCenterBtn.type = 'button';
    imgAlignCenterBtn.className = 'btn';
    imgAlignCenterBtn.textContent = '居中';

    const imgAlignRightBtn = document.createElement('button');
    imgAlignRightBtn.type = 'button';
    imgAlignRightBtn.className = 'btn';
    imgAlignRightBtn.textContent = '右对齐';

    const imgSizeInput = document.createElement('input');
    imgSizeInput.type = 'number';
    imgSizeInput.className = 'image-size-input';
    imgSizeInput.min = '10';
    imgSizeInput.max = '100';
    imgSizeInput.step = '1';
    imgSizeInput.placeholder = '宽度%';
    imgSizeInput.title = '图片宽度百分比';

    imageSizeTools.append(
      imgSmBtn,
      imgMdBtn,
      imgLgBtn,
      imgFullBtn,
      imgAlignLeftBtn,
      imgAlignCenterBtn,
      imgAlignRightBtn,
      imgResetBtn,
      imgSizeInput
    );

    const fitTableBtn = document.createElement('button');
    fitTableBtn.type = 'button';
    fitTableBtn.className = 'btn';
    fitTableBtn.textContent = '表格适配';

    const tableSizeTools = document.createElement('div');
    tableSizeTools.className = 'table-size-tools';

    const textSizeTools = document.createElement('div');
    textSizeTools.className = 'text-size-tools';

    const textSizeInput = document.createElement('input');
    textSizeInput.type = 'number';
    textSizeInput.className = 'text-size-input';
    textSizeInput.min = '10';
    textSizeInput.max = '48';
    textSizeInput.step = '1';
    textSizeInput.value = '13';
    textSizeInput.title = '选中文字字号（px）';

    const textSizeApplyBtn = document.createElement('button');
    textSizeApplyBtn.type = 'button';
    textSizeApplyBtn.className = 'btn';
    textSizeApplyBtn.textContent = '字号应用';

    const textSizeBlockBtn = document.createElement('button');
    textSizeBlockBtn.type = 'button';
    textSizeBlockBtn.className = 'btn';
    textSizeBlockBtn.textContent = '整段字号';

    const textSizeAllBtn = document.createElement('button');
    textSizeAllBtn.type = 'button';
    textSizeAllBtn.className = 'btn';
    textSizeAllBtn.textContent = '整篇字号';

    textSizeTools.append(textSizeInput, textSizeApplyBtn, textSizeBlockBtn, textSizeAllBtn);

    const tableNarrowBtn = document.createElement('button');
    tableNarrowBtn.type = 'button';
    tableNarrowBtn.className = 'btn';
    tableNarrowBtn.textContent = '表格70%';

    const tableNormalBtn = document.createElement('button');
    tableNormalBtn.type = 'button';
    tableNormalBtn.className = 'btn';
    tableNormalBtn.textContent = '表格100%';

    const tableWideBtn = document.createElement('button');
    tableWideBtn.type = 'button';
    tableWideBtn.className = 'btn';
    tableWideBtn.textContent = '表格130%';

    const tableResetBtn = document.createElement('button');
    tableResetBtn.type = 'button';
    tableResetBtn.className = 'btn';
    tableResetBtn.textContent = '重置表格';

    const tableSizeInput = document.createElement('input');
    tableSizeInput.type = 'number';
    tableSizeInput.className = 'table-size-input';
    tableSizeInput.min = '30';
    tableSizeInput.max = '200';
    tableSizeInput.step = '1';
    tableSizeInput.placeholder = '表格%';
    tableSizeInput.title = '表格宽度百分比';

    tableSizeTools.append(tableNarrowBtn, tableNormalBtn, tableWideBtn, tableResetBtn, tableSizeInput);

    const imgBtn = document.createElement('button');
    imgBtn.type = 'button';
    imgBtn.className = 'btn';
    imgBtn.textContent = '插入图片';
    toolbar.prepend(textSizeTools);
    toolbar.prepend(tableSizeTools);
    toolbar.prepend(imageSizeTools);
    toolbar.prepend(fitTableBtn);
    toolbar.prepend(imgBtn);

    const hiddenPicker = document.createElement('input');
    hiddenPicker.type = 'file';
    hiddenPicker.accept = 'image/*';
    hiddenPicker.style.display = 'none';
    toolbar.prepend(hiddenPicker);

    imgBtn.addEventListener('click', () => hiddenPicker.click());
    imgSmBtn.addEventListener('click', () => applyImageWidth(30));
    imgMdBtn.addEventListener('click', () => applyImageWidth(50));
    imgLgBtn.addEventListener('click', () => applyImageWidth(75));
    imgFullBtn.addEventListener('click', () => applyImageWidth(100));
    imgAlignLeftBtn.addEventListener('click', () => applyImageAlign('left'));
    imgAlignCenterBtn.addEventListener('click', () => applyImageAlign('center'));
    imgAlignRightBtn.addEventListener('click', () => applyImageAlign('right'));
    imgResetBtn.addEventListener('click', resetImageSize);
    imgSizeInput.addEventListener('change', () => applyImageWidth(imgSizeInput.value));
    tableNarrowBtn.addEventListener('click', () => applyTableWidth(70));
    tableNormalBtn.addEventListener('click', () => applyTableWidth(100));
    tableWideBtn.addEventListener('click', () => applyTableWidth(130));
    tableResetBtn.addEventListener('click', resetTableSize);
    tableSizeInput.addEventListener('change', () => applyTableWidth(tableSizeInput.value));
    textSizeApplyBtn.addEventListener('click', () => applySelectedTextSize(textSizeInput.value));
    textSizeBlockBtn.addEventListener('click', () => applyBlockTextSize(textSizeInput.value));
    textSizeAllBtn.addEventListener('click', () => applyAllTextSize(textSizeInput.value));
    textSizeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applySelectedTextSize(textSizeInput.value);
      }
    });

    fitTableBtn.addEventListener('click', () => {
      normalizeTableSizing(surface);
      wrapTablesForScroll(surface);
      if (selectedTable && surface.contains(selectedTable)) {
        selectedTable.style.width = '100%';
        selectedTable.style.tableLayout = 'fixed';
      }
      updateSourceValue();
      updateTableResizeHandlePosition();
    });
    hiddenPicker.addEventListener('change', async () => {
      const file = hiddenPicker.files?.[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const result = await postJson('/api/admin/upload-image', { dataUrl, filename: file.name || 'pasted-image' });
      insertHtmlAtCursor(`<img src="${result.url}" alt="" />`);
      updateSourceValue();
      hiddenPicker.value = '';
    });

    function startResizeWithDirection(direction, event) {
      if (!selectedImage) return;
      event.preventDefault();
      event.stopPropagation();
      isResizingImage = true;

      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = selectedImage.getBoundingClientRect();
      const parentWidth = selectedImage.parentElement?.getBoundingClientRect().width || startRect.width;
      const ratio = startRect.width / Math.max(1, startRect.height);

      function onMove(moveEvent) {
        if (!selectedImage || !isResizingImage) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const keepRatio = !moveEvent.shiftKey;
        const minW = 40;
        const minH = 30;

        let nextWidth = startRect.width;
        let nextHeight = startRect.height;

        if (direction.includes('e')) nextWidth = startRect.width + dx;
        if (direction.includes('w')) nextWidth = startRect.width - dx;
        if (direction.includes('s')) nextHeight = startRect.height + dy;
        if (direction.includes('n')) nextHeight = startRect.height - dy;

        nextWidth = Math.max(minW, Math.min(parentWidth, nextWidth));
        nextHeight = Math.max(minH, nextHeight);

        if (keepRatio) {
          if (direction === 'n' || direction === 's') {
            nextWidth = nextHeight * ratio;
          } else {
            nextHeight = nextWidth / ratio;
          }
          nextWidth = Math.max(minW, Math.min(parentWidth, nextWidth));
          nextHeight = Math.max(minH, nextWidth / ratio);
          selectedImage.style.width = `${Math.round(nextWidth)}px`;
          selectedImage.style.height = 'auto';
        } else {
          selectedImage.style.width = `${Math.round(nextWidth)}px`;
          selectedImage.style.height = `${Math.round(nextHeight)}px`;
        }

        selectedImage.style.maxWidth = '100%';
        imgSizeInput.value = parentWidth ? String(Math.max(1, Math.min(100, Math.round((nextWidth / parentWidth) * 100)))) : '';
        updateResizeHandlePosition();
      }

      function onUp() {
        isResizingImage = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        updateSourceValue();
        updateResizeHandlePosition();
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    resizeHandles.forEach((handle) => {
      const direction = handle.getAttribute('data-dir') || 'se';
      handle.addEventListener('mousedown', (event) => startResizeWithDirection(direction, event));
    });

    tableResizeHandle.addEventListener('mousedown', (event) => {
      if (!selectedTable) return;
      event.preventDefault();
      event.stopPropagation();
      isResizingTable = true;

      const startX = event.clientX;
      const startRect = selectedTable.getBoundingClientRect();
      const startWidth = startRect.width;
      const parentWidth = Math.max(surface.getBoundingClientRect().width, 1);
      const maxWidth = parentWidth * 2;

      function onMove(moveEvent) {
        if (!selectedTable || !isResizingTable) return;
        const dx = moveEvent.clientX - startX;
        const nextWidth = Math.max(120, Math.min(maxWidth, startWidth + dx));
        selectedTable.style.width = `${Math.round(nextWidth)}px`;
        selectedTable.style.minWidth = '0';
        selectedTable.style.maxWidth = 'none';
        tableSizeInput.value = String(Math.max(1, Math.min(200, Math.round((nextWidth / parentWidth) * 100))));
        updateTableResizeHandlePosition();
      }

      function onUp() {
        isResizingTable = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        updateSourceValue();
        updateTableResizeHandlePosition();
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    surface.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) {
        selectImage(target);
        clearSelectedTable();
      } else if (target instanceof Element) {
        const table = target.closest('table');
        if (table && surface.contains(table)) {
          selectTable(table);
          clearSelectedImage();
        } else {
          clearSelectedImage();
          clearSelectedTable();
        }
      } else {
        clearSelectedImage();
        clearSelectedTable();
      }
    });

    surface.addEventListener('dblclick', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      selectImage(target);
      resetImageSize();
    });

    surface.addEventListener('keyup', () => {
      if (selectedImage && !surface.contains(selectedImage)) clearSelectedImage();
      if (selectedTable && !surface.contains(selectedTable)) clearSelectedTable();
      updateResizeHandlePosition();
      updateTableResizeHandlePosition();
    });

    surface.addEventListener('scroll', updateResizeHandlePosition, { passive: true });
    surface.addEventListener('scroll', updateTableResizeHandlePosition, { passive: true });
    window.addEventListener('scroll', updateResizeHandlePosition, { passive: true });
    window.addEventListener('scroll', updateTableResizeHandlePosition, { passive: true });
    window.addEventListener('resize', updateResizeHandlePosition);
    window.addEventListener('resize', updateTableResizeHandlePosition);
    document.addEventListener('selectionchange', () => {
      if (selectedImage && !isResizingImage) updateResizeHandlePosition();
      if (selectedTable && !isResizingTable) updateTableResizeHandlePosition();
    });
  }

  surface.addEventListener('input', () => {
    textarea.value = surface.innerHTML;
  });

  surface.addEventListener('paste', async (event) => {
    const html = event.clipboardData?.getData('text/html');
    if (html) {
      event.preventDefault();
      const items = Array.from(event.clipboardData?.items || []);
      const processed = await processPastedHtml(html, items);
      insertHtmlAtCursor(processed);
      normalizeTableSizing(surface);
      wrapTablesForScroll(surface);
      textarea.value = surface.innerHTML;
      return;
    }

    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const result = await postJson('/api/admin/upload-image', { dataUrl, filename: 'clipboard-image' });
    insertHtmlAtCursor(`<img src="${result.url}" alt="" />`);
    textarea.value = surface.innerHTML;
  });
}

const formsWithRich = new Set(richTextareas.map((t) => t.closest('form')).filter(Boolean));
for (const form of formsWithRich) {
  form.addEventListener('submit', () => {
    const areas = Array.from(form.querySelectorAll('textarea[data-rich-editor]'));
    areas.forEach((area) => {
      const editor = area.closest('.markdown-editor');
      const surface = editor?.querySelector('.rich-surface');
      if (surface) area.value = surface.innerHTML;
    });
  });
}

const editorToggles = Array.from(document.querySelectorAll('.editor-toggle'));
let activeFullscreenEditor = null;

function setEditorFullscreen(editor, on) {
  const textarea = editor.querySelector('textarea[data-expandable]');
  const toggleBtn = editor.querySelector('.editor-toggle');
  if (!textarea || !toggleBtn) return;
  const surface = editor.querySelector('.rich-surface');

  if (on) {
    editor.classList.add('is-fullscreen');
    document.body.classList.add('no-scroll');
    toggleBtn.textContent = '退出全屏';
    if (surface) {
      surface.focus();
    } else {
      textarea.focus();
    }
    activeFullscreenEditor = editor;
  } else {
    editor.classList.remove('is-fullscreen');
    document.body.classList.remove('no-scroll');
    toggleBtn.textContent = '全屏编辑';
    activeFullscreenEditor = null;
  }
}

const markdownBodies = Array.from(document.querySelectorAll('.markdown-body'));
for (const body of markdownBodies) {
  wrapTablesForScroll(body);
}

for (const btn of editorToggles) {
  btn.addEventListener('click', () => {
    const editor = btn.closest('.markdown-editor');
    if (!editor) return;
    const on = !editor.classList.contains('is-fullscreen');
    if (activeFullscreenEditor && activeFullscreenEditor !== editor) {
      setEditorFullscreen(activeFullscreenEditor, false);
    }
    setEditorFullscreen(editor, on);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeFullscreenEditor) {
    setEditorFullscreen(activeFullscreenEditor, false);
    return;
  }
  if (event.key === 'Escape' && videoModal && videoModal.getAttribute('aria-hidden') === 'false') {
    closeVideoModal();
  }
});

const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const slides = Array.from(carousel.querySelectorAll('[data-slide]'));
  const dotsWrap = carousel.querySelector('[data-dots]');
  let index = 0;
  let timer = null;

  function renderDots() {
    if (!dotsWrap || slides.length <= 1) return;
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      if (i === index) dot.classList.add('active');
      dot.addEventListener('click', () => {
        index = i;
        show(index);
        restart();
      });
      dotsWrap.appendChild(dot);
    });
  }

  function show(i) {
    slides.forEach((slide, idx) => slide.classList.toggle('active', idx === i));
    renderDots();
  }

  function restart() {
    if (timer) clearInterval(timer);
    if (slides.length > 1) {
      timer = setInterval(() => {
        index = (index + 1) % slides.length;
        show(index);
      }, 5000);
    }
  }

  show(index);
  restart();
}

const videoModal = document.getElementById('videoModal');
const videoModalPlayer = document.getElementById('videoModalPlayer');
const openVideoButtons = Array.from(document.querySelectorAll('[data-open-video]'));
const closeVideoButtons = Array.from(document.querySelectorAll('[data-video-close]'));

function closeVideoModal() {
  if (!videoModal || !videoModalPlayer) return;
  videoModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  videoModalPlayer.innerHTML = '';
}

function openVideoModal(btn) {
  if (!videoModal || !videoModalPlayer) return;
  const type = btn.getAttribute('data-video-type') || 'embed';
  const src = btn.getAttribute('data-video-src') || '';
  const poster = btn.getAttribute('data-video-poster') || '';
  const title = btn.getAttribute('data-video-title') || 'Video';
  if (!src) return;

  let node = null;
  if (type === 'file') {
    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.preload = 'metadata';
    videoEl.src = src;
    if (poster) videoEl.poster = poster;
    node = videoEl;
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    node = iframe;
  }

  videoModalPlayer.innerHTML = '';
  videoModalPlayer.appendChild(node);
  videoModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  openVideoButtons.forEach((x) => x.classList.toggle('active', x === btn));
}

for (const btn of openVideoButtons) {
  btn.addEventListener('click', () => openVideoModal(btn));
}

for (const btn of closeVideoButtons) {
  btn.addEventListener('click', closeVideoModal);
}

const tocContainers = Array.from(document.querySelectorAll('[data-toc]'));
for (const toc of tocContainers) {
  const article = toc.closest('.markdown-body');
  if (!article) continue;
  const headings = Array.from(article.querySelectorAll('h2, h3'));
  if (!headings.length) {
    toc.style.display = 'none';
    continue;
  }

  const list = document.createElement('ul');
  list.className = 'toc-list';
  const seen = new Set();

  headings.forEach((heading, idx) => {
    let id = heading.id || heading.textContent?.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') || `sec-${idx + 1}`;
    if (seen.has(id)) id = `${id}-${idx + 1}`;
    seen.add(id);
    heading.id = id;

    const li = document.createElement('li');
    li.className = heading.tagName.toLowerCase() === 'h3' ? 'toc-sub' : '';
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = heading.textContent || `Section ${idx + 1}`;
    li.appendChild(a);
    list.appendChild(li);
  });

  const title = document.createElement('p');
  title.className = 'toc-title';
  title.textContent = '目录';
  toc.append(title, list);
}

const exportPdfButtons = Array.from(document.querySelectorAll('[data-export-pdf]'));

function buildExportHtml(title, contentHtml) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeToHtml(title)}</title>
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body { background:#fff; }
    .floating-contact, .topbar, .footer, .btn, [data-export-pdf] { display:none !important; }
    .container { max-width: 1120px; margin: 0 auto; }
    @page { size: auto; margin: 12mm; }
  </style>
</head>
<body>
  <main class="section">
    <div class="container">${contentHtml}</div>
  </main>
</body>
</html>`;
}

function exportTargetToPdf(btn) {
  const selector = btn.getAttribute('data-export-target') || '';
  const title = btn.getAttribute('data-export-title') || document.title || 'Export';
  const target = selector ? document.querySelector(selector) : null;
  if (!target) {
    window.print();
    return;
  }

  const cloned = target.cloneNode(true);
  const kill = cloned.querySelectorAll('[data-export-pdf], .floating-contact, .detail-inquiry');
  kill.forEach((node) => node.remove());
  const html = buildExportHtml(title, cloned.innerHTML);

  const win = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!win) {
    window.print();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 450);
}

for (const btn of exportPdfButtons) {
  btn.addEventListener('click', () => exportTargetToPdf(btn));
}
