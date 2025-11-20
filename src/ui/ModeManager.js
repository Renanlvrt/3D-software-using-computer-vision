/**
 * Mode Manager
 * Manages application modes (Create, Select, Extrude, Delete, CSG)
 */

export class ModeManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Available modes
        this.modes = {
            CREATE: 'create',
            SELECT: 'select',
            EXTRUDE: 'extrude',
            DELETE: 'delete',
            CSG: 'csg'
        };

        // Current mode
        this.currentMode = this.modes.CREATE;

        // Previous mode (for toggling)
        this.previousMode = null;
    }

    /**
     * Set the current mode
     * @param {string} mode - Mode to switch to
     */
    setMode(mode) {
        if (!Object.values(this.modes).includes(mode)) {
            console.warn(`Invalid mode: ${mode}`);
            return;
        }

        if (this.currentMode === mode) {
            return; // Already in this mode
        }

        this.previousMode = this.currentMode;
        this.currentMode = mode;

        // Update UI
        this.updateModeUI();

        // Emit mode change event
        this.eventBus.emit('mode-changed', {
            mode: this.currentMode,
            previousMode: this.previousMode
        });

        console.log(`🔄 Mode: ${this.currentMode.toUpperCase()}`);
    }

    /**
     * Get current mode
     * @returns {string} Current mode
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * Check if in a specific mode
     * @param {string} mode - Mode to check
     * @returns {boolean} True if in that mode
     */
    is(mode) {
        return this.currentMode === mode;
    }

    /**
     * Cycle to next mode
     */
    nextMode() {
        const modeList = Object.values(this.modes);
        const currentIndex = modeList.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modeList.length;

        this.setMode(modeList[nextIndex]);
    }

    /**
     * Toggle between current and previous mode
     */
    toggleMode() {
        if (this.previousMode) {
            this.setMode(this.previousMode);
        }
    }

    /**
     * Update mode indicator UI
     */
    updateModeUI() {
        const modeIndicator = document.getElementById('mode-indicator');
        if (!modeIndicator) return;

        // Update text
        const modeText = modeIndicator.querySelector('.mode-text');
        if (modeText) {
            modeText.textContent = this.currentMode.charAt(0).toUpperCase() +
                this.currentMode.slice(1);
        }

        // Update icon
        const modeIcon = modeIndicator.querySelector('.mode-icon');
        if (modeIcon) {
            modeIcon.textContent = this.getModeIcon(this.currentMode);
        }

        // Update color
        modeIndicator.style.borderColor = this.getModeColor(this.currentMode);
    }

    /**
     * Get icon for mode
     * @param {string} mode - Mode name
     * @returns {string} Icon character
     */
    getModeIcon(mode) {
        const icons = {
            create: '✏️',
            select: '👆',
            extrude: '📐',
            delete: '🗑️',
            csg: '🔧'
        };

        return icons[mode] || '•';
    }

    /**
     * Get color for mode
     * @param {string} mode - Mode name
     * @returns {string} CSS color
     */
    getModeColor(mode) {
        const colors = {
            create: '#00ff88',
            select: '#00ccff',
            extrude: '#ffaa00',
            delete: '#ff6b9d',
            csg: '#bb86fc'
        };

        return colors[mode] || '#888888';
    }
}
