// SPDX-FileCopyrightText: 2026 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Möbius × Landings
// -----------------
// The polygonal-spiral Möbius coloring is the BASE (what each number is built
// from: prime / μ=−1 / μ=0 / μ=+1; twin primes darker). On top, SPARSE markers
// show "significant landings" on the multiplication clock mod p — events that
// are too dense to color everything by, but meaningful to spot against the
// factorization texture:
//   * Laps    — n ≡ 1 (mod p): the × clock completes a full turn back to 1.
//   * Squares — n mod p is a quadratic residue (the square landings, a subgroup).
//   * Roots   — n mod p is a primitive root (a generator of the × clock).
// Question: do any of these classes ALIGN with the Möbius / twin-prime slices,
// or do they cut across them independently?

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const infoEl = document.getElementById('infoEl');
const resetBtn = document.getElementById('resetBtn');
const sidesInput = document.getElementById('sidesInput');
const primeInput = document.getElementById('primeInput');
const lapToggle = document.getElementById('lapToggle');
const qrToggle = document.getElementById('qrToggle');
const rootToggle = document.getElementById('rootToggle');

CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

let isDrawing = false;
let redrawTimeout = null;
const MAX_P = 200003;

// overlay marker colors
const C_LAP = '#111111', C_QR = '#1f6fff', C_ROOT = '#ff7a00';

// --- Möbius sieve (base coloring) ------------------------------------------
const MAX_N = 2000000;
const mu = new Int8Array(MAX_N).fill(1);
const isPrimeArr = new Uint8Array(MAX_N).fill(1);
function initSieve() {
    isPrimeArr[0] = 0; isPrimeArr[1] = 0;
    for (let i = 2; i < MAX_N; i++) {
        if (isPrimeArr[i]) {
            for (let j = i; j < MAX_N; j += i) { if (j > i) isPrimeArr[j] = 0; mu[j] = -mu[j]; }
            const sq = i * i;
            for (let j = sq; j < MAX_N; j += sq) mu[j] = 0;
        }
    }
}

// --- number theory for the × clock -----------------------------------------
function isPrime(n) { if (n < 2) return false; if (n % 2 === 0) return n === 2; for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false; return true; }
function nextPrime(n) { n = Math.max(2, Math.floor(n)); while (!isPrime(n)) n++; return n; }
function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
function modpow(b, e, m) { let r = 1; b %= m; while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e = Math.floor(e / 2); } return r; }
function primitiveRoot(p) {
    if (p === 2) return 1;
    const phi = p - 1; let n = phi; const fac = [];
    for (let f = 2; f * f <= n; f++) { if (n % f === 0) { fac.push(f); while (n % f === 0) n /= f; } }
    if (n > 1) fac.push(n);
    for (let g = 2; g < p; g++) { let ok = true; for (const q of fac) if (modpow(g, phi / q, p) === 1) { ok = false; break; } if (ok) return g; }
    return 2;
}

// --- overlay membership (rebuilt when p changes) ---------------------------
let P = 0, G = 0;
let isLap = null, isQR = null, isRoot = null;     // indexed by residue [0,p)
function buildOverlays(pRaw) {
    const p = Math.min(MAX_P, nextPrime(pRaw));
    if (p === P) return;
    P = p; G = primitiveRoot(p);
    isLap = new Uint8Array(p); isQR = new Uint8Array(p); isRoot = new Uint8Array(p);
    isLap[1 % p] = 1;
    for (let i = 1; i < p; i++) isQR[(i * i) % p] = 1;     // squares
    // primitive roots: dlog coprime to p-1
    let x = 1;
    for (let k = 0; k < p - 1; k++) { if (gcd(k, p - 1) === 1) isRoot[x] = 1; x = (x * G) % p; }
}

function baseColor(n) {
    if (n >= MAX_N) return '#dddddd';
    if (isPrimeArr[n]) {
        const c = SpiralColors.get('prime');
        const twin = (n >= 2 && isPrimeArr[n - 2]) || (n + 2 < MAX_N && isPrimeArr[n + 2]);
        return twin ? SpiralColors.darken(c, 0.85) : c;
    }
    const m = mu[n];
    if (m === -1) return SpiralColors.get('muNeg');
    if (m === 0) return SpiralColors.get('muZero');
    return SpiralColors.get('muPos');
}

// --- drawing ----------------------------------------------------------------
function drawSpiral() {
    if (isDrawing) return;
    isDrawing = true;

    const SIDES = parseInt(sidesInput.value, 10) || 6;
    buildOverlays(parseInt(primeInput.value, 10) || 2);
    if (P !== (parseInt(primeInput.value, 10) || 2)) primeInput.value = P;
    const gg = gcd(SIDES, P);
    let depth = 0, t = SIDES; while (t % P === 0) { depth++; t = Math.floor(t / P); }
    const regime = gg > 1 ? `LOCK ×${depth}` : `drift Δ=${SIDES % P}`;
    infoEl.textContent = `p=${P} · gen ${G} · gcd(${SIDES},${P})=${gg} · ${regime}`;
    writeHash();

    const showLap = lapToggle.classList.contains('active');
    const showQR = qrToggle.classList.contains('active');
    const showRoot = rootToggle.classList.contains('active');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const BASE_SPACING = 0.5, BASE_SIDES = 6, MAX_SPACING = 0.5;
    const SPACING = Math.min(MAX_SPACING, BASE_SPACING * (SIDES / BASE_SIDES));
    const MAX_LAYERS = Math.floor((Math.min(canvas.width, canvas.height) / 2) / SPACING);
    const DOT = 2.2;

    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.lineWidth = SPACING;

    const POLY_VERTS = [];
    const angleStep = 2 * Math.PI / SIDES;
    for (let i = 0; i <= SIDES; i++) POLY_VERTS.push({ x: Math.cos(i * angleStep), y: Math.sin(i * angleStep) });

    let layer = 1;
    const CHUNK_SIZE = Math.max(1, Math.floor(1000 / SIDES));

    function drawChunk() {
        let count = 0;
        while (count < CHUNK_SIZE && layer < MAX_LAYERS) {
            const r = layer * SPACING;
            for (let s = 0; s < SIDES; s++) {
                const n = (layer - 1) * SIDES + s + 1;
                const v1 = POLY_VERTS[s], v2 = POLY_VERTS[s + 1];
                const p1x = cx + r * v1.x, p1y = cy + r * v1.y;
                const p2x = cx + r * v2.x, p2y = cy + r * v2.y;

                ctx.strokeStyle = baseColor(n);
                ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();

                const res = n % P;
                let mark = '';
                if (showRoot && isRoot[res]) mark = C_ROOT;
                else if (showLap && isLap[res]) mark = C_LAP;
                else if (showQR && isQR[res]) mark = C_QR;
                if (mark) {
                    ctx.fillStyle = mark;
                    ctx.beginPath();
                    ctx.arc((p1x + p2x) / 2, (p1y + p2y) / 2, DOT, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
            layer++; count++;
        }
        if (layer < MAX_LAYERS && isDrawing) {
            statusEl.textContent = `⏳ ${layer * SIDES}`;
            requestAnimationFrame(drawChunk);
        } else {
            isDrawing = false;
            statusEl.textContent = `${layer * SIDES}`;
        }
    }
    drawChunk();
}

// --- shareable config in the URL hash --------------------------------------
function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.has('sides')) sidesInput.value = h.get('sides');
    if (h.has('p')) primeInput.value = h.get('p');
    [['laps', lapToggle], ['qr', qrToggle], ['roots', rootToggle]].forEach(([k, btn]) => {
        if (h.has(k)) btn.classList.toggle('active', h.get(k) === '1');
    });
}
function writeHash() {
    const h = new URLSearchParams();
    h.set('sides', parseInt(sidesInput.value, 10) || 6);
    h.set('p', P);
    h.set('laps', lapToggle.classList.contains('active') ? 1 : 0);
    h.set('qr', qrToggle.classList.contains('active') ? 1 : 0);
    h.set('roots', rootToggle.classList.contains('active') ? 1 : 0);
    history.replaceState(null, '', '#' + h.toString());
}

// --- controls ---------------------------------------------------------------
resetBtn.addEventListener('click', () => { isDrawing = false; setTimeout(drawSpiral, 100); });

function wireToggle(btn) {
    btn.addEventListener('click', () => { btn.classList.toggle('active'); resetBtn.click(); });
}
wireToggle(lapToggle); wireToggle(qrToggle); wireToggle(rootToggle);

function debouncedRedraw() {
    if (redrawTimeout) clearTimeout(redrawTimeout);
    redrawTimeout = setTimeout(() => { resetBtn.click(); redrawTimeout = null; }, 300);
}
sidesInput.addEventListener('change', debouncedRedraw);
primeInput.addEventListener('change', debouncedRedraw);

setTimeout(() => { initSieve(); readHash(); drawSpiral(); }, 10);

window.redrawSpiral = function () { isDrawing = false; setTimeout(drawSpiral, 100); };
window.addEventListener('hashchange', () => { readHash(); resetBtn.click(); });
