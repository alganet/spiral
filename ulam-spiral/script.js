// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// Configuration
const PIXEL_SIZE = 2; // Size of each dot

// Initialize canvas with fit mode
CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let isDrawing = false;

// Sieve for Mobius function and Primality
const MAX_N = Math.ceil((CANVAS_SIZE * CANVAS_SIZE) / (PIXEL_SIZE * PIXEL_SIZE)) + 1000;
const mu = new Int8Array(MAX_N).fill(1);
const isPrimeArr = new Uint8Array(MAX_N).fill(1); // 1 for prime, 0 for composite

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

initSieve();

function drawSpiral() {
    if (isDrawing) return;
    isDrawing = true;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);

    let x = cx;
    let y = cy;

    let num = 1;
    let stepSize = 1;
    let direction = 0; // 0: right, 1: up, 2: left, 3: down
    let stepsTaken = 0;
    let stepChangeCount = 0;

    const maxSteps = (canvas.width * canvas.height) / (PIXEL_SIZE * PIXEL_SIZE); // Approximate limit

    // Using requestAnimationFrame for non-blocking drawing if it gets heavy, 
    // but for simple dots, a loop might be fast enough. 
    // Let's do chunks to keep UI responsive.

    const CHUNK_SIZE = 2000;

    function drawChunk() {
        let count = 0;

        while (count < CHUNK_SIZE) {
            // Check if out of bounds (rough check)
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
                // We might go out and come back in, but for a spiral starting center, 
                // once we are far out, we are likely done for that direction.
                // However, the spiral grows outwards, so eventually we leave the canvas.
                // A simple distance check from center might be better termination.
                if (Math.abs(x - cx) > canvas.width / 2 + 50 && Math.abs(y - cy) > canvas.height / 2 + 50) {
                    isDrawing = false;
                    statusEl.textContent = `${num}`;
                    return;
                }
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

            // Move
            switch (direction) {
                case 0: x += PIXEL_SIZE; break; // Right
                case 1: y -= PIXEL_SIZE; break; // Up
                case 2: x -= PIXEL_SIZE; break; // Left
                case 3: y += PIXEL_SIZE; break; // Down
            }

            num++;
            stepsTaken++;

            if (stepsTaken === stepSize) {
                stepsTaken = 0;
                direction = (direction + 1) % 4;
                stepChangeCount++;

                if (stepChangeCount === 2) {
                    stepSize++;
                    stepChangeCount = 0;
                }
            }

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
    isDrawing = false; // Stop current if any
    // Small delay to allow loop to exit
    setTimeout(() => {
        drawSpiral();
    }, 100);
});

// Initial draw
drawSpiral();

// Expose redraw function for color changes
window.redrawSpiral = function () {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
};
