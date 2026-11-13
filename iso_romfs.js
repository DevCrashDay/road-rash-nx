export const AUTHENTIC_EXE_SHA256 =
    '73d7f9744b5b1a9482b3909950cdf3fe34119fe13d023b031e9c6739a60f18a2';
export const AUTHENTIC_EXE_SIZE = 541184;

const CORE_REQUIRED_PATHS = [
    'ROADRASH.EXE',
    'DATA/PALETTE.RAW',
    'DATA/BIKESPEC.RSC',
    'DATA/BIKERS/HIBOB.DAT',
    'VIDEO/INTRO.AVI',
];

const CD_SYNC = new Uint8Array([0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00]);
const ROMFS_NONE = 0xffffffff;
const ROMFS_DATA_OFFSET = 0x200;

export function isIncludedGamePath(upperRel) {
    if (upperRel === 'ROADRASH.EXE') return true;
    return (
        upperRel.startsWith('AUDIO/') ||
        upperRel.startsWith('DATA/') ||
        upperRel.startsWith('IMAGES/') ||
        upperRel.startsWith('TEXT/') ||
        upperRel.startsWith('VIDEO/')
    );
}

function cmpOrdinal(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

// Pure-JS SHA-256 so verification works reliably on both https:// and file:// origins.
export function sha256Hex(bytes) {
    const K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);
    const H = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    const len = bytes.length;
    const bitLenHi = Math.floor((len * 8) / 0x100000000);
    const bitLenLo = (len * 8) >>> 0;
    const totalLen = ((len + 9 + 63) & ~63);
    const padded = new Uint8Array(totalLen);
    padded.set(bytes, 0);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(totalLen - 8, bitLenHi, false);
    dv.setUint32(totalLen - 4, bitLenLo, false);

    const W = new Uint32Array(64);
    for (let off = 0; off < totalLen; off += 64) {
        for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^ ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^ (W[i - 15] >>> 3);
            const s1 = ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^ ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
        }
        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (let i = 0; i < 64; i++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0;
            d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    let hex = '';
    for (let i = 0; i < 8; i++) hex += H[i].toString(16).padStart(8, '0');
    return hex;
}

function matchesCd001(buf, off = 0) {
    return (
        off + 7 <= buf.length &&
        buf[off + 1] === 0x43 && // C
        buf[off + 2] === 0x44 && // D
        buf[off + 3] === 0x30 && // 0
        buf[off + 4] === 0x30 && // 0
        buf[off + 5] === 0x31 && // 1
        buf[off + 6] === 1
    );
}

function readBoth16(buf, off) {
    const le = buf[off] | (buf[off + 1] << 8);
    const be = (buf[off + 2] << 8) | buf[off + 3];
    if (le !== be) throw new Error('Inconsistent dual-endian 16-bit ISO field.');
    return le;
}

function readBoth32(buf, off) {
    const le = (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
    const be = ((buf[off + 4] << 24) | (buf[off + 5] << 16) | (buf[off + 6] << 8) | buf[off + 7]) >>> 0;
    if (le !== be) throw new Error('Inconsistent dual-endian 32-bit ISO field.');
    return le;
}

function parseIsoRecord(buf, off, available) {
    if (available < 34) throw new Error('Truncated ISO directory record.');
    const len = buf[off];
    const flags = buf[off + 25];
    const nameLen = buf[off + 32];
    if (len < 34 || len > available || nameLen === 0 || nameLen > len - 33) {
        throw new Error('Malformed ISO directory record header.');
    }
    if ((flags & 0x80) !== 0) {
        throw new Error('Multi-extent ISO files are not supported.');
    }
    let name = '';
    for (let i = 0; i < nameLen; i++) {
        name += String.fromCharCode(buf[off + 33 + i]);
    }
    const semi = name.indexOf(';');
    if (semi >= 0) name = name.slice(0, semi);
    return {
        name,
        sector: readBoth32(buf, off + 2),
        size: readBoth32(buf, off + 10),
        isDirectory: (flags & 2) !== 0,
    };
}

async function detectGeometry(sliceFn, fileSize) {
    for (const [sectorSize, prefix] of [
        [2352, 'Raw CD Image (2352 B/sector'],
        [2448, 'Alcohol 120% Disc Image (2448 B/sector'],
    ]) {
        if (fileSize >= 17 * sectorSize && fileSize % sectorSize === 0) {
            const sec = await sliceFn(16 * sectorSize, sectorSize);
            let syncOk = true;
            for (let i = 0; i < CD_SYNC.length; i++) {
                if (sec[i] !== CD_SYNC[i]) { syncOk = false; break; }
            }
            if (syncOk) {
                const mode = sec[15];
                let dataOff = mode === 2 ? 24 : 16;
                if (!matchesCd001(sec, dataOff)) {
                    const alt = dataOff === 24 ? 16 : 24;
                    if (matchesCd001(sec, alt)) dataOff = alt;
                    else dataOff = -1;
                }
                if (dataOff >= 0) {
                    return { sectorSize, dataOffset: dataOff, label: `${prefix}, Mode ${mode})` };
                }
            }
        }
    }

    if (fileSize >= 17 * 2048) {
        const probe = await sliceFn(16 * 2048, 2048);
        if (matchesCd001(probe, 0)) {
            return { sectorSize: 2048, dataOffset: 0, label: 'Standard ISO-9660 (2048 B/sector)' };
        }
        if (matchesCd001(probe, 8) && fileSize % 2048 === 0) {
            throw new Error(
                'This .iso file is a damaged CD-ROM Mode 2 XA rip: every 2048-byte sector starts with an 8-byte XA subheader and is missing its last 8 bytes of file data.\n\n' +
                'Please use an intact 2048-byte ISO, a raw .mdf/.bin+.cue disc dump, or an extracted Road Rash CD folder instead.'
            );
        }
    }

    if (fileSize >= 17 * 2056 && fileSize % 2056 === 0) {
        const probe = await sliceFn(16 * 2056 + 8, 2048);
        if (matchesCd001(probe, 0)) {
            return { sectorSize: 2056, dataOffset: 8, label: 'Mode 2 XA Image (2056 B/sector)' };
        }
    }

    throw new Error(
        'Unrecognized disc image format. Supported formats: standard ISO-9660 (.iso), raw CD image (.bin/.cue, .img), Alcohol 120% (.mdf), or an extracted PC CD folder.'
    );
}

export class IsoDiscSource {
    constructor(sliceFn, fileSize, geom, volumeSectors, root) {
        this._slice = sliceFn;
        this._fileSize = fileSize;
        this._sectorSize = geom.sectorSize;
        this._dataOffset = geom.dataOffset;
        this.formatDescription = geom.label;
        this._volumeSectors = volumeSectors;
        this._root = root;
    }

    static async open(fileSize, sliceFn) {
        const geom = await detectGeometry(sliceFn, fileSize);
        let volumeSectors = Math.floor(fileSize / geom.sectorSize);
        let root = null;
        let foundPvd = false;

        for (let s = 16; s < 64; s++) {
            const pvd = await sliceFn(s * geom.sectorSize + geom.dataOffset, 2048);
            if (!matchesCd001(pvd, 0)) {
                throw new Error('Not a valid ISO-9660 primary volume descriptor.');
            }
            if (pvd[0] === 255) break;
            if (pvd[0] !== 1) continue;

            const blockSize = readBoth16(pvd, 128);
            if (blockSize !== 2048) {
                throw new Error(`Unsupported ISO block size (${blockSize}); expected 2048 bytes.`);
            }
            const pvdSectors = readBoth32(pvd, 80);
            if (pvdSectors === 0 || pvdSectors * geom.sectorSize > fileSize) {
                throw new Error('ISO image appears truncated compared to its volume size.');
            }
            volumeSectors = pvdSectors;
            root = parseIsoRecord(pvd, 156, 2048 - 156);
            if (!root.isDirectory) throw new Error('ISO root record is not a directory.');
            foundPvd = true;
            break;
        }
        if (!foundPvd) throw new Error('ISO primary volume descriptor (CD001) was not found.');
        return new IsoDiscSource(sliceFn, fileSize, geom, volumeSectors, root);
    }

    async readExtent(startSector, size) {
        const sectorCount = Math.ceil(size / 2048);
        if (startSector + sectorCount > this._volumeSectors) {
            throw new Error(`ISO read out of bounds at sector ${startSector}.`);
        }
        if (this._sectorSize === 2048 && this._dataOffset === 0) {
            return await this._slice(startSector * 2048, size);
        }
        const out = new Uint8Array(size);
        let remaining = size;
        let outPos = 0;
        let s = startSector;
        while (remaining > 0) {
            const sec = await this._slice(s * this._sectorSize + this._dataOffset, 2048);
            const take = Math.min(2048, remaining);
            out.set(sec.subarray(0, take), outPos);
            outPos += take;
            remaining -= take;
            s++;
        }
        return out;
    }

    async readDirectory(dir) {
        if (!dir.isDirectory || dir.size > 16 * 1024 * 1024) {
            throw new Error('Invalid ISO directory extent.');
        }
        const data = await this.readExtent(dir.sector, dir.size);
        const list = [];
        let at = 0;
        while (at < data.length) {
            const recLen = data[at];
            if (recLen === 0) {
                at = (Math.floor(at / 2048) + 1) * 2048;
                continue;
            }
            if (recLen > 2048 - (at % 2048) || at + recLen > data.length) {
                throw new Error('Malformed ISO directory record.');
            }
            const e = parseIsoRecord(data, at, recLen);
            at += recLen;
            if (e.name.length === 1 && (e.name.charCodeAt(0) === 0 || e.name.charCodeAt(0) === 1)) continue;
            if (e.name === '.' || e.name === '..') continue;
            list.push(e);
        }
        return list;
    }

    async listGameFiles() {
        const top = await this.readDirectory(this._root);
        let baseDir = this._root;
        for (const e of top) {
            if (e.isDirectory && e.name.toUpperCase() === 'ROADRASH') {
                baseDir = e;
                break;
            }
        }

        const out = [];
        const visited = new Set([baseDir.sector]);
        const walk = async (dir, prefix) => {
            const entries = await this.readDirectory(dir);
            for (const e of entries) {
                const upper = e.name.toUpperCase();
                const rel = prefix ? `${prefix}/${upper}` : upper;
                if (e.isDirectory) {
                    if (
                        rel === 'AUDIO' || rel === 'DATA' || rel === 'IMAGES' || rel === 'TEXT' || rel === 'VIDEO' ||
                        rel.startsWith('AUDIO/') || rel.startsWith('DATA/') || rel.startsWith('IMAGES/') ||
                        rel.startsWith('TEXT/') || rel.startsWith('VIDEO/')
                    ) {
                        if (visited.has(e.sector)) throw new Error('ISO directory cycle detected.');
                        visited.add(e.sector);
                        await walk(e, rel);
                    }
                } else if (isIncludedGamePath(rel)) {
                    out.push({ relativePath: rel, size: e.size, startSector: e.sector });
                }
            }
        };
        await walk(baseDir, '');
        out.sort((a, b) => cmpOrdinal(a.relativePath, b.relativePath));
        return out;
    }

    async streamFile(entry, onChunk, signal) {
        let remaining = entry.size;
        let sector = entry.startSector;
        // Read up to 512 contiguous sectors (1 MiB) at a time on standard 2048 ISO, or 256 raw sectors at once.
        const maxBatchSectors = 512;
        while (remaining > 0) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            const needSectors = Math.ceil(remaining / 2048);
            const batchSectors = Math.min(needSectors, maxBatchSectors);
            const batchBytes = Math.min(remaining, batchSectors * 2048);

            if (this._sectorSize === 2048 && this._dataOffset === 0) {
                const chunk = await this._slice(sector * 2048, batchBytes);
                await onChunk(chunk);
            } else {
                const rawSpan = await this._slice(sector * this._sectorSize, batchSectors * this._sectorSize);
                const chunk = new Uint8Array(batchBytes);
                let outOff = 0;
                for (let i = 0; i < batchSectors; i++) {
                    const take = Math.min(2048, batchBytes - outOff);
                    const srcOff = i * this._sectorSize + this._dataOffset;
                    chunk.set(rawSpan.subarray(srcOff, srcOff + take), outOff);
                    outOff += take;
                }
                await onChunk(chunk);
            }
            remaining -= batchBytes;
            sector += batchSectors;
        }
    }

    async readSmallFile(entry) {
        return await this.readExtent(entry.startSector, entry.size);
    }
}

export class FolderDiscSource {
    constructor(entries) {
        this.formatDescription = 'Extracted Disc Folder';
        this._entries = entries;
    }

    static fromRelativeItems(items) {
        // items: [{ relPath, size, readSlice(off, len) }]
        let useRoadrashPrefix = false;
        let hasRootExe = false;
        let hasRoadrash95 = false;
        for (const it of items) {
            const norm = it.relPath.replace(/\\/g, '/').replace(/^\/+/, '');
            const parts = norm.split('/').filter(Boolean);
            // Strip top picked folder name if every item shares one? Caller strips root folder name when needed,
            // and here we also handle an inner ROADRASH/ subfolder!
            const upper = parts.join('/').toUpperCase();
            if (upper === 'ROADRASH.EXE') hasRootExe = true;
            if (upper === 'ROADRASH/ROADRASH.EXE') useRoadrashPrefix = true;
            if (upper === 'ROADRASH95.EXE' || upper === 'ROADRASH/ROADRASH95.EXE') hasRoadrash95 = true;
        }
        if (!hasRootExe && !useRoadrashPrefix && hasRoadrash95) {
            throw new Error('This folder contains RoadRash95.exe rather than the original 1996 PC CD ROADRASH.EXE.');
        }

        const out = [];
        for (const it of items) {
            let norm = it.relPath.replace(/\\/g, '/').replace(/^\/+/, '').toUpperCase();
            if (useRoadrashPrefix) {
                if (!norm.startsWith('ROADRASH/')) continue;
                norm = norm.slice('ROADRASH/'.length);
            }
            if (isIncludedGamePath(norm)) {
                out.push({
                    relativePath: norm,
                    size: it.size,
                    readSlice: it.readSlice,
                });
            }
        }
        out.sort((a, b) => cmpOrdinal(a.relativePath, b.relativePath));
        return new FolderDiscSource(out);
    }

    async listGameFiles() {
        return this._entries;
    }

    async streamFile(entry, onChunk, signal) {
        const chunkSize = 1024 * 1024;
        for (let off = 0; off < entry.size; off += chunkSize) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            const take = Math.min(chunkSize, entry.size - off);
            const buf = await entry.readSlice(off, take);
            await onChunk(buf);
        }
    }

    async readSmallFile(entry) {
        return await entry.readSlice(0, entry.size);
    }
}

export async function inspectDiscSource(source) {
    const files = await source.listGameFiles();
    const byPath = new Map();
    let totalBytes = 0;
    for (const f of files) {
        totalBytes += f.size;
        byPath.set(f.relativePath, f);
    }

    const missing = CORE_REQUIRED_PATHS.filter((p) => !byPath.has(p));
    const exe = byPath.get('ROADRASH.EXE');
    let exeSha256 = null;
    let exeMatch = false;

    if (exe && exe.size <= 8 * 1024 * 1024) {
        const exeBytes = await source.readSmallFile(exe);
        exeSha256 = sha256Hex(exeBytes);
        exeMatch = exeSha256 === AUTHENTIC_EXE_SHA256;
    }

    if (!exe) {
        return {
            isValid: false,
            formatDescription: source.formatDescription,
            statusTitle: 'ROADRASH.EXE not found',
            statusDetail: 'This source does not contain an original Road Rash PC ROADRASH.EXE.',
            files,
            totalBytes,
        };
    }
    if (missing.length > 0) {
        return {
            isValid: false,
            formatDescription: source.formatDescription,
            statusTitle: 'Incomplete game assets',
            statusDetail: 'Missing required files: ' + missing.join(', '),
            files,
            totalBytes,
        };
    }
    if (!exeMatch) {
        return {
            isValid: false,
            formatDescription: source.formatDescription,
            statusTitle: 'Incompatible ROADRASH.EXE',
            statusDetail: `Found ROADRASH.EXE (${exe.size.toLocaleString()} bytes, SHA-256 ${exeSha256?.slice(0, 12)}...), but the Switch port requires the original 1996 PC CD ROADRASH.EXE (${AUTHENTIC_EXE_SIZE.toLocaleString()} bytes, SHA-256 ${AUTHENTIC_EXE_SHA256.slice(0, 12)}...).`,
            files,
            totalBytes,
        };
    }

    return {
        isValid: true,
        formatDescription: source.formatDescription,
        statusTitle: 'Authentic 1996 Road Rash disc verified',
        statusDetail: `${files.length} game files (${(totalBytes / (1024 * 1024)).toFixed(1)} MB) • ROADRASH.EXE SHA-256 verified`,
        files,
        totalBytes,
        exeSha256,
    };
}

function align4(n) { return (n + 3) & ~3; }
function align16(n) { return (n + 15) & ~15; }

function getHashTableCount(numEntries) {
    if (numEntries < 3) return 3;
    if (numEntries < 19) return numEntries | 1;
    let c = numEntries;
    while (c % 2 === 0 || c % 3 === 0 || c % 5 === 0 || c % 7 === 0 || c % 11 === 0 || c % 13 === 0 || c % 17 === 0) {
        c++;
    }
    return c;
}

function calcPathHash(parentOffset, nameBytes) {
    let h = (parentOffset ^ 123456789) >>> 0;
    for (let i = 0; i < nameBytes.length; i++) {
        h = (((h >>> 5) | (h << 27)) ^ nameBytes[i]) >>> 0;
    }
    return h >>> 0;
}

export function planRomFs(entries) {
    const enc = new TextEncoder();
    const root = {
        name: '',
        nameBytes: new Uint8Array(0),
        parent: null,
        offset: 0,
        sibling: ROMFS_NONE,
        child: ROMFS_NONE,
        firstFile: ROMFS_NONE,
        hashNext: ROMFS_NONE,
        subdirs: new Map(),
        files: [],
    };

    for (const entry of entries) {
        const parts = entry.relativePath.split('/');
        let cur = root;
        for (let p = 0; p < parts.length - 1; p++) {
            const seg = parts[p];
            if (!cur.subdirs.has(seg)) {
                cur.subdirs.set(seg, {
                    name: seg,
                    nameBytes: enc.encode(seg),
                    parent: cur,
                    offset: 0,
                    sibling: ROMFS_NONE,
                    child: ROMFS_NONE,
                    firstFile: ROMFS_NONE,
                    hashNext: ROMFS_NONE,
                    subdirs: new Map(),
                    files: [],
                });
            }
            cur = cur.subdirs.get(seg);
        }
        const fname = parts[parts.length - 1];
        cur.files.push({
            name: fname,
            nameBytes: enc.encode(fname),
            source: entry,
            parent: cur,
            offset: 0,
            sibling: ROMFS_NONE,
            dataOffset: 0,
            padBefore: 0,
            hashNext: ROMFS_NONE,
        });
    }

    const sortDir = (d) => {
        const sortedSubKeys = Array.from(d.subdirs.keys()).sort(cmpOrdinal);
        const sortedSubs = new Map();
        for (const k of sortedSubKeys) {
            const sub = d.subdirs.get(k);
            sortDir(sub);
            sortedSubs.set(k, sub);
        }
        d.subdirs = sortedSubs;
        d.files.sort((a, b) => cmpOrdinal(a.name, b.name));
    };
    sortDir(root);

    const allDirs = [];
    const allFiles = [];
    let dirOff = 0;
    let fileOff = 0;

    const visitDirs = (d) => {
        d.offset = dirOff;
        allDirs.push(d);
        dirOff += 24 + align4(d.nameBytes.length);
        for (const sub of d.subdirs.values()) visitDirs(sub);
    };
    const visitFiles = (d) => {
        for (const sub of d.subdirs.values()) visitFiles(sub);
        for (const fn of d.files) {
            fn.offset = fileOff;
            allFiles.push(fn);
            fileOff += 32 + align4(fn.nameBytes.length);
        }
    };
    visitDirs(root);
    visitFiles(root);

    for (const d of allDirs) {
        let prev = null;
        for (const sub of d.subdirs.values()) {
            if (!prev) d.child = sub.offset;
            else prev.sibling = sub.offset;
            prev = sub;
        }
        if (d.files.length > 0) {
            d.firstFile = d.files[0].offset;
            for (let i = 0; i + 1 < d.files.length; i++) {
                d.files[i].sibling = d.files[i + 1].offset;
            }
        }
    }

    // Precompute exact aligned DataOffset for every file before streaming any data
    let curDataPos = 0;
    for (const f of allFiles) {
        const aligned = align16(curDataPos);
        f.padBefore = aligned - curDataPos;
        f.dataOffset = aligned;
        curDataPos = aligned + f.source.size;
    }

    const dirBuckets = new Uint32Array(getHashTableCount(allDirs.length)).fill(ROMFS_NONE);
    for (const d of allDirs) {
        if (d.offset === 0) continue;
        const b = calcPathHash(d.parent ? d.parent.offset : 0, d.nameBytes) % dirBuckets.length;
        d.hashNext = dirBuckets[b];
        dirBuckets[b] = d.offset;
    }

    const fileBuckets = new Uint32Array(getHashTableCount(allFiles.length)).fill(ROMFS_NONE);
    for (const f of allFiles) {
        const b = calcPathHash(f.parent.offset, f.nameBytes) % fileBuckets.length;
        f.hashNext = fileBuckets[b];
        fileBuckets[b] = f.offset;
    }

    const dirHashBytes = new Uint8Array(dirBuckets.length * 4);
    const dhView = new DataView(dirHashBytes.buffer);
    for (let i = 0; i < dirBuckets.length; i++) dhView.setUint32(i * 4, dirBuckets[i], true);

    const dirMetaBytes = new Uint8Array(dirOff);
    const dmView = new DataView(dirMetaBytes.buffer);
    for (const d of allDirs) {
        const o = d.offset;
        dmView.setUint32(o + 0, d.parent ? d.parent.offset : 0, true);
        dmView.setUint32(o + 4, d.sibling, true);
        dmView.setUint32(o + 8, d.child, true);
        dmView.setUint32(o + 12, d.firstFile, true);
        dmView.setUint32(o + 16, d.hashNext, true);
        dmView.setUint32(o + 20, d.nameBytes.length, true);
        dirMetaBytes.set(d.nameBytes, o + 24);
    }

    const fileHashBytes = new Uint8Array(fileBuckets.length * 4);
    const fhView = new DataView(fileHashBytes.buffer);
    for (let i = 0; i < fileBuckets.length; i++) fhView.setUint32(i * 4, fileBuckets[i], true);

    const fileMetaBytes = new Uint8Array(fileOff);
    const fmView = new DataView(fileMetaBytes.buffer);
    for (const f of allFiles) {
        const o = f.offset;
        fmView.setUint32(o + 0, f.parent.offset, true);
        fmView.setUint32(o + 4, f.sibling, true);
        fmView.setBigUint64(o + 8, BigInt(f.dataOffset), true);
        fmView.setBigUint64(o + 16, BigInt(f.source.size), true);
        fmView.setUint32(o + 24, f.hashNext, true);
        fmView.setUint32(o + 28, f.nameBytes.length, true);
        fileMetaBytes.set(f.nameBytes, o + 32);
    }

    const dirHashOff = ROMFS_DATA_OFFSET + curDataPos;
    const dirMetaOff = dirHashOff + dirHashBytes.length;
    const fileHashOff = dirMetaOff + dirMetaBytes.length;
    const fileMetaOff = fileHashOff + fileHashBytes.length;
    const romfsTotalSize = fileMetaOff + fileMetaBytes.length;

    const romfsHeader = new Uint8Array(ROMFS_DATA_OFFSET);
    const rhView = new DataView(romfsHeader.buffer);
    rhView.setBigUint64(0x00, BigInt(0x50), true);
    rhView.setBigUint64(0x08, BigInt(dirHashOff), true);
    rhView.setBigUint64(0x10, BigInt(dirHashBytes.length), true);
    rhView.setBigUint64(0x18, BigInt(dirMetaOff), true);
    rhView.setBigUint64(0x20, BigInt(dirMetaBytes.length), true);
    rhView.setBigUint64(0x28, BigInt(fileHashOff), true);
    rhView.setBigUint64(0x30, BigInt(fileHashBytes.length), true);
    rhView.setBigUint64(0x38, BigInt(fileMetaOff), true);
    rhView.setBigUint64(0x40, BigInt(fileMetaBytes.length), true);
    rhView.setBigUint64(0x48, BigInt(ROMFS_DATA_OFFSET), true);

    return {
        allDirs,
        allFiles,
        totalFileBytes: allFiles.reduce((acc, f) => acc + f.source.size, 0),
        romfsHeader,
        tables: [dirHashBytes, dirMetaBytes, fileHashBytes, fileMetaBytes],
        romfsTotalSize,
    };
}

export function preparePatchedBasePrefix(baseNroBytes, romfsTotalSize) {
    if (baseNroBytes.length < 0x80) throw new Error('Base NRO binary is truncated.');
    const bv = new DataView(baseNroBytes.buffer, baseNroBytes.byteOffset, baseNroBytes.byteLength);
    if (bv.getUint32(0x10, true) !== 0x304f524e) throw new Error('Invalid NRO0 magic in roadrash_base.nro.');
    const nroSize = bv.getUint32(0x18, true);
    if (nroSize <= 0 || nroSize + 0x38 > baseNroBytes.length) {
        throw new Error('Invalid NRO binary size in roadrash_base.nro.');
    }
    if (bv.getUint32(nroSize, true) !== 0x54455341) {
        throw new Error('Missing ASET header in roadrash_base.nro.');
    }

    const iconOff = Number(bv.getBigUint64(nroSize + 0x08, true));
    const iconSz = Number(bv.getBigUint64(nroSize + 0x10, true));
    const nacpOff = Number(bv.getBigUint64(nroSize + 0x18, true));
    const nacpSz = Number(bv.getBigUint64(nroSize + 0x20, true));
    const assetHeaderEnd = Math.max(0x38, iconSz > 0 ? iconOff + iconSz : 0x38, nacpSz > 0 ? nacpOff + nacpSz : 0x38);
    const prefixLen = nroSize + assetHeaderEnd;
    if (prefixLen > baseNroBytes.length) throw new Error('Base NRO ASET sections are truncated.');

    const prefix = new Uint8Array(baseNroBytes.subarray(0, prefixLen));
    const pv = new DataView(prefix.buffer);
    pv.setBigUint64(nroSize + 0x28, BigInt(assetHeaderEnd), true);
    pv.setBigUint64(nroSize + 0x30, BigInt(romfsTotalSize), true);
    return prefix;
}

export async function streamBuildNro(source, baseNroBytes, writeChunk, onProgress, signal) {
    const entries = await source.listGameFiles();
    if (entries.length === 0) throw new Error('No Road Rash game files were found.');

    const plan = planRomFs(entries);
    const basePrefix = preparePatchedBasePrefix(baseNroBytes, plan.romfsTotalSize);

    await writeChunk(basePrefix);
    await writeChunk(plan.romfsHeader);

    let bytesDone = 0;
    let exeVerified = false;

    for (let i = 0; i < plan.allFiles.length; i++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const f = plan.allFiles[i];
        if (f.padBefore > 0) {
            await writeChunk(new Uint8Array(f.padBefore));
        }

        const isExe = f.source.relativePath === 'ROADRASH.EXE';
        const exeParts = isExe ? [] : null;

        await source.streamFile(
            f.source,
            async (chunk) => {
                if (exeParts) exeParts.push(chunk);
                await writeChunk(chunk);
                bytesDone += chunk.length;
                if (onProgress) {
                    onProgress({
                        filesDone: i,
                        totalFiles: plan.allFiles.length,
                        bytesDone,
                        totalBytes: plan.totalFileBytes,
                        currentItem: f.source.relativePath,
                    });
                }
            },
            signal
        );

        if (exeParts) {
            const totalLen = exeParts.reduce((s, c) => s + c.length, 0);
            const joined = new Uint8Array(totalLen);
            let off = 0;
            for (const c of exeParts) { joined.set(c, off); off += c.length; }
            const sha = sha256Hex(joined);
            if (sha !== AUTHENTIC_EXE_SHA256) {
                throw new Error(`ROADRASH.EXE SHA-256 verification failed (${sha}). Only the authentic 1996 CD executable is supported.`);
            }
            exeVerified = true;
        }
    }

    if (!exeVerified) {
        throw new Error('ROADRASH.EXE was missing from the source files.');
    }

    for (const tbl of plan.tables) {
        await writeChunk(tbl);
    }

    if (onProgress) {
        onProgress({
            filesDone: plan.allFiles.length,
            totalFiles: plan.allFiles.length,
            bytesDone: plan.totalFileBytes,
            totalBytes: plan.totalFileBytes,
            currentItem: 'Finalizing NRO...',
        });
    }

    return {
        outputSize: basePrefix.length + plan.romfsTotalSize,
        fileCount: plan.allFiles.length,
        dirCount: plan.allDirs.length,
        romfsSize: plan.romfsTotalSize,
    };
}
