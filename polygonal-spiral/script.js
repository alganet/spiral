// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const sidesInput = document.getElementById('sidesInput');

// Configuration
const PIXEL_SIZE = 3; // Slightly larger for hex grid visibility

// Initialize canvas with fit mode
CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let isDrawing = false;
let redrawTimeout = null;

// Sieve
const MAX_N = 5000000;
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
            let sq = i * i;
            for (let j = sq; j < MAX_N; j += sq) {
                mu[j] = 0;
            }
        }
    }
}

// initSieve will be called in the deferred execution block

function updateInputGlow(n) {
    let color = '';
    if (n < MAX_N) {
        if (isPrimeArr[n]) {
            color = SpiralColors.get('prime');
        } else {
            const m = mu[n];

            // muNeg: '#FFB3BA',
            // muZero: '#BAFFC9',
            // muPos: '#BAE1FF'
            if (m === -1) color = '#81363dff'; // Mobius -1: Red
            else if (m === 0) color = '#04b32a75'; // Mobius 0: Green
            else if (m === 1) color = '#4983ff97'; // Mobius 1: Blue
        }
    }

    if (color) {
        sidesInput.style.boxShadow = `0 0 10px ${color}`;
        sidesInput.style.borderColor = color;
    } else {
        sidesInput.style.boxShadow = '';
        sidesInput.style.borderColor = '';
    }
}

function drawSpiral() {
    if (isDrawing) return;
    isDrawing = true;

    const SIDES = parseInt(sidesInput.value, 10) || 6;
    updateInputGlow(SIDES);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Concentric Polygons Logic
    // Each layer L has SIDES sides.
    // Numbers n are mapped to sides.

    const BASE_SPACING = 0.5;
    const BASE_SIDES = 6;
    const MAX_SPACING = 0.5;
    const SPACING = Math.min(MAX_SPACING, BASE_SPACING * (SIDES / BASE_SIDES));
    const MAX_LAYERS = Math.floor((Math.min(canvas.width, canvas.height) / 2) / SPACING);

    ctx.lineWidth = SPACING + (SPACING / 2); // Slight overlap to avoid gaps

    // Pre-calculate vertices for a unit polygon
    const POLY_VERTS = [];
    for (let i = 0; i < SIDES; i++) {
        const theta = i * 2 * Math.PI / SIDES;
        POLY_VERTS.push({ x: Math.cos(theta), y: Math.sin(theta) });
    }
    // Close the loop
    POLY_VERTS.push(POLY_VERTS[0]);

    let layer = 1;
    // Aim for ~1000 segments per frame for visible animation
    const CHUNK_SIZE = Math.max(1, Math.floor(1000 / SIDES));

    function drawChunk() {
        let count = 0;

        while (count < CHUNK_SIZE && layer < MAX_LAYERS) {
            const r = layer * SPACING;

            // Draw SIDES sides for this layer
            for (let s = 0; s < SIDES; s++) {
                const n = (layer - 1) * SIDES + s + 1;

                // Determine color
                if (n < MAX_N) {
                    if (isPrimeArr[n]) {
                        const baseColor = SpiralColors.get('prime');
                        const isTwin = (n >= 2 && isPrimeArr[n - 2]) || (n + 2 < MAX_N && isPrimeArr[n + 2]);
                        ctx.strokeStyle = isTwin ? SpiralColors.darken(baseColor, 0.85) : baseColor;
                    } else {
                        const m = mu[n];
                        if (m === -1) ctx.strokeStyle = SpiralColors.get('muNeg');
                        else if (m === 0) ctx.strokeStyle = SpiralColors.get('muZero');
                        else if (m === 1) ctx.strokeStyle = SpiralColors.get('muPos');
                    }
                } else {
                    ctx.strokeStyle = '#ddd'; // Out of sieve range
                }

                // Start and End points of the side
                const p1 = {
                    x: cx + r * POLY_VERTS[s].x,
                    y: cy + r * POLY_VERTS[s].y
                };
                const p2 = {
                    x: cx + r * POLY_VERTS[s + 1].x,
                    y: cy + r * POLY_VERTS[s + 1].y
                };

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            layer++;
            count++;
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

resetBtn.addEventListener('click', () => {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
});

sidesInput.addEventListener('change', () => {
    // // Validate even number
    // let val = parseInt(sidesInput.value, 10);
    // if (val % 2 !== 0) {
    //     val += 1;
    //     sidesInput.value = val;
    // }
    // if (val < 6) sidesInput.value = 6;

    // Debounce: clear existing timeout and set a new one
    if (redrawTimeout) {
        clearTimeout(redrawTimeout);
    }
    redrawTimeout = setTimeout(() => {
        resetBtn.click();
        redrawTimeout = null;
    }, 300); // Wait 300ms after last change before redrawing
});

sidesInput.addEventListener('input', () => {
    const val = parseInt(sidesInput.value, 10);
    updateInputGlow(val);
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


