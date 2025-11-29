// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// Configuration
const PIXEL_SIZE = 2;

// Initialize canvas with fit mode
CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let isDrawing = false;

// Sieve for Mobius function and Primality
const MAX_N = 200000; // Sufficient for 800x800 with c=1.5
const mu = new Int8Array(MAX_N).fill(1);
const isPrimeArr = new Uint8Array(MAX_N).fill(1);

function initSieve() {
    isPrimeArr[0] = 0;
    isPrimeArr[1] = 0;

    for (let i = 2; i < MAX_N; i++) {
        if (isPrimeArr[i]) {
            for (let j = i; j < MAX_N; j += i) {
                if (j > i) isPrimeArr[j] = 0;
                mu[j] = -mu[j];
            }
            // Squares
            let sq = i * i;
            for (let j = sq; j < MAX_N; j += sq) {
                mu[j] = 0;
            }
        }
    }
}

function drawSpiral() {
    if (isDrawing) return;
    isDrawing = true;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let num = 1;

    // Scaling factors
    // r = c * sqrt(n)
    // theta = sqrt(n) * 2 * PI
    const c = 1.5; // Spacing between turns

    const CHUNK_SIZE = 1000;

    function drawChunk() {
        let count = 0;

        while (count < CHUNK_SIZE) {
            const r = c * Math.sqrt(num);
            const theta = Math.sqrt(num) * 2 * Math.PI;

            // Convert to Cartesian
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);

            // Check bounds - stop when we hit the inscribed circle
            const maxRadius = Math.min(canvas.width, canvas.height) / 2;
            if (r > maxRadius) {
                isDrawing = false;
                statusEl.textContent = `${num}`;
                return;
            }

            if (num < MAX_N) {
                if (isPrimeArr[num]) {
                    const baseColor = SpiralColors.get('prime');
                    const isTwin = (num >= 2 && isPrimeArr[num - 2]) || (num + 2 < MAX_N && isPrimeArr[num + 2]);
                    ctx.fillStyle = isTwin ? SpiralColors.darken(baseColor, 0.85) : baseColor;
                    ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
                } else {
                    // Non-prime, color by Mobius
                    const m = mu[num];
                    if (m === -1) ctx.fillStyle = SpiralColors.get('muNeg'); // μ = -1
                    else if (m === 0) ctx.fillStyle = SpiralColors.get('muZero'); // μ = 0
                    else if (m === 1) ctx.fillStyle = SpiralColors.get('muPos'); // μ = 1

                    ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
                }
            }

            num++;
            count++;
        }

        if (isDrawing) {
            statusEl.textContent = `⏳ ${num}`;
            requestAnimationFrame(drawChunk);
        }
    }

    drawChunk();
}

resetBtn.addEventListener('click', () => {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
});

// Defer heavy calculation to allow UI to update canvas size first
setTimeout(() => {
    initSieve();
    drawSpiral();
}, 10);

// Expose redraw function for color changes
window.redrawSpiral = function () {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
};
