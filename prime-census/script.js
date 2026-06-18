// SPDX-FileCopyrightText: 2026 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Prime-Field Census
// ------------------
// For each prime p and a fixed base g, g is a QUADRATIC RESIDUE iff
// g^((p-1)/2) == 1 (mod p), and a PRIMITIVE ROOT iff g^((p-1)/q) != 1 for every
// prime q | p-1. We sweep primes and plot the cumulative fraction of primes
// where g is a primitive root (-> Artin's constant ~0.3739) and where g is a QR
// (-> 0.5). g=5 deviates from Artin: the real correction factor, visible.

const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const runBtn = document.getElementById('runBtn');
const nInput = document.getElementById('nInput');
const legendEl = document.getElementById('legend');

CanvasFit.init(canvas);
let SIZE = window.CANVAS_SIZE || CanvasFit.getSize();
canvas.width = SIZE; canvas.height = Math.round(SIZE * 0.62);

const ARTIN = 0.3739558136;
const GS = [
    { g: 2, c: '#1f6fff' }, { g: 3, c: '#1aa64b' }, { g: 5, c: '#e6322e' },
    { g: 6, c: '#f08c00' }, { g: 7, c: '#8b3fc9' }, { g: 10, c: '#0bb3b3' },
];

function modpow(b, e, m) { let r = 1; b %= m; while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e = Math.floor(e / 2); } return r; }
function primeFactors(n) { const f = []; let d = 2; while (d * d <= n) { if (n % d === 0) { f.push(d); while (n % d === 0) n /= d; } d += d === 2 ? 1 : 2; } if (n > 1) f.push(n); return f; }

function sieve(N) {
    const s = new Uint8Array(N).fill(1); s[0] = s[1] = 0;
    for (let i = 2; i * i < N; i++) if (s[i]) for (let j = i * i; j < N; j += i) s[j] = 0;
    const ps = []; for (let i = 3; i < N; i += 2) if (s[i]) ps.push(i);   // odd primes only
    return ps;
}

let series = null, finals = null;

function compute() {
    const N = Math.max(1000, Math.min(2_000_000, parseInt(nInput.value, 10) || 150000));
    nInput.value = N;
    const primes = sieve(N);
    const pr = GS.map(() => 0), qr = GS.map(() => 0), tot = GS.map(() => 0);
    const step = Math.max(1, Math.floor(primes.length / 600));
    series = GS.map(() => ({ pr: [], qr: [] }));   // sampled cumulative fractions
    let processed = 0;
    for (const p of primes) {
        const fac = primeFactors(p - 1);
        const half = (p - 1) / 2;
        for (let gi = 0; gi < GS.length; gi++) {
            const g = GS[gi].g; if (g % p === 0) continue;
            tot[gi]++;
            if (modpow(g, half, p) === 1) qr[gi]++;
            let isRoot = true;
            for (const q of fac) if (modpow(g, (p - 1) / q, p) === 1) { isRoot = false; break; }
            if (isRoot) pr[gi]++;
        }
        processed++;
        if (processed % step === 0) {
            for (let gi = 0; gi < GS.length; gi++) {
                series[gi].pr.push([tot[gi], pr[gi] / tot[gi]]);
                series[gi].qr.push([tot[gi], qr[gi] / tot[gi]]);
            }
        }
    }
    finals = GS.map((G, gi) => ({ g: G.g, c: G.c, pr: pr[gi] / tot[gi], qr: qr[gi] / tot[gi] }));
    statusEl.textContent = `${primes.length} primes`;
    draw();
    renderLegend();
}

function draw() {
    if (!series) return;
    const W = canvas.width, H = canvas.height;
    const L = 56, R = 16, T = 16, B = 34;
    const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
    const yMin = 0.33, yMax = 0.52;
    const maxX = Math.max(...series[0].pr.map(p => p[0]));
    const sx = v => x0 + (v / maxX) * (x1 - x0);
    const sy = v => y1 - ((v - yMin) / (yMax - yMin)) * (y1 - y0);

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    // grid + reference lines
    ctx.strokeStyle = '#e7e7e7'; ctx.fillStyle = '#888'; ctx.font = '11px system-ui, sans-serif';
    ctx.lineWidth = 1;
    for (let v = 0.34; v <= 0.52001; v += 0.02) {
        ctx.beginPath(); ctx.moveTo(x0, sy(v)); ctx.lineTo(x1, sy(v)); ctx.stroke();
        ctx.fillText(v.toFixed(2), 6, sy(v) + 3);
    }
    const refLine = (v, col, label) => {
        ctx.strokeStyle = col; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0, sy(v)); ctx.lineTo(x1, sy(v)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = col; ctx.fillText(label, x1 - 150, sy(v) - 4);
    };
    refLine(0.5, '#555', 'perfect-square fraction → 0.5');
    refLine(ARTIN, '#222', `full-tour average ≈ ${ARTIN.toFixed(4)} (Artin)`);

    // primitive-root curves
    ctx.lineWidth = 1.8;
    series.forEach((s, gi) => {
        ctx.strokeStyle = GS[gi].c; ctx.beginPath();
        s.pr.forEach((pt, i) => { const X = sx(pt[0]), Y = sy(pt[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke();
    });
    ctx.fillStyle = '#888';
    ctx.fillText('how often each number takes the full tour  (across more and more primes →)', x0 + 4, y1 + 24);
}

function renderLegend() {
    legendEl.innerHTML = finals.map(f =>
        `<span><span class="swatch" style="background:${f.c}"></span>g=${f.g}: full tour ${f.pr.toFixed(4)} · square ${f.qr.toFixed(4)}</span>`
    ).join('');
}

runBtn.addEventListener('click', () => { statusEl.textContent = '⏳'; setTimeout(compute, 20); });
window.redrawSpiral = function () { SIZE = window.CANVAS_SIZE || CanvasFit.getSize(); canvas.width = SIZE; canvas.height = Math.round(SIZE * 0.62); draw(); };
setTimeout(compute, 20);
