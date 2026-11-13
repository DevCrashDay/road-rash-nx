import {
    FolderDiscSource,
    IsoDiscSource,
    inspectDiscSource,
    streamBuildNro,
} from './iso_romfs.js';

const el = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    folderInput: document.getElementById('folderInput'),
    pickFileBtn: document.getElementById('pickFileBtn'),
    pickFolderBtn: document.getElementById('pickFolderBtn'),
    formatBadge: document.getElementById('formatBadge'),
    statusCard: document.getElementById('statusCard'),
    statusTitle: document.getElementById('statusTitle'),
    statusDetail: document.getElementById('statusDetail'),
    baseFallbackCard: document.getElementById('baseFallbackCard'),
    pickBaseBtn: document.getElementById('pickBaseBtn'),
    baseInput: document.getElementById('baseInput'),
    baseStatus: document.getElementById('baseStatus'),
    progressLabel: document.getElementById('progressLabel'),
    progressPct: document.getElementById('progressPct'),
    progressFill: document.getElementById('progressFill'),
    logBox: document.getElementById('logBox'),
    buildBtn: document.getElementById('buildBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
};

let activeSource = null;
let sourceValid = false;
let baseNroBytes = null;
let buildAbort = null;
let isBuilding = false;

function log(msg) {
    const t = new Date().toLocaleTimeString();
    el.logBox.textContent += `[${t}] ${msg}\n`;
    el.logBox.scrollTop = el.logBox.scrollHeight;
}

function updateBuildButton() {
    el.buildBtn.disabled = isBuilding || !sourceValid || !baseNroBytes;
}

function setBuilding(building) {
    isBuilding = building;
    el.pickFileBtn.disabled = building;
    el.pickFolderBtn.disabled = building;
    el.pickBaseBtn.disabled = building;
    el.cancelBtn.classList.toggle('hidden', !building);
    updateBuildButton();
}

function setStatus(kind, title, detail, formatText = null) {
    el.statusCard.classList.remove('status-ok', 'status-err', 'status-warn');
    if (kind === 'ok') el.statusCard.classList.add('status-ok');
    else if (kind === 'err') el.statusCard.classList.add('status-err');

    el.statusTitle.textContent = title;
    el.statusDetail.textContent = detail;

    if (formatText) {
        el.formatBadge.textContent = formatText;
        el.formatBadge.classList.remove('hidden');
    } else {
        el.formatBadge.classList.add('hidden');
    }
}

async function fetchBaseNro() {
    try {
        const resp = await fetch('./roadrash_base.nro');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        baseNroBytes = new Uint8Array(buf);
        el.baseStatus.textContent = `Engine binary ready (${(baseNroBytes.length / (1024 * 1024)).toFixed(1)} MB)`;
        el.baseFallbackCard.classList.add('hidden');
        log(`Loaded roadrash_base.nro (${baseNroBytes.length.toLocaleString()} bytes)`);
    } catch (err) {
        el.baseStatus.textContent = 'Select roadrash_base.nro manually';
        el.baseFallbackCard.classList.remove('hidden');
        log(`Could not auto-fetch roadrash_base.nro (${err.message})`);
    }
    updateBuildButton();
}

function makeSliceReader(file) {
    return async (offset, length) => {
        const buf = await file.slice(offset, offset + length).arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length !== length) {
            throw new Error(`Unexpected end of file reading ${file.name} at offset ${offset}`);
        }
        return bytes;
    };
}

function resolveCuePair(files) {
    const cue = files.find((f) => f.name.toLowerCase().endsWith('.cue'));
    if (!cue) return null;
    return cue.text().then((txt) => {
        const m = txt.match(/^\s*FILE\s+(?:"([^"]+)"|(\S+))/im);
        if (m) {
            const target = (m[1] || m[2]).split(/[/\\]/).pop().toLowerCase();
            const match = files.find((f) => f.name.toLowerCase() === target);
            if (match) return match;
        }
        const binFallback = files.find((f) => /\.(bin|img)$/i.test(f.name));
        if (binFallback) return binFallback;
        throw new Error(`Selected ${cue.name}, please also drop its matching .bin image file together.`);
    });
}

async function loadFromFileList(files) {
    if (!files || files.length === 0) return;

    // Folder upload via webkitdirectory sets webkitRelativePath
    const hasRelDirs = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes('/'));
    if (hasRelDirs) {
        const firstSegs = new Set(files.map((f) => f.webkitRelativePath.split('/')[0]));
        const stripTop = firstSegs.size === 1;
        const items = files.map((f) => {
            let rel = f.webkitRelativePath;
            if (stripTop) {
                const idx = rel.indexOf('/');
                rel = idx >= 0 ? rel.slice(idx + 1) : rel;
            }
            return {
                relPath: rel,
                size: f.size,
                readSlice: makeSliceReader(f),
            };
        });
        await verifySource(FolderDiscSource.fromRelativeItems(items), 'Selected folder');
        return;
    }

    const list = Array.from(files);
    const cueTarget = await resolveCuePair(list);
    if (cueTarget) {
        log(`Resolved .cue track image: ${cueTarget.name}`);
        const src = await IsoDiscSource.open(cueTarget.size, makeSliceReader(cueTarget));
        await verifySource(src, cueTarget.name);
        return;
    }

    const image =
        list.find((f) => /\.(iso|mdf|bin|img)$/i.test(f.name)) ||
        list[0];
    if (image.name.toLowerCase().endsWith('.mds')) {
        throw new Error(`Selected ${image.name}. Please drop the matching .mdf file directly.`);
    }
    const src = await IsoDiscSource.open(image.size, makeSliceReader(image));
    await verifySource(src, image.name);
}

async function readDroppedEntries(dataTransfer) {
    const items = Array.from(dataTransfer.items || []);
    const entries = items
        .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
        .filter(Boolean);

    if (entries.length === 1 && entries[0].isDirectory) {
        const collected = [];
        const walkEntry = async (dirEntry, prefix) => {
            const reader = dirEntry.createReader();
            while (true) {
                const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
                if (batch.length === 0) break;
                for (const ent of batch) {
                    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
                    if (ent.isDirectory) {
                        await walkEntry(ent, rel);
                    } else if (ent.isFile) {
                        const file = await new Promise((resolve, reject) => ent.file(resolve, reject));
                        collected.push({
                            relPath: rel,
                            size: file.size,
                            readSlice: makeSliceReader(file),
                        });
                    }
                }
            }
        };
        await walkEntry(entries[0], '');
        return FolderDiscSource.fromRelativeItems(collected);
    }
    return null;
}

async function verifySource(source, label) {
    activeSource = null;
    sourceValid = false;
    log(`Inspecting ${label} (${source.formatDescription})...`);
    const res = await inspectDiscSource(source);
    if (res.isValid) {
        activeSource = source;
        sourceValid = true;
        setStatus('ok', res.statusTitle, res.statusDetail, res.formatDescription);
        log(`Verified OK: ${res.statusDetail}`);
    } else {
        setStatus('err', res.statusTitle, res.statusDetail, res.formatDescription);
        log(`Verification failed: ${res.statusTitle} — ${res.statusDetail}`);
    }
    updateBuildButton();
}

async function handleSourceError(err) {
    activeSource = null;
    sourceValid = false;
    setStatus('err', 'Could not read disc image', err.message || String(err));
    log(`ERROR: ${err.message || err}`);
    updateBuildButton();
}

el.pickFileBtn.addEventListener('click', () => el.fileInput.click());
el.pickFolderBtn.addEventListener('click', () => el.folderInput.click());
el.pickBaseBtn.addEventListener('click', () => el.baseInput.click());

el.fileInput.addEventListener('change', async () => {
    try {
        await loadFromFileList(Array.from(el.fileInput.files || []));
    } catch (err) {
        await handleSourceError(err);
    } finally {
        el.fileInput.value = '';
    }
});

el.folderInput.addEventListener('change', async () => {
    try {
        await loadFromFileList(Array.from(el.folderInput.files || []));
    } catch (err) {
        await handleSourceError(err);
    } finally {
        el.folderInput.value = '';
    }
});

el.baseInput.addEventListener('change', async () => {
    const file = el.baseInput.files?.[0];
    if (!file) return;
    baseNroBytes = new Uint8Array(await file.arrayBuffer());
    el.baseStatus.textContent = `Engine binary ready (${(baseNroBytes.length / (1024 * 1024)).toFixed(1)} MB)`;
    el.baseFallbackCard.classList.add('hidden');
    log(`Loaded ${file.name} (${baseNroBytes.length.toLocaleString()} bytes)`);
    updateBuildButton();
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!isBuilding) el.dropZone.classList.add('drag-over');
});

window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) el.dropZone.classList.remove('drag-over');
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.dropZone.classList.remove('drag-over');
    if (isBuilding) return;
    try {
        const dirSource = await readDroppedEntries(e.dataTransfer);
        if (dirSource) {
            await verifySource(dirSource, 'Dropped folder');
            return;
        }
        await loadFromFileList(Array.from(e.dataTransfer.files || []));
    } catch (err) {
        await handleSourceError(err);
    }
});

el.cancelBtn.addEventListener('click', () => {
    if (buildAbort) buildAbort.abort();
});

el.buildBtn.addEventListener('click', async () => {
    if (!activeSource || !baseNroBytes) return;

    let writable = null;
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'roadrash_switch.nro',
                types: [{
                    description: 'Nintendo Switch Homebrew NRO',
                    accept: { 'application/octet-stream': ['.nro'] },
                }],
            });
            writable = await handle.createWritable();
        } catch (err) {
            if (err.name === 'AbortError') return;
            log(`Direct save picker unavailable (${err.message}); falling back to browser download.`);
            writable = null;
        }
    }

    setBuilding(true);
    buildAbort = new AbortController();
    el.progressFill.style.width = '0%';
    el.progressPct.textContent = '0%';
    el.progressLabel.textContent = 'Starting build...';

    const t0 = performance.now();
    const blobChunks = writable ? null : [];

    try {
        const writeChunk = writable
            ? async (chunk) => { await writable.write(chunk); }
            : async (chunk) => { blobChunks.push(chunk); };

        const outcome = await streamBuildNro(
            activeSource,
            baseNroBytes,
            writeChunk,
            (p) => {
                const pct = p.totalBytes > 0 ? Math.min(100, (p.bytesDone * 100) / p.totalBytes) : 0;
                el.progressFill.style.width = `${pct.toFixed(1)}%`;
                el.progressPct.textContent = `${pct.toFixed(0)}%`;
                const idx = Math.min(p.totalFiles, p.filesDone + 1);
                el.progressLabel.textContent = `Packing ${p.currentItem} (${idx}/${p.totalFiles}) • ${(p.bytesDone / (1024 * 1024)).toFixed(1)} / ${(p.totalBytes / (1024 * 1024)).toFixed(1)} MB`;
            },
            buildAbort.signal
        );

        if (writable) {
            await writable.close();
        } else {
            const blob = new Blob(blobChunks, { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'roadrash_switch.nro';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }

        const secs = ((performance.now() - t0) / 1000).toFixed(1);
        el.progressFill.style.width = '100%';
        el.progressPct.textContent = '100%';
        el.progressLabel.textContent = `Complete! Built roadrash_switch.nro (${(outcome.outputSize / (1024 * 1024)).toFixed(1)} MB) in ${secs}s`;
        log(`BUILD SUCCESS: ${outcome.outputSize.toLocaleString()} bytes (${outcome.fileCount} files in ${secs}s)`);
    } catch (err) {
        if (writable) {
            try { await writable.abort(); } catch {}
        }
        if (err.name === 'AbortError') {
            el.progressLabel.textContent = 'Build cancelled.';
            el.progressFill.style.width = '0%';
            el.progressPct.textContent = '0%';
            log('Build cancelled by user.');
        } else {
            el.progressLabel.textContent = 'Build failed.';
            log(`ERROR: ${err.message || err}`);
        }
    } finally {
        buildAbort = null;
        setBuilding(false);
    }
});

fetchBaseNro();
