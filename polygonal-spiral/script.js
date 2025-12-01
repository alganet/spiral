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
const MAX_N = 2000000;
const mu = new Int8Array(MAX_N).fill(1);
const isPrimeArr = new Uint8Array(MAX_N).fill(1);
const omega = new Uint8Array(MAX_N).fill(0);

function initSieve() {
    isPrimeArr[0] = 0;
    isPrimeArr[1] = 0;

    for (let i = 2; i < MAX_N; i++) {
        if (isPrimeArr[i]) {
            for (let j = i; j < MAX_N; j += i) {
                if (j > i) isPrimeArr[j] = 0;
                mu[j] = -mu[j];
                omega[j]++; // Increment distinct prime factor count
            }
            let sq = i * i;
            for (let j = sq; j < MAX_N; j += sq) {
                mu[j] = 0;
            }
        }
    }
}

// initSieve will be called in the deferred execution block



function drawFrequency(SIDES, MAX_LAYERS) {
    if (!SIDES || SIDES < 3) return;

    const densities = new Float32Array(SIDES);
    let maxDensity = 0;
    let minDensity = 1;

    // Calculate average omega per slice
    for (let s = 0; s < SIDES; s++) {
        let omegaSum = 0;
        let totalCount = 0;

        for (let l = 1; l < MAX_LAYERS; l++) {
            const n = (l - 1) * SIDES + s + 1;
            if (n < MAX_N) {
                omegaSum += omega[n];
                totalCount++;
            }
        }

        if (totalCount > 0) {
            densities[s] = omegaSum / totalCount;
            if (densities[s] > maxDensity) maxDensity = densities[s];
            if (densities[s] < minDensity) minDensity = densities[s];
        } else {
            // If no numbers in slice, treat as 0? Or skip?
            // With 10M numbers, this is unlikely unless SIDES is huge.
            // If it happens, let's assume minDensity behavior or 0.
        }
    }

    // If minDensity is still Infinity (no data), set to 0
    if (minDensity === Infinity) minDensity = 0;

    // Radial Drawing Logic
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Calculate spiral radius
    // SPACING logic from drawSpiral:
    const BASE_SPACING = 0.5;
    const BASE_SIDES = 6;
    const MAX_SPACING = 0.5;
    const SPACING = Math.min(MAX_SPACING, BASE_SPACING * (SIDES / BASE_SIDES));
    const spiralRadius = MAX_LAYERS * SPACING;

    // Make wave height proportional to spiral radius for "less flat" look
    const waveHeight = spiralRadius;

    ctx.beginPath();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = '#fbff00EE';
    ctx.lineWidth = SIDES < 50 ? 10 : Math.max(1, 400 / SIDES);

    const points = [];
    const angleStep = (2 * Math.PI) / SIDES;

    // Collect points
    for (let s = 0; s < SIDES; s++) {
        const d = densities[s];

        // Map density to radius using full range [minDensity, maxDensity] -> [0, spiralRadius]
        let normalizedD = 0;
        const range = maxDensity - minDensity;

        if (range > 0.0001) {
            normalizedD = (d - minDensity) / range;
        } else {
            // Let's map to edge to be visible.
            normalizedD = 1.0;
        }

        // Formula: r = normalizedD * waveHeight
        // We add a tiny base to avoid 0 radius issues
        const minRadius = spiralRadius / 10;
        const r = minRadius + normalizedD * (waveHeight - minRadius);

        const theta = (s + 0.5) * angleStep;

        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);

        points.push({ x, y });
    }

    if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);

        // Use linear interpolation for small number of sides to keep it "tight"
        // Use smooth curves for large number of sides
        const useSmoothing = true;

        if (useSmoothing) {
            for (let i = 0; i < points.length; i++) {
                const p0 = points[i];
                const p1 = points[(i + 1) % points.length]; // Wrap around
                const midX = (p0.x + p1.x) / 2;
                const midY = (p0.y + p1.y) / 2;

                if (i === 0) {
                    const last = points[points.length - 1];
                    const midLast = (last.x + p0.x) / 2;
                    const midLastY = (last.y + p0.y) / 2;
                    ctx.moveTo(midLast, midLastY);
                }

                ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
            }
        } else {
            // Linear drawing
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
        }
    }

    if (SIDES >= 30) {
        ctx.closePath();
    }
    ctx.stroke();
}

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

    // Reset composite operation to default for proper canvas clearing
    ctx.globalCompositeOperation = 'source-over';
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

    // Revert to full size, wave will be drawn inside/overlay
    const MAX_LAYERS = Math.floor((Math.min(canvas.width, canvas.height) / 2) / SPACING);

    // Use default source-over mode - no composite tricks needed
    ctx.globalCompositeOperation = 'source-over';

    // Use butt caps and miter joins for precise, non-overlapping lines
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // Set line width to exactly match spacing (no overlap)
    ctx.lineWidth = SPACING;

    // Pre-calculate vertices for a unit polygon with high precision
    const POLY_VERTS = [];
    const angleStep = 2 * Math.PI / SIDES;
    for (let i = 0; i <= SIDES; i++) { // Include i=SIDES for closed loop
        const theta = i * angleStep;
        POLY_VERTS.push({
            x: Math.cos(theta),
            y: Math.sin(theta)
        });
    }

    let layer = 1;
    // Aim for ~1000 segments per frame for visible animation
    const CHUNK_SIZE = Math.max(1, Math.floor(1000 / SIDES));

    function drawChunk() {
        let count = 0;

        while (count < CHUNK_SIZE && layer < MAX_LAYERS) {
            // Use precise radius calculation
            const r = layer * SPACING;

            // Draw SIDES sides for this layer
            for (let s = 0; s < SIDES; s++) {
                // Use BigInt for precise calculation of large numbers
                const layerBig = BigInt(layer - 1);
                const sidesBig = BigInt(SIDES);
                const sBig = BigInt(s);
                const nBig = layerBig * sidesBig + sBig + 1n;

                // Convert back to regular number for array access
                const n = Number(nBig);

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

                // Calculate coordinates with double precision
                const v1 = POLY_VERTS[s];
                const v2 = POLY_VERTS[s + 1];

                const p1x = cx + r * v1.x;
                const p1y = cy + r * v1.y;
                const p2x = cx + r * v2.x;
                const p2y = cy + r * v2.y;

                ctx.beginPath();
                ctx.moveTo(p1x, p1y);
                ctx.lineTo(p2x, p2y);
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
            drawFrequency(SIDES, MAX_LAYERS);
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


