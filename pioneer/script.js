
// Configuration
const MAX_N = 3500000;
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
        if (count < 10) continue;

        const earlyCount = occurrences.filter(p => p < blockSize).length;
        const lateCount = occurrences.filter(p => p > limit - blockSize).length;

        const setEarlyCount = numbers.filter(p => p < blockSize).length;
        const setLateCount = numbers.filter(p => p > limit - blockSize).length;

        const freqEarly = setEarlyCount ? earlyCount / setEarlyCount : 0;
        const freqLate = setLateCount ? lateCount / setLateCount : 0;

        let score = (freqLate > 0) ? (freqEarly / freqLate) : ((freqEarly > 0) ? 100 : 0);

        results.push({
            gap: parseInt(g),
            count: count,
            score: score,
            occurrences: occurrences
        });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
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

function render() {
    // Clear Canvas (White/Transparent)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Pizza Slices (Background)
    const sliceAngle = (2 * Math.PI) / polarModulus;

    // Draw Guidelines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e0e0e0'; // Very light grey
    ctx.globalAlpha = 1.0;

    for (let i = 0; i < polarModulus; i++) {
        const ang = i * sliceAngle - (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(CENTER_X + MAX_RADIUS * Math.cos(ang), CENTER_Y + MAX_RADIUS * Math.sin(ang));
        ctx.stroke();

        // Label removed as per user request
        // ctx.fillStyle = '#999';
        // ctx.textAlign = 'center';
        // ctx.font = '12px monospace';
        // const labelR = MAX_RADIUS + 20;
        // ctx.fillText(`${i}`, CENTER_X + labelR * Math.cos(ang), CENTER_Y + labelR * Math.sin(ang));
    }

    // Draw Nodes (Primes/Current Set)
    ctx.globalAlpha = 1.0;
    // Use SpiralColors if available, otherwise fallback
    const primeColor = (window.SpiralColors && window.SpiralColors.get('prime')) || '#444';
    ctx.fillStyle = primeColor;

    for (let n of currentSet) {
        if (n > MAX_N) break;
        const p = getPolar(n);
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
}

function getObjectName(gap, parentPath) {
    const parentName = parentPath.length > 0 ? parentPath[parentPath.length - 1].name : "Primes";

    if (parentName === "Primes") {
        if (gap === 2) return "Twin Primes";
        if (gap === 4) return "Cousin Primes";
        if (gap === 6) return "Sexy Primes";
    }

    if (parentName === "Twin Primes" && gap === 6) return "Prime Quadruplets";
    if (parentName === "Cousin Primes" && gap === 6) return "Cousin Quadruplets";

    return `Gap ${gap} in ${parentName}`;
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

        const name = getObjectName(cand.gap, selectionPath);

        btn.innerHTML = `${name} <small>(Gap ${cand.gap})</small>`;

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

    for (let i = 0; i < occurrences.length; i++) {
        const startVal = occurrences[i];
        if (startVal > MAX_N) break;

        const pos = startVal / MAX_N;

        let strokeStyle;

        // Standard Blue/Purple for normal
        const hue = 200 + Math.floor(pos * 60);
        const lightness = 40;
        const opacity = Math.max(0.2, 1 - pos * 1.5);
        strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${opacity})`;

        const p1 = getPolar(startVal);
        const p2 = getPolar(startVal + gapSize);

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);

        // Arc Logic
        const angDiff = Math.abs(p1.angle - p2.angle);
        const sameRay = angDiff < 0.01 || Math.abs(angDiff - 2 * Math.PI) < 0.01;

        if (sameRay) {
            // Curve out more significantly to form distinct "Petals" or "Arches"
            // Scale offset by radius so outer loops are larger
            const loopHeight = 30 + (p1.r / MAX_RADIUS) * 50;

            const offsetX = -Math.sin(p1.angle) * loopHeight;
            const offsetY = Math.cos(p1.angle) * loopHeight;

            // Midpoint with offset
            const midX = (p1.x + p2.x) / 2 + offsetX;
            const midY = (p1.y + p2.y) / 2 + offsetY;

            ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        } else {
            ctx.lineTo(p2.x, p2.y);
        }

        ctx.stroke();
    }
}

function selectGap(candidate, name) {
    selectionPath.push({ gap: candidate.gap, name: name });
    currentSet = candidate.occurrences;
    updateUI();
    visualizeGap(candidate, candidate.score > 2.0);
}

function reset() {
    currentSet = primes;
    selectionPath = [];
    render();
    updateUI();
}

resetBtn.onclick = reset;
initSieve();
