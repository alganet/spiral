// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Multiplication Clock
// ---------------------
// Lay the non-zero numbers 0..p-1 around a ring and SEE that multiplying
// mod p is just *stepping* around that ring. The trick: when p is prime,
// repeatedly multiplying by a single "step-maker" g visits every non-zero
// number exactly once. Order the ring by that walk and multiplication
// becomes a constant rotation -- the same "clock" idea behind the
// polygonal-spiral, but driven by * instead of +.

const canvas = document.getElementById('clockCanvas');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const primeInput = document.getElementById('primeInput');
const aInput = document.getElementById('aInput');
const bInput = document.getElementById('bInput');
const generateBtn = document.getElementById('generateBtn');
const arrangeBtn = document.getElementById('arrangeBtn');
const orbitBtn = document.getElementById('orbitBtn');

// Initialize canvas with shared fit mode
CanvasFit.init(canvas);
const CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let arrangeBySteps = true;   // ring ordered by g-steps (true) or by value (false)
let showOrbit = true;        // trace a, a*b, a*b^2, ... around the ring
let animToken = 0;           // cancels in-flight animation when we redraw

const COLORS = {
    ring: '#cfcfcf',
    ringPrime: '#999999',
    a: '#2e7dd6',     // starting number (blue)
    b: '#3aa657',     // the multiplier / step size (green)
    product: '#e0533d', // the answer (red)
    orbit: '#e0533d',
    text: '#333333',
    faint: '#bbbbbb',
};

// ---------------------------------------------------------------------------
// Number theory helpers (small p only -- this is a teaching toy)
// ---------------------------------------------------------------------------

function isPrime(n) {
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function distinctPrimeFactors(n) {
    const factors = [];
    let m = n;
    for (let d = 2; d * d <= m; d++) {
        if (m % d === 0) {
            factors.push(d);
            while (m % d === 0) m /= d;
        }
    }
    if (m > 1) factors.push(m);
    return factors;
}

function powmod(base, exp, mod) {
    let result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = (result * base) % mod;
        base = (base * base) % mod;
        exp = Math.floor(exp / 2);
    }
    return result;
}

// Smallest primitive root (step-maker) g of a prime p: a number whose powers
// g^0, g^1, ... cycle through all p-1 non-zero residues before repeating.
function primitiveRoot(p) {
    if (p === 2) return 1;
    const order = p - 1;
    const factors = distinctPrimeFactors(order);
    for (let g = 2; g < p; g++) {
        let ok = true;
        for (const q of factors) {
            if (powmod(g, order / q, p) === 1) { ok = false; break; }
        }
        if (ok) return g;
    }
    return null;
}

// Build the ring: stepOf[value] = how many g-steps reach `value`;
// valueAt[step] = the value sitting at that step. (For value 0 there is no
// step -- it is not a power of g, it lives in the centre.)
function buildRing(p, g) {
    const stepOf = new Array(p).fill(-1);
    const valueAt = new Array(p - 1).fill(0);
    let v = 1;
    for (let s = 0; s < p - 1; s++) {
        valueAt[s] = v;
        stepOf[v] = s;
        v = (v * g) % p;
    }
    return { stepOf, valueAt };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

let MODEL = null; // { p, g, stepOf, valueAt }

function geom() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R = Math.min(cx, cy) * 0.78;
    return { cx, cy, R };
}

// Angle (radians) where a given residue value sits on the ring, depending on
// the current arrangement. Starts at the top, goes clockwise.
function angleOf(value) {
    const { p } = MODEL;
    const v = ((value % p) + p) % p;
    if (arrangeBySteps) {
        const s = MODEL.stepOf[v];
        return -Math.PI / 2 + (2 * Math.PI * s) / (p - 1);
    }
    // arrange by raw value (the "natural" / polygonal-spiral ordering)
    return -Math.PI / 2 + (2 * Math.PI * v) / p;
}

// Pixel position of a residue. Value 0 has no place on the ring -> centre.
function posOf(value) {
    const { cx, cy, R } = geom();
    const { p } = MODEL;
    const v = ((value % p) + p) % p;
    if (v === 0) return { x: cx, y: cy };
    const a = angleOf(v);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function clear() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRing() {
    const { cx, cy, R } = geom();
    const { p, valueAt } = MODEL;
    const n = p - 1;
    const showLabels = n <= 60;

    // faint guide circle
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    ctx.stroke();

    const dotR = n <= 40 ? 5 : n <= 200 ? 3 : 2;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
        const value = arrangeBySteps ? valueAt[i] : (i + 1);
        const { x, y } = posOf(value);

        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, 2 * Math.PI);
        ctx.fillStyle = isPrime(value) ? COLORS.ringPrime : COLORS.ring;
        ctx.fill();

        if (showLabels) {
            const lx = cx + (R + 16) * Math.cos(angleOf(value));
            const ly = cy + (R + 16) * Math.sin(angleOf(value));
            ctx.fillStyle = COLORS.text;
            ctx.fillText(String(value), lx, ly);
        }
    }

    // centre marker for 0
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = COLORS.faint;
    ctx.fill();
    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px monospace';
    ctx.fillText('0', cx, cy - 12);
}

function drawDot(value, color, label, radius = 8) {
    const { x, y } = posOf(value);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const { cx, cy, R } = geom();
        const a = angleOf(value);
        const lx = cx + (R + 34) * Math.cos(a);
        const ly = cy + (R + 34) * Math.sin(a);
        ctx.fillText(label, lx, ly);
    }
}

// Draw the hop from one residue to another. In step-arrangement this is an
// arc along the ring (a real rotation); otherwise a straight chord.
function drawHop(fromVal, toVal, color, progress = 1, withArrow = true) {
    const { cx, cy, R } = geom();
    const { p } = MODEL;
    const fv = ((fromVal % p) + p) % p;
    const tv = ((toVal % p) + p) % p;
    if (fv === 0 || tv === 0) {
        // a hop into / out of 0 -- just draw a straight line to the centre
        const from = posOf(fromVal), to = posOf(toVal);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        return;
    }

    if (arrangeBySteps) {
        let a0 = angleOf(fv);
        let a1 = angleOf(tv);
        // always sweep forward (clockwise / increasing angle)
        let delta = a1 - a0;
        while (delta <= 0) delta += 2 * Math.PI;
        const aEnd = a0 + delta * progress;
        const arcR = R * 0.86;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, a0, aEnd);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (withArrow) drawArrowHead(cx + arcR * Math.cos(aEnd), cy + arcR * Math.sin(aEnd), aEnd + Math.PI / 2, color);
    } else {
        const from = posOf(fv), to = posOf(tv);
        const ex = from.x + (to.x - from.x) * progress;
        const ey = from.y + (to.y - from.y) * progress;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (withArrow) drawArrowHead(ex, ey, Math.atan2(to.y - from.y, to.x - from.x), color);
    }
}

function drawArrowHead(x, y, angle, color) {
    const size = 9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.4), y - size * Math.sin(angle - 0.4));
    ctx.lineTo(x - size * Math.cos(angle + 0.4), y - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

function setStatus(html) {
    statusEl.innerHTML = html;
}

function render() {
    const myToken = ++animToken;

    const p = parseInt(primeInput.value, 10);
    const aRaw = parseInt(aInput.value, 10);
    const bRaw = parseInt(bInput.value, 10);

    if (!Number.isFinite(p) || p < 2) { setStatus('enter a prime p &ge; 2'); return; }
    if (p > 5000) { setStatus('keep p &le; 5000 so the ring stays legible'); return; }
    if (!isPrime(p)) {
        clear();
        setStatus(`${p} is not prime &mdash; the step-maker only visits every number when p is prime`);
        return;
    }

    const g = primitiveRoot(p);
    MODEL = { p, g, ...buildRing(p, g) };

    const a = ((aRaw % p) + p) % p;
    const b = ((bRaw % p) + p) % p;
    const product = (a * b) % p;

    clear();
    drawRing();

    // The numbers involved
    drawDot(b, COLORS.b, `b=${b}`, 7);          // where the multiplier sits
    drawDot(a, COLORS.a, `a=${a}`, 8);          // start
    drawDot(product, COLORS.product, `a&times;b=${product}`, 8); // answer

    // status: the equation, both as multiplication and as stepping
    let stepLine = '';
    if (arrangeBySteps && a !== 0 && b !== 0) {
        const sa = MODEL.stepOf[a], sb = MODEL.stepOf[b], sp = MODEL.stepOf[product];
        stepLine = ` &nbsp;|&nbsp; steps: ${sa} + ${sb} = ${sp} (mod ${p - 1})`;
    }
    const eqExtra = (aRaw !== a || bRaw !== b) ? ` &nbsp;[${aRaw}&rarr;${a}, ${bRaw}&rarr;${b} mod ${p}]` : '';
    setStatus(`${a} &times; ${b} = ${a * b} &equiv; <b>${product}</b> (mod ${p})` +
        stepLine + `<br><span style="color:#888">step-maker g=${g}${eqExtra}</span>`);

    if (a === 0 || b === 0) {
        // 0 times anything is 0 -- it sits in the centre, off the ring
        drawHop(a, product, COLORS.product, 1);
        return;
    }

    if (showOrbit) {
        animateOrbit(a, b, myToken);
    } else {
        drawHop(a, product, COLORS.product, 1);
    }
}

// Trace a, a*b, a*b^2, ... -- each hop is the SAME rotation (a regular star
// polygon when arranged by steps). Animated hop-by-hop.
function animateOrbit(a, b, myToken) {
    const { p } = MODEL;
    const seq = [a];
    let cur = a;
    // one full loop around the orbit (order of b), capped so it terminates
    for (let i = 0; i < p; i++) {
        cur = (cur * b) % p;
        seq.push(cur);
        if (cur === a) break;
    }

    let hop = 0;
    function frame() {
        if (myToken !== animToken) return; // superseded by a newer render
        if (hop >= seq.length - 1) return;
        // redraw the completed hops solidly...
        for (let i = 0; i < hop; i++) {
            const faded = i === 0 ? COLORS.product : '#f0b6ac';
            drawHop(seq[i], seq[i + 1], faded, 1, i === 0);
        }
        // ...and animate the current one
        let t = 0;
        function step() {
            if (myToken !== animToken) return;
            clearAndBase(seq, hop);
            for (let i = 0; i < hop; i++) {
                const faded = i === 0 ? COLORS.product : '#f0b6ac';
                drawHop(seq[i], seq[i + 1], faded, 1, i === 0);
            }
            drawHop(seq[hop], seq[hop + 1], COLORS.orbit, t, true);
            t += 0.08;
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                hop++;
                requestAnimationFrame(frame);
            }
        }
        step();
    }
    frame();
}

// Redraw the static base (ring + key dots) under the animated orbit.
function clearAndBase(seq, hop) {
    const a = seq[0];
    const b = parseInt(bInput.value, 10);
    const { p } = MODEL;
    const bb = ((b % p) + p) % p;
    const product = (a * bb) % p;
    clear();
    drawRing();
    drawDot(bb, COLORS.b, `b=${bb}`, 7);
    drawDot(a, COLORS.a, `a=${a}`, 8);
    drawDot(product, COLORS.product, `a&times;b=${product}`, 8);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

generateBtn.addEventListener('click', render);
[primeInput, aInput, bInput].forEach(el => {
    el.addEventListener('change', render);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
});

arrangeBtn.addEventListener('click', () => {
    arrangeBySteps = !arrangeBySteps;
    arrangeBtn.textContent = arrangeBySteps ? 'Arrange: steps' : 'Arrange: value';
    arrangeBtn.classList.toggle('active', arrangeBySteps);
    render();
});

orbitBtn.addEventListener('click', () => {
    showOrbit = !showOrbit;
    orbitBtn.textContent = showOrbit ? 'Orbit: on' : 'Orbit: off';
    orbitBtn.classList.toggle('active', showOrbit);
    render();
});

window.redrawSpiral = function () {
    const size = window.CANVAS_SIZE || CanvasFit.getSize();
    canvas.width = size;
    canvas.height = size;
    render();
};

// initial draw
arrangeBtn.textContent = 'Arrange: steps';
arrangeBtn.classList.add('active');
orbitBtn.textContent = 'Orbit: on';
orbitBtn.classList.add('active');
setTimeout(render, 10);
