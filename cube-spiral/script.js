// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// Configuration
const PIXEL_SIZE = 3;
const CUBE_OPACITY = 1;

// Initialize canvas with fit mode
CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let isDrawing = false;

// Sieve
const MAX_N = 200000;
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

initSieve();

function drawSpiral() {
    if (isDrawing) return;
    isDrawing = true;

    const SIDES = 6;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const SPACING = 2;
    const MAX_LAYERS = Math.floor((Math.min(canvas.width, canvas.height) / 2) / SPACING);

    ctx.lineWidth = SPACING + 1;

    // Pre-calculate vertices for a unit hexagon, ROTATED by 30 degrees (PI/6)
    // Normal hex starts at 0 (Right). Rotated starts at 30 deg (Bottom-Right) if we want pointy top?
    // Pointy top hex has vertices at 30, 90, 150, 210, 270, 330 degrees.
    // Let's check:
    // 0 deg is Right.
    // 30 deg is Down-Right (screen coords).
    // 90 deg is Down.
    // 270 deg is Up.
    // So vertices at 30, 90, 150, 210, 270, 330 gives a pointy top/bottom hex.
    // Let's try that.

    const POLY_VERTS = [];
    for (let i = 0; i < SIDES; i++) {
        const theta = (i * 2 * Math.PI / SIDES) + (Math.PI / 6); // Add 30 degrees
        POLY_VERTS.push({ x: Math.cos(theta), y: Math.sin(theta) });
    }
    POLY_VERTS.push(POLY_VERTS[0]);

    let layer = 1;
    const CHUNK_SIZE = 100;

    function drawChunk() {
        let count = 0;

        while (count < CHUNK_SIZE && layer < MAX_LAYERS) {
            const r = layer * SPACING;

            for (let s = 0; s < SIDES; s++) {
                const n = (layer - 1) * SIDES + s + 1;

                if (n < MAX_N) {
                    if (isPrimeArr[n]) {
                        ctx.strokeStyle = SpiralColors.get('prime');
                    } else {
                        const m = mu[n];
                        if (m === -1) ctx.strokeStyle = SpiralColors.get('muNeg');
                        else if (m === 0) ctx.strokeStyle = SpiralColors.get('muZero');
                        else if (m === 1) ctx.strokeStyle = SpiralColors.get('muPos');
                    }
                } else {
                    ctx.strokeStyle = '#ddd';
                }

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
            drawCubeOverlay(layer * SPACING);
        }
    }

    drawChunk();
}

function drawCubeOverlay(radius) {
    ctx.save();
    ctx.globalAlpha = CUBE_OPACITY;

    // Draw transparent cube outline
    // The outline is just the hexagon at max radius.
    // Plus 3 inner lines.

    // Vertices are at 30, 90, 150, 210, 270, 330.
    // Indices in POLY_VERTS (0 to 5):
    // 0: 30 deg (Down-Right)
    // 1: 90 deg (Down)
    // 2: 150 deg (Down-Left)
    // 3: 210 deg (Up-Left)
    // 4: 270 deg (Up)
    // 5: 330 deg (Up-Right)

    // For a cube look (isomeric):
    // Center is the corner closest to viewer? Or farthest?
    // Usually "Y" shape in the center.
    // Lines from center to 90 (Down), 210 (Up-Left), 330 (Up-Right).
    // Indices: 1, 3, 5.

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Helper to get vertex coordinates
    function getVert(index, r) {
        const theta = (index * 2 * Math.PI / 6) + (Math.PI / 6);
        return {
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta)
        };
    }

    // Draw Faces (Shading)

    // Draw Faces (Shading)

    // Draw Faces (Shading)

    // Top Face: Center -> 3 (210) -> 4 (270) -> 5 (330) -> Center
    // Gradient from Top (4) to Center.
    const gradTop = ctx.createLinearGradient(
        getVert(4, radius).x, getVert(4, radius).y,
        cx, cy
    );
    gradTop.addColorStop(0, '#ffffff'); // White at Top
    gradTop.addColorStop(1, '#aaaaaa'); // Gray at Center

    ctx.fillStyle = gradTop;
    ctx.beginPath();
    ctx.globalCompositeOperation = 'multiply';
    ctx.moveTo(cx, cy);
    ctx.lineTo(getVert(3, radius).x, getVert(3, radius).y);
    ctx.lineTo(getVert(4, radius).x, getVert(4, radius).y);
    ctx.lineTo(getVert(5, radius).x, getVert(5, radius).y);
    ctx.closePath();
    ctx.fill();

    // Left Face: Center -> 1 (90) -> 2 (150) -> 3 (210) -> Center
    // Gradient from Top-Left (3) to Bottom (1).
    const gradLeft = ctx.createLinearGradient(
        getVert(3, radius).x, getVert(3, radius).y,
        getVert(1, radius).x, getVert(1, radius).y
    );
    gradLeft.addColorStop(0, '#dddddd'); // Light Gray
    gradLeft.addColorStop(1, '#777777'); // Dark Gray

    ctx.fillStyle = gradLeft;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(getVert(1, radius).x, getVert(1, radius).y);
    ctx.lineTo(getVert(2, radius).x, getVert(2, radius).y);
    ctx.lineTo(getVert(3, radius).x, getVert(3, radius).y);
    ctx.closePath();
    ctx.fill();

    // Right Face: Center -> 5 (330) -> 0 (30) -> 1 (90) -> Center
    // Gradient from Top-Right (5) to Bottom (1).
    const gradRight = ctx.createLinearGradient(
        getVert(5, radius).x, getVert(5, radius).y,
        getVert(1, radius).x, getVert(1, radius).y
    );
    gradRight.addColorStop(0, '#555555'); // Dark Gray
    gradRight.addColorStop(1, '#111111'); // Black

    ctx.fillStyle = gradRight;
    ctx.beginPath();
    ctx.ble
    ctx.moveTo(cx, cy);
    ctx.lineTo(getVert(5, radius).x, getVert(5, radius).y);
    ctx.lineTo(getVert(0, radius).x, getVert(0, radius).y);
    ctx.lineTo(getVert(1, radius).x, getVert(1, radius).y);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black for visibility
    ctx.lineJoin = 'round';

    // Outer Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const v = getVert(i, radius);
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner "Y"
    // Connect center to vertices 1, 3, 5
    const indices = [1, 3, 5];
    for (let i of indices) {
        const v = getVert(i, radius);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
    }

    ctx.restore();
}

resetBtn.addEventListener('click', () => {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
});

drawSpiral();

// Expose redraw function for color changes
window.redrawSpiral = function () {
    isDrawing = false;
    setTimeout(() => {
        drawSpiral();
    }, 100);
};
