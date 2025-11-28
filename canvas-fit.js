// SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>
//
// SPDX-License-Identifier: ISC

// Shared canvas fit functionality for all spiral experiments
// Automatically resizes canvas to fit viewport with no scrollbars

const CanvasFit = {
    enabled: true, // Default to fit mode
    canvas: null,

    // Initialize fit mode
    init(canvasElement) {
        this.canvas = canvasElement;

        // Load saved preference
        const saved = localStorage.getItem('canvasFitEnabled');
        if (saved !== null) {
            this.enabled = saved === 'true';
        }

        // Setup toggle button if it exists
        const toggleBtn = document.getElementById('fitToggle');
        if (toggleBtn) {
            this.updateToggleButton(toggleBtn);
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Apply fit mode if enabled
        if (this.enabled) {
            this.applyFit();

            // Re-fit on window resize
            window.addEventListener('resize', () => {
                if (this.enabled) {
                    this.applyFit();
                    // Trigger redraw if available
                    if (typeof window.redrawSpiral === 'function') {
                        window.redrawSpiral();
                    }
                }
            });
        }

        return this.enabled;
    },

    // Calculate optimal canvas size to fit viewport
    calculateFitSize() {
        const container = this.canvas.parentElement;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Account for padding, margins, and the floating toolbar
        const horizontalPadding = 80; // 40px padding on each side
        const verticalPadding = 80; // padding top
        const toolbarHeight = 80; // approximate toolbar height
        const headerHeight = 30; // approximate header + controls height

        const availableWidth = viewportWidth - horizontalPadding;
        const availableHeight = viewportHeight - verticalPadding - toolbarHeight - headerHeight;

        // Use the smaller dimension to ensure it fits
        const size = Math.min(availableWidth, availableHeight, 1200); // Max 1200px

        return Math.max(400, size); // Minimum 400px
    },

    // Apply fit mode to canvas
    applyFit() {
        // ignore on small vieports based on css media queries
        if (window.matchMedia('(max-width: 600px)').matches) return;
        if (!this.canvas) return;

        const size = this.calculateFitSize();
        const oldWidth = this.canvas.width;

        // Only resize if size changed significantly
        if (Math.abs(oldWidth - size) > 10) {
            this.canvas.width = size;
            this.canvas.height = size;

            // Store the size for scripts to use
            window.CANVAS_SIZE = size;
        }
    },

    // Restore default size
    restoreDefault() {
        if (!this.canvas) return;

        const defaultSize = 800;
        this.canvas.width = defaultSize;
        this.canvas.height = defaultSize;
        window.CANVAS_SIZE = defaultSize;
    },

    // Toggle fit mode
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('canvasFitEnabled', this.enabled.toString());

        const toggleBtn = document.getElementById('fitToggle');
        if (toggleBtn) {
            this.updateToggleButton(toggleBtn);
        }

        if (this.enabled) {
            this.applyFit();
        } else {
            this.restoreDefault();
        }

        // Trigger redraw
        if (typeof window.redrawSpiral === 'function') {
            window.redrawSpiral();
        }
    },

    // Update toggle button appearance
    updateToggleButton(btn) {
        if (this.enabled) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    },

    // Get current canvas size (for scripts to use)
    getSize() {
        return this.enabled ? this.calculateFitSize() : 800;
    }
};
