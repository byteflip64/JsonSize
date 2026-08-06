let fetchedCoursesData = [];
let singleFetchedText = "";
let singlePartsInfo = null;
let pastePartsInfo = null;

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('gh_username');
    if (savedUser) {
        document.getElementById('usernameInput').value = savedUser;
    }
    onEditorInput();
});

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMinifiedJson(jsonStr) {
    try {
        return JSON.stringify(JSON.parse(jsonStr));
    } catch (e) {
        return null;
    }
}

// Checks if JSON string is already minified/compressed
function isAlreadyCompressed(rawStr) {
    if (!rawStr || !rawStr.trim()) return false;
    const minified = getMinifiedJson(rawStr);
    if (!minified) return false;
    return rawStr.trim() === minified.trim();
}

function getSavingsText(rawBytes, compBytes) {
    if (!rawBytes || rawBytes === 0) return '';
    const saved = rawBytes - compBytes;
    if (saved <= 0) return `<span class="savings-tag">Already compressed</span>`;
    const pct = ((saved / rawBytes) * 100).toFixed(1);
    return `<span class="savings-tag">-${pct}% saved</span>`;
}

function normalizeUrl(url) {
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

function getPartsInfo(data) {
    if (!data || typeof data !== 'object') return { countStr: 'N/A', countNum: 0, partsList: [] };

    const keys = ['parts', 'modules', 'lessons', 'sections', 'topics', 'chapters'];

    for (let k of keys) {
        if (Array.isArray(data[k])) {
            const partsList = data[k].map((item, idx) => ({
                index: idx + 1,
                title: item.partTitle || item.title || `Part ${idx + 1}`,
                badge: item.badge || '—'
            }));

            return {
                countStr: `${data[k].length} ${k}`,
                countNum: data[k].length,
                partsList: partsList,
                arrayKey: k
            };
        }
    }

    return { countStr: 'No parts array found', countNum: 0, partsList: [], arrayKey: 'parts' };
}

function switchTab(e, tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.option-section').forEach(sec => sec.classList.remove('active'));

    if (e && e.target) {
        e.target.classList.add('active');
    } else {
        const btnId = tabId.replace('opt', 'tab') + '-btn';
        document.getElementById(btnId).classList.add('active');
    }

    document.getElementById(tabId).classList.add('active');
    hideError();
}

function showError(msg) {
    const err = document.getElementById('errorMsg');
    err.textContent = msg;
    err.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMsg').style.display = 'none';
}

function renderBadgeButton(containerId, partsInfo, onClickHandlerName) {
    const container = document.getElementById(containerId);
    if (partsInfo && partsInfo.partsList.length > 0) {
        container.innerHTML = `<span class="badge" onclick="${onClickHandlerName}">${partsInfo.countStr}</span>`;
    } else {
        container.innerHTML = `<span class="badge-disabled">${partsInfo ? partsInfo.countStr : 'N/A'}</span>`;
    }
}

/* SECTION 1: ANY URL */
document.getElementById('singleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const btn = document.getElementById('btnSingle');
    const resCard = document.getElementById('singleResult');

    btn.disabled = true;
    btn.textContent = 'Fetching...';
    resCard.style.display = 'none';

    try {
        const inputUrl = document.getElementById('urlInput').value.trim();
        const rawUrl = normalizeUrl(inputUrl);

        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        singleFetchedText = await response.text();
        const rawBytes = new Blob([singleFetchedText]).size;

        let validJson = true;
        let parsed = null;
        let compBytes = 0;

        try {
            parsed = JSON.parse(singleFetchedText);
            compBytes = new Blob([JSON.stringify(parsed)]).size;
        } catch {
            validJson = false;
        }

        document.getElementById('resSize').textContent = formatSize(rawBytes);
        document.getElementById('resCompSize').innerHTML = validJson
            ? `${formatSize(compBytes)} ${getSavingsText(rawBytes, compBytes)}`
            : 'N/A';

        document.getElementById('resStatus').textContent = validJson ? '✅ Valid' : '⚠️ Invalid JSON';
        document.getElementById('resStatus').style.color = validJson ? '#1f883d' : '#cf222e';

        singlePartsInfo = validJson ? getPartsInfo(parsed) : null;
        renderBadgeButton('resPartsContainer', singlePartsInfo, 'openSinglePartsModal()');

        // Check button state
        const compBtn = document.getElementById('btnCompSingle');
        if (validJson && isAlreadyCompressed(singleFetchedText)) {
            compBtn.textContent = '✓ Compressed';
            compBtn.disabled = true;
        } else {
            compBtn.textContent = '⚡ Compress';
            compBtn.disabled = false;
        }

        resCard.style.display = 'block';
    } catch (err) {
        showError(err.message || 'Failed to fetch the URL.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Check Size';
    }
});

function copySingleJson() {
    if (!singleFetchedText) return;
    navigator.clipboard.writeText(singleFetchedText).then(() => {
        const btn = document.getElementById('btnCopySingle');
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

function compressAndCopySingle() {
    if (!singleFetchedText) return;
    const minified = getMinifiedJson(singleFetchedText);
    if (!minified) return showError("Invalid JSON string.");

    navigator.clipboard.writeText(minified).then(() => {
        const btn = document.getElementById('btnCompSingle');
        btn.textContent = '✓ Compressed & Copied!';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = '✓ Compressed';
        }, 1500);
    });
}

function sendToEditor(source, id = null) {
    let jsonString = "";
    if (source === 'single') jsonString = singleFetchedText;
    else if (source === 'batch' && id !== null) {
        const course = fetchedCoursesData.find(c => c.id === id);
        if (course) jsonString = course.rawText;
    }

    if (!jsonString) return;

    document.getElementById('editorTextarea').value = jsonString;

    switchTab(null, 'opt3');
    onEditorInput();
}

/* SECTION 2: BATCH FETCH */
async function fetchAllCourses() {
    hideError();
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const saveOption = document.querySelector('input[name="saveOption"]:checked').value;

    if (!usernameInput) return showError('Please enter your GitHub username.');

    if (saveOption === 'local') localStorage.setItem('gh_username', usernameInput);
    else localStorage.removeItem('gh_username');

    const mainBaseUrl = `https://raw.githubusercontent.com/${usernameInput}/AsyncCodeData/main/Courses`;
    const manifestUrl = `${mainBaseUrl}/all-courses-files.json`;

    const btn = document.getElementById('btnBatch');
    const container = document.getElementById('batchContainer');
    const totalBox = document.getElementById('totalBox');
    const controlsBar = document.getElementById('controlsBar');

    btn.disabled = true;
    btn.textContent = 'Loading Course Manifest...';
    container.style.display = 'none';
    totalBox.style.display = 'none';
    controlsBar.style.display = 'none';

    try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error(`Could not load manifest for "${usernameInput}"`);

        const manifest = await res.json();
        const coursePaths = manifest.courses || [];
        if (!coursePaths.length) throw new Error('No course paths found inside "courses" array.');

        btn.textContent = `Fetching ${coursePaths.length} Files...`;
        let totalBytes = 0;

        const fetchPromises = coursePaths.map(async (path, index) => {
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            const fullRawUrl = `${mainBaseUrl}${cleanPath}`;
            const fileName = cleanPath.split('/').pop();

            try {
                const fRes = await fetch(fullRawUrl);
                if (!fRes.ok) throw new Error(`HTTP ${fRes.status}`);

                const text = await fRes.text();
                const bytes = new Blob([text]).size;
                let partsInfo = { countStr: 'N/A', countNum: 0, partsList: [] };
                let isCompressed = isAlreadyCompressed(text);

                try {
                    const parsed = JSON.parse(text);
                    partsInfo = getPartsInfo(parsed);
                } catch { }

                return { id: index, fileName, bytes, sizeStr: formatSize(bytes), partsInfo, rawText: text, url: fullRawUrl, isCompressed };
            } catch {
                return { id: index, fileName, bytes: 0, sizeStr: 'Error', partsInfo: { countStr: 'Error', countNum: 0, partsList: [] }, rawText: '', url: fullRawUrl, isCompressed: false };
            }
        });

        fetchedCoursesData = await Promise.all(fetchPromises);
        fetchedCoursesData.forEach(item => totalBytes += item.bytes);

        document.getElementById('totalSizeVal').textContent = formatSize(totalBytes);
        document.getElementById('totalCountVal').textContent = `${fetchedCoursesData.length} course files evaluated`;

        totalBox.style.display = 'block';
        controlsBar.style.display = 'flex';
        container.style.display = 'block';

        renderTable();
    } catch (err) {
        showError(err.message || 'Error occurred while processing courses.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Fetch All Courses & Calculate Total';
    }
}

function renderTable() {
    const tbody = document.getElementById('batchTbody');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const sortType = document.getElementById('sortSelect').value;

    tbody.innerHTML = '';

    let filtered = fetchedCoursesData.filter(item => item.fileName.toLowerCase().includes(searchQuery));

    filtered.sort((a, b) => {
        if (sortType === 'name') return a.fileName.localeCompare(b.fileName);
        if (sortType === 'size-desc') return b.bytes - a.bytes;
        if (sortType === 'size-asc') return a.bytes - b.bytes;
        if (sortType === 'parts-desc') return b.partsInfo.countNum - a.partsInfo.countNum;
        if (sortType === 'parts-asc') return a.partsInfo.countNum - b.partsInfo.countNum;
    });

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const badgeHtml = item.partsInfo.partsList.length > 0
            ? `<span class="badge" onclick="openBatchPartsModal(${item.id})">${item.partsInfo.countStr}</span>`
            : `<span class="badge-disabled">${item.partsInfo.countStr}</span>`;

        const compressBtnText = item.isCompressed ? '✓ Compressed' : '⚡ Compress';
        const compressBtnDisabled = item.isCompressed ? 'disabled' : '';

        tr.innerHTML = `
                  <td>
                    <a class="file-link" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.fileName} ↗</a>
                  </td>
                  <td>${badgeHtml}</td>
                  <td style="font-family: monospace;">${item.sizeStr}</td>
                  <td>
                    <div class="btn-group">
                      <button id="batchCompBtn-${item.id}" class="btn-sm btn-sm-purple" ${compressBtnDisabled} onclick="compressAndCopyBatch(${item.id})">${compressBtnText}</button>
                      <button id="batchCopyBtn-${item.id}" class="btn-sm" onclick="copyBatchRaw(${item.id})">📋 Copy</button>
                      <button class="icon-btn" title="Modify in Editor" onclick="sendToEditor('batch', ${item.id})">✏️</button>
                    </div>
                  </td>
                `;
        tbody.appendChild(tr);
    });
}

function compressAndCopyBatch(id) {
    const course = fetchedCoursesData.find(c => c.id === id);
    if (!course || !course.rawText) return;

    const minified = getMinifiedJson(course.rawText);
    if (!minified) return showError("Invalid JSON content.");

    navigator.clipboard.writeText(minified).then(() => {
        const btn = document.getElementById(`batchCompBtn-${id}`);
        btn.textContent = '✓ Compressed & Copied!';
        btn.disabled = true;
        course.isCompressed = true;

        setTimeout(() => {
            btn.textContent = '✓ Compressed';
        }, 1500);
    });
}

function copyBatchRaw(id) {
    const course = fetchedCoursesData.find(c => c.id === id);
    if (!course || !course.rawText) return;

    navigator.clipboard.writeText(course.rawText).then(() => {
        const btn = document.getElementById(`batchCopyBtn-${id}`);
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

/* CODE EDITOR & LINE NUMBERS */
function onEditorInput() {
    hideError();
    const textarea = document.getElementById('editorTextarea');
    const lineNums = document.getElementById('editorLineNumbers');
    const val = textarea.value;

    // Line numbers
    const lines = val.split('\n').length;
    let lineStr = '';
    for (let i = 1; i <= lines; i++) lineStr += `<span>${i}</span>`;
    lineNums.innerHTML = lineStr;

    syncEditorScroll();
    inspectPastedJson();
}

function syncEditorScroll() {
    const textarea = document.getElementById('editorTextarea');
    const lineNums = document.getElementById('editorLineNumbers');
    lineNums.scrollTop = textarea.scrollTop;
}

function prettifyEditorJson() {
    hideError();
    const textarea = document.getElementById('editorTextarea');
    const val = textarea.value.trim();
    if (!val) return;

    try {
        const parsed = JSON.parse(val);
        textarea.value = JSON.stringify(parsed, null, 2);
        onEditorInput();
    } catch (err) {
        showError("Invalid JSON in editor: " + err.message);
    }
}

/* APPEND PARTS MODAL FLOW */
function openAppendModal() {
    document.getElementById('appendPartsInput').value = '';
    document.getElementById('appendModal').style.display = 'flex';
}

function executeAppendParts() {
    hideError();
    const inputVal = document.getElementById('appendPartsInput').value.trim();
    const textarea = document.getElementById('editorTextarea');
    let mainJsonText = textarea.value.trim();

    if (!inputVal) return closeModalDirect('appendModal');

    let newPartsArr = [];
    try {
        let wrapped = inputVal.startsWith('[') ? inputVal : `[${inputVal}]`;
        newPartsArr = JSON.parse(wrapped);
    } catch (e) {
        alert("Invalid Parts JSON string! Please paste valid object(s).");
        return;
    }

    let mainObj = {};
    if (!mainJsonText) {
        mainObj = { "parts": [] };
    } else {
        try {
            mainObj = JSON.parse(mainJsonText);
        } catch (e) {
            alert("Current JSON in editor is invalid. Please fix syntax first.");
            return;
        }
    }

    const info = getPartsInfo(mainObj);
    const targetKey = info.arrayKey || 'parts';

    if (!Array.isArray(mainObj[targetKey])) {
        mainObj[targetKey] = [];
    }

    mainObj[targetKey].push(...newPartsArr);

    textarea.value = JSON.stringify(mainObj, null, 2);
    onEditorInput();
    closeModalDirect('appendModal');
}

function compressAndCopyEditor() {
    hideError();
    const textarea = document.getElementById('editorTextarea');
    const val = textarea.value.trim();

    if (!val) return showError("Editor is empty!");

    const minified = getMinifiedJson(val);
    if (!minified) return showError("Cannot compress invalid JSON.");

    navigator.clipboard.writeText(minified).then(() => {
        const btn = document.getElementById('btnCompEditor');
        btn.textContent = '✓ Compressed & Copied!';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = '✓ Compressed';
        }, 1500);
    });
}

function copyEditorRaw() {
    const textarea = document.getElementById('editorTextarea');
    const val = textarea.value;
    if (!val) return;

    navigator.clipboard.writeText(val).then(() => {
        const btn = document.getElementById('btnCopyEditor');
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

function inspectPastedJson() {
    const rawText = document.getElementById('editorTextarea').value.trim();
    const resCard = document.getElementById('pasteResult');
    const compBtn = document.getElementById('btnCompEditor');

    if (!rawText) {
        resCard.style.display = 'none';
        return;
    }

    const rawBytes = new Blob([rawText]).size;
    let validJson = true;
    let compBytes = 0;

    try {
        const parsed = JSON.parse(rawText);
        compBytes = new Blob([JSON.stringify(parsed)]).size;
        pastePartsInfo = getPartsInfo(parsed);
    } catch {
        validJson = false;
        pastePartsInfo = null;
    }

    document.getElementById('pasteSize').textContent = formatSize(rawBytes);
    document.getElementById('pasteCompSize').innerHTML = validJson
        ? `${formatSize(compBytes)} ${getSavingsText(rawBytes, compBytes)}`
        : 'N/A';

    document.getElementById('pasteStatus').textContent = validJson ? '✅ Valid JSON' : '⚠️ Invalid JSON';
    document.getElementById('pasteStatus').style.color = validJson ? '#1f883d' : '#cf222e';

    // Disable editor compress button if already compressed
    if (validJson && isAlreadyCompressed(rawText)) {
        compBtn.textContent = '✓ Compressed';
        compBtn.disabled = true;
    } else {
        compBtn.textContent = '⚡ Compress';
        compBtn.disabled = false;
    }

    renderBadgeButton('pastePartsContainer', pastePartsInfo, 'openPastePartsModal()');
    resCard.style.display = 'block';
}

/* MODAL HELPERS */
function displayModal(titleText, partsList) {
    if (!partsList || !partsList.length) return;

    const modal = document.getElementById('partsModal');
    const modalTitle = document.getElementById('modalTitle');
    const tbody = document.getElementById('modalTableBody');

    modalTitle.textContent = titleText;
    tbody.innerHTML = '';

    partsList.forEach(part => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td style="width: 40px; color: #57606a;">${part.index}</td>
                    <td style="font-weight: 500;">${escapeHtml(part.title)}</td>
                    <td><span class="part-badge-tag">${escapeHtml(part.badge)}</span></td>
                `;
        tbody.appendChild(row);
    });

    modal.style.display = 'flex';
}

function openBatchPartsModal(id) {
    const course = fetchedCoursesData.find(c => c.id === id);
    if (course && course.partsInfo) displayModal(course.fileName, course.partsInfo.partsList);
}

function openSinglePartsModal() {
    if (singlePartsInfo) displayModal("URL JSON Structure", singlePartsInfo.partsList);
}

function openPastePartsModal() {
    if (pastePartsInfo) displayModal("Editor JSON Structure", pastePartsInfo.partsList);
}

function closeModalDirect(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function closeModal(event, modalId) {
    if (event.target.id === modalId) closeModalDirect(modalId);
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}