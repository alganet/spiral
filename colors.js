// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Shared color management for all spiral experiments
// Persists color choices across all examples using localStorage

const SpiralColors = {
    // Default colors
    defaults: {
        prime: '#333333',
        muNeg: '#FFB3BA',
        muZero: '#BAFFC9',
        muPos: '#BAE1FF'
    },

    // Current colors (loaded from localStorage or defaults)
    current: {},

    // Initialize colors from localStorage or defaults
    init() {
        const saved = localStorage.getItem('spiralColors');
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
        localStorage.setItem('spiralColors', JSON.stringify(this.current));

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
        localStorage.setItem('spiralColors', JSON.stringify(this.current));

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
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SpiralColors.init());
} else {
    SpiralColors.init();
}
