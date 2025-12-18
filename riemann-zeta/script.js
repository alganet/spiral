// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

const canvas = document.getElementById('spiralCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const playBtn = document.getElementById('playBtn');
const tInput = document.getElementById('tInput');

// Initialize canvas with fit mode
CanvasFit.init(canvas);
let CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// State
let t = 0;
let isPlaying = true;
let history = []; // Stores {t, x, y}
const MAX_HISTORY = 2000;
const ETA_TERMS = 500;
const SUM_TERMS = 50;

// Mobius sieve for background
const MAX_N_BG = 500;
const mu = new Int8Array(MAX_N_BG).fill(1);
function initSieve() {
    const isPrime = new Uint8Array(MAX_N_BG).fill(1);
    isPrime[0] = isPrime[1] = 0;
    for (let i = 2; i < MAX_N_BG; i++) {
        if (isPrime[i]) {
            for (let j = i; j < MAX_N_BG; j += i) {
                if (j > i) isPrime[j] = 0;
                mu[j] = -mu[j];
            }
            let sq = i * i;
            for (let j = sq; j < MAX_N_BG; j += sq) mu[j] = 0;
        }
    }
}
initSieve();

function zeta(s_re, s_im) {
    // Zeta(s) via Dirichlet Eta function: eta(s) = sum_{n=1}^inf (-1)^(n-1) / n^s
    // Zeta(s) = eta(s) / (1 - 2^(1-s))

    let eta_re = 0;
    let eta_im = 0;

    for (let n = 1; n <= ETA_TERMS; n++) {
        const ln_n = Math.log(n);
        const magn = Math.pow(n, -s_re);
        const angle = -s_im * ln_n;

        const term_re = magn * Math.cos(angle);
        const term_im = magn * Math.sin(angle);

        if (n % 2 === 1) {
            eta_re += term_re;
            eta_im += term_im;
        } else {
            eta_re -= term_re;
            eta_im -= term_im;
        }
    }

    // Denominator: 1 - 2^(1-s) = 1 - 2^(1 - s_re - i*s_im)
    // 2^(1-s) = e^((1-s) * ln 2) = e^((1-s_re) * ln 2 - i * s_im * ln 2)
    const factor_magn = Math.pow(2, 1 - s_re);
    const factor_angle = -s_im * Math.log(2);

    const den_re = 1 - factor_magn * Math.cos(factor_angle);
    const den_im = -factor_magn * Math.sin(factor_angle);

    const den_sq = den_re * den_re + den_im * den_im;

    // Result = eta / den
    return {
        re: (eta_re * den_re + eta_im * den_im) / den_sq,
        im: (eta_im * den_re - eta_re * den_im) / den_sq
    };
}

function draw() {
    CANVAS_SIZE = window.CANVAS_SIZE || CanvasFit.getSize();
    if (canvas.width !== CANVAS_SIZE) {
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Auto-zoom calculation
    // Calculate current max range from history
    let currentMaxRange = 2; // Initial range
    for (const p of history) {
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        if (dist > currentMaxRange) currentMaxRange = dist;
    }

    // Smoothly update the visual scale based on max range
    // Give some padding (1.2x) and ensure it doesn't zoom in too much
    const targetScale = (Math.min(canvas.width, canvas.height) / 2) / (currentMaxRange * 1.2);

    // Persistence of scale across frames for smoothness
    if (!this.currentScale) this.currentScale = targetScale;
    this.currentScale += (targetScale - this.currentScale) * 0.1;
    const scale = this.currentScale;

    // Draw background stripes based on Mobius function
    const stripeUnit = scale / 2; // size of one 'n' unit
    ctx.globalAlpha = 0.2;
    for (let n = 1; n < MAX_N_BG; n++) {
        const m = mu[n];
        let color;
        if (m === -1) color = SpiralColors.get('muNeg');
        else if (m === 0) color = SpiralColors.get('muZero');
        else color = SpiralColors.get('muPos');

        ctx.fillStyle = color;

        // Right side
        const x_right = cx + (n - 1) * stripeUnit;
        if (x_right < canvas.width) {
            ctx.fillRect(x_right, 0, stripeUnit, canvas.height);
        }

        // Left side
        const x_left = cx - n * stripeUnit;
        if (x_left + stripeUnit > 0) {
            ctx.fillRect(x_left, 0, stripeUnit, canvas.height);
        }
    }
    ctx.globalAlpha = 1.0;

    // Draw axes
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    // Calculate current zeta value
    const z = zeta(0.5, t);

    // Add to history
    if (isPlaying) {
        history.push({ t, x: z.re, y: z.im });
        if (history.length > MAX_HISTORY) history.shift();
    }

    // Draw trajectory
    if (history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = SpiralColors.get('zetaCurve');
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.moveTo(cx + history[0].x * scale, cy - history[0].y * scale);
        for (let i = 1; i < history.length; i++) {
            ctx.lineTo(cx + history[i].x * scale, cy - history[i].y * scale);
        }
        ctx.stroke();
    }

    // Draw partial sum spiral
    // S_N = sum_{n=1}^N 1/n^s
    let sx = 0;
    let sy = 0;
    ctx.beginPath();
    ctx.strokeStyle = SpiralColors.get('zetaSum');
    ctx.lineWidth = 1;
    ctx.moveTo(cx, cy);
    for (let n = 1; n <= SUM_TERMS; n++) {
        const ln_n = Math.log(n);
        const magn = Math.pow(n, -0.5);
        const angle = -t * ln_n;

        sx += magn * Math.cos(angle);
        sy += magn * Math.sin(angle);

        ctx.lineTo(cx + sx * scale, cy - sy * scale);
    }
    ctx.stroke();

    // Draw current point
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx + z.re * scale, cy - z.im * scale, 4, 0, Math.PI * 2);
    ctx.fill();

    // Update UI
    statusEl.textContent = `t = ${t.toFixed(2)}`;
    tInput.value = t.toFixed(2);

    if (isPlaying) {
        t += 0.05;
        requestAnimationFrame(draw);
    }
}

playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.textContent = isPlaying ? 'Pause' : 'Play';
    if (isPlaying) {
        playBtn.classList.add('active');
        draw();
    } else {
        playBtn.classList.remove('active');
    }
});

resetBtn.addEventListener('click', () => {
    t = 0;
    history = [];
    tInput.value = 0;
    if (!isPlaying) draw();
});

tInput.addEventListener('input', () => {
    t = parseFloat(tInput.value) || 0;
    if (!isPlaying) draw();
});

// Start
SpiralColors.init();
draw();

// Expose redraw function for color changes
window.redrawSpiral = function () {
    if (!isPlaying) draw();
};
