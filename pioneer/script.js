
// Configuration
const MAX_N = 20000000;
const PIXEL_SIZE = 1;
const CENTER_X = window.innerWidth / 2;
const CENTER_Y = window.innerHeight / 2;
const MAX_RADIUS = Math.min(CENTER_X, CENTER_Y) - 40;

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const breadcrumbEl = document.getElementById('breadcrumb');
const optionsEl = document.getElementById('options');
const statsEl = document.getElementById('stats');
const resetBtn = document.getElementById('resetBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// State
let primes = [];
let currentSet = [];
let selectionPath = [];
let polarModulus = 28; // Configurable Slices

function initSieve() {
    const LIMIT = MAX_N;
    const isPrime = new Uint8Array(LIMIT + 1).fill(1);
    isPrime[0] = isPrime[1] = 0;
    for (let i = 2; i * i <= LIMIT; i++) {
        if (isPrime[i]) {
            for (let j = i * i; j <= LIMIT; j += i) {
                isPrime[j] = 0;
            }
        }
    }
    for (let i = 0; i <= LIMIT; i++) {
        if (isPrime[i]) primes.push(i);
    }
    reset();
}

function analyzeGaps(numbers) {
    const gaps = {};
    const limit = numbers[numbers.length - 1];

    for (let i = 0; i < numbers.length - 1; i++) {
        const g = numbers[i + 1] - numbers[i];
        if (!gaps[g]) gaps[g] = [];
        gaps[g].push(numbers[i]);
    }

    const results = [];
    const blockCount = 10;
    const blockSize = Math.floor(limit / blockCount) || 1000;

    for (const g in gaps) {
        const occurrences = gaps[g];
        const count = occurrences.length;
        if (count < 100) continue;

        results.push({
            gap: parseInt(g),
            count: count,
            occurrences: occurrences
        });
    }

    results.sort((a, b) => b.count - a.count);
    return results.slice(0, 10);
}

// Polar Mapping
function getPolar(n) {
    const residue = n % polarModulus;
    // Map residue to angle. 
    const sliceAngle = (2 * Math.PI) / polarModulus;
    const angle = residue * sliceAngle - (Math.PI / 2);

    // Radius
    const r = Math.sqrt(n / MAX_N) * MAX_RADIUS;

    return {
        x: CENTER_X + r * Math.cos(angle),
        y: CENTER_Y + r * Math.sin(angle),
        angle: angle,
        r: r
    };
}

// Optimization: Pre-allocate lookup tables
let cosTable = new Float32Array(0);
let sinTable = new Float32Array(0);
let lastModulus = 0;

function updateTrigTables() {
    if (polarModulus === lastModulus) return;

    cosTable = new Float32Array(polarModulus);
    sinTable = new Float32Array(polarModulus);
    const sliceAngle = (2 * Math.PI) / polarModulus;

    for (let i = 0; i < polarModulus; i++) {
        const angle = i * sliceAngle - (Math.PI / 2);
        cosTable[i] = Math.cos(angle);
        sinTable[i] = Math.sin(angle);
    }
    lastModulus = polarModulus;
}

function render() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ensure tables are up to date
    updateTrigTables();

    // Draw Nodes (Primes/Current Set) using ImageData for raw speed
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Get Theme Color
    const hex = (window.SpiralColors && window.SpiralColors.get('prime')) || '#444444';
    let rVal = 68, gVal = 68, bVal = 68;

    // Simple Hex Parser
    if (hex.startsWith('#')) {
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        rVal = (num >> 16) & 255;
        gVal = (num >> 8) & 255;
        bVal = num & 255;
    }

    const aVal = 255;

    // Optimization: Lift constants out of loop
    const limit = currentSet.length;
    // We iterate backwards or forwards? internal array is sorted.

    for (let i = 0; i < limit; i++) {
        const n = currentSet[i];
        if (n > MAX_N) break;

        // Inline getPolar logic
        const residue = n % polarModulus;
        const r = Math.sqrt(n / MAX_N) * MAX_RADIUS;

        // Use lookup tables
        // x = cx + r * cos(angle)
        const x = (CENTER_X + r * cosTable[residue]) | 0; // Floor
        const y = (CENTER_Y + r * sinTable[residue]) | 0; // Floor

        if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            data[idx] = rVal;
            data[idx + 1] = gVal;
            data[idx + 2] = bVal;
            data[idx + 3] = aVal;

            // Optional: Draw 2x2 or 3x3 if PIXEL_SIZE > 1? 
            // User set PIXEL_SIZE = 1, so 1 pixel is fine.
            // If we wanted 3x3 (previous CROSS pattern), we'd need more writes.
            // For >1M points, 1px is cleaner.
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Pizza Slices (Background) - Keep vector for smooth lines
    // Draw AFTER ImageData because putImageData clears the rect
    const sliceAngle = (2 * Math.PI) / polarModulus;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e0e0e0';
    ctx.globalAlpha = 1.0;

    for (let i = 0; i < polarModulus; i++) {
        // Use lookup table for endpoints
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(CENTER_X + MAX_RADIUS * cosTable[i], CENTER_Y + MAX_RADIUS * sinTable[i]);
        ctx.stroke();
    }
}

function getObjectName(candidate, parentPath) {
    const parentFullName = parentPath.length > 0 ? parentPath[parentPath.length - 1].name : "Primes";
    const gap = candidate.gap;
    const parentName = parentFullName.substring(0, parentFullName.indexOf('(')) || parentFullName;

    if (parentName === "Primes") {
        if (gap === 2) return `Twin Primes (${candidate.count})`;
        if (gap === 4) return `Cousin Primes (${candidate.count})`;
        if (gap === 6) return `Sexy Primes (${candidate.count})`;
    }

    if (parentName === "Twin Primes" && gap === 6) return `Prime Quadruplets (${candidate.count})`;
    if (parentName === "Cousin Primes" && gap === 6) return `Cousin Quadruplets (${candidate.count})`;

    return `Gap ${gap} in ${parentName} (${candidate.count})`;
}

function updateUI() {
    let pathStr = "Primes";
    selectionPath.forEach(p => pathStr += ` > ${p.name}`);
    breadcrumbEl.textContent = pathStr;

    const candidates = analyzeGaps(currentSet);

    optionsEl.innerHTML = '';

    // Add Slice Control
    const controlsDiv = document.createElement('div');
    controlsDiv.style.marginBottom = "15px";
    controlsDiv.style.paddingBottom = "10px";
    controlsDiv.style.borderBottom = "1px solid #ddd";

    controlsDiv.innerHTML = `
        <label style="display:block; margin-bottom:5px; font-weight:bold; color: #333;">Slices: ${polarModulus}</label>
        <input type="range" min="12" max="144" value="${polarModulus}" style="width:100%">
    `;

    const slider = controlsDiv.querySelector('input');
    slider.oninput = (e) => {
        polarModulus = parseInt(e.target.value);
        controlsDiv.querySelector('label').textContent = `Slices: ${polarModulus}`;

        if (selectionPath.length > 0) {
            const lastSelection = selectionPath[selectionPath.length - 1];
            // Reconstruct candidate to redraw lines
            const candidate = {
                gap: lastSelection.gap,
                occurrences: currentSet
            };
            visualizeGap(candidate);
        } else {
            render();
        }
    };

    optionsEl.appendChild(controlsDiv);

    if (candidates.length === 0) {
        const msg = document.createElement('div');
        msg.className = "option-btn";
        msg.textContent = "No significant patterns found.";
        optionsEl.appendChild(msg);
        return;
    }

    const countDiv = document.createElement('div');
    countDiv.style.marginBottom = "10px";
    countDiv.style.fontWeight = "bold";
    countDiv.style.color = "#333";
    countDiv.textContent = `Found ${currentSet.length.toLocaleString()} items`;
    optionsEl.appendChild(countDiv);

    candidates.forEach(cand => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';

        const name = getObjectName(cand, selectionPath);

        btn.innerHTML = `${name}`;

        btn.onclick = () => {
            selectGap(cand, name);
        };

        btn.onmouseenter = () => visualizeGap(cand);
        btn.onmouseleave = () => render();

        optionsEl.appendChild(btn);
    });

    statsEl.textContent = `Displayed: ${Math.min(currentSet.length, MAX_N)}`;
}

function visualizeGap(candidate) {
    render();

    const occurrences = candidate.occurrences;
    const gapSize = candidate.gap;

    ctx.lineWidth = 1;

    // Performance Optimization: Batch drawing calls
    // Individual stroke() calls for 100k+ lines causes freezing/disappearing
    // We use a unified color for the batch to allow massive performance gain.

    const BATCH_SIZE = 2000;

    // Unified Color for Gap Lines (Cyan/Blue)
    // Dynamic opacity based on density could go here, but fixed is safer for performance
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';

    ctx.beginPath();

    for (let i = 0; i < occurrences.length; i++) {
        const startVal = occurrences[i];
        if (startVal > MAX_N) break;

        const p1 = getPolar(startVal);
        const p2 = getPolar(startVal + gapSize);

        // Move to start
        ctx.moveTo(p1.x, p1.y);

        // Arc Logic
        const angDiff = Math.abs(p1.angle - p2.angle);
        const sameRay = angDiff < 0.01 || Math.abs(angDiff - 2 * Math.PI) < 0.01;

        if (sameRay) {
            // "Petal"
            const loopHeight = 30 + (p1.r / MAX_RADIUS) * 50;
            const offsetX = -Math.sin(p1.angle) * loopHeight;
            const offsetY = Math.cos(p1.angle) * loopHeight;
            const midX = (p1.x + p2.x) / 2 + offsetX;
            const midY = (p1.y + p2.y) / 2 + offsetY;
            ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        } else {
            // Line
            ctx.lineTo(p2.x, p2.y);
        }

        // Flush batch
        if (i > 0 && i % BATCH_SIZE === 0) {
            ctx.stroke();
            ctx.beginPath();
        }
    }

    // Final flush
    ctx.stroke();
}

function selectGap(candidate, name) {
    selectionPath.push({ gap: candidate.gap, name: name });
    currentSet = candidate.occurrences;
    updateUI();
    visualizeGap(candidate);
}

function reset() {
    currentSet = primes;
    selectionPath = [];
    render();
    updateUI();
}

resetBtn.onclick = reset;
initSieve();
