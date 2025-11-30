// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Shared color management for all spiral experiments
// Persists color choices across all examples using localStorage

const SpiralColors = {
    // Default colors
    // Optimized for contrast
    defaults: {
        prime: '#444444',
        muNeg: '#ec646f',
        muZero: '#92da9f',
        muPos: '#6a9aca'
    },

    // Current colors (loaded from localStorage or defaults)
    current: {},

    // Initialize colors from localStorage or defaults
    init() {
        const saved = localStorage.getItem('spiralColors-v3');
        if (saved) {
            try {
                this.current = JSON.parse(saved);
            } catch (e) {
                this.current = { ...this.defaults };
            }
        } else {
            this.current = { ...this.defaults };
        }

        // Setup color pickers
        this.setupColorPickers();

        return this.current;
    },

    // Setup color picker inputs
    setupColorPickers() {
        const pickers = document.querySelectorAll('.color-picker');
        pickers.forEach(picker => {
            const colorType = picker.dataset.color;
            if (colorType && this.current[colorType]) {
                picker.value = this.current[colorType];
            }

            picker.addEventListener('input', (e) => {
                this.updateColor(colorType, e.target.value);
            });
        });
    },

    // Update a specific color
    updateColor(type, color) {
        this.current[type] = color;
        localStorage.setItem('spiralColors-v3', JSON.stringify(this.current));

        // Trigger redraw if the page has a redraw function
        if (typeof window.redrawSpiral === 'function') {
            window.redrawSpiral();
        }
    },

    // Get a specific color
    get(type) {
        return this.current[type] || this.defaults[type];
    },

    // Reset to defaults
    reset() {
        this.current = { ...this.defaults };
        localStorage.setItem('spiralColors-v3', JSON.stringify(this.current));

        // Update color pickers
        const pickers = document.querySelectorAll('.color-picker');
        pickers.forEach(picker => {
            const colorType = picker.dataset.color;
            if (colorType && this.current[colorType]) {
                picker.value = this.current[colorType];
            }
        });

        // Trigger redraw
        if (typeof window.redrawSpiral === 'function') {
            window.redrawSpiral();
        }
    },

    // Darken a color by a factor (0-1)
    darken(hex, factor) {
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        let num = parseInt(c, 16);
        let r = (num >> 16) & 255;
        let g = (num >> 8) & 255;
        let b = num & 255;

        r = Math.floor(r * (1 - factor));
        g = Math.floor(g * (1 - factor));
        b = Math.floor(b * (1 - factor));

        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SpiralColors.init());
} else {
    SpiralColors.init();
}
