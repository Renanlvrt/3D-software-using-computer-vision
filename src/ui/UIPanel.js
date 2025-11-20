/**
 * UI Panel Manager
 * Manages tool panel, settings, and help overlays
 */

export class UIPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Panel states
        this.panels = {
            tools: false,
            settings: false,
            help: false
        };
    }

    /**
     * Initialize UI panels
     */
    initialize() {
        this.setupToolPanel();
        this.setupHelpPanel();
        this.setupEventListeners();

        console.log('✅ UI panels initialized');
    }

    /**
     * Setup tool panel
     */
    setupToolPanel() {
        const toolPanel = document.getElementById('tool-panel');
        if (!toolPanel) return;

        // Mode buttons
        const modes = ['create', 'select', 'extrude', 'delete', 'csg'];

        modes.forEach(mode => {
            const button = document.createElement('button');
            button.className = 'tool-button';
            button.dataset.mode = mode;
            button.innerHTML = `
                <span class="tool-icon">${this.getModeIcon(mode)}</span>
                <span class="tool-label">${mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
            `;

            button.addEventListener('click', () => {
                this.eventBus.emit('mode-change-requested', { mode });
            });

            toolPanel.appendChild(button);
        });

        // Utility buttons
        this.addUtilityButtons(toolPanel);
    }

    /**
     * Add utility buttons
     */
    addUtilityButtons(toolPanel) {
        const separator = document.createElement('div');
        separator.className = 'tool-separator';
        toolPanel.appendChild(separator);

        // Undo button
        const undoBtn = this.createUtilityButton('⟲', 'Undo (Ctrl+Z)', 'undo-button');
        undoBtn.addEventListener('click', () => {
            this.eventBus.emit('undo-requested');
        });
        toolPanel.appendChild(undoBtn);

        // Redo button
        const redoBtn = this.createUtilityButton('⟳', 'Redo (Ctrl+Y)', 'redo-button');
        redoBtn.addEventListener('click', () => {
            this.eventBus.emit('redo-requested');
        });
        toolPanel.appendChild(redoBtn);

        // Save button
        const saveBtn = this.createUtilityButton('💾', 'Save (Ctrl+S)');
        saveBtn.addEventListener('click', () => {
            this.eventBus.emit('save-requested');
        });
        toolPanel.appendChild(saveBtn);

        // Export button
        const exportBtn = this.createUtilityButton('📦', 'Export (Ctrl+E)');
        exportBtn.addEventListener('click', () => {
            this.eventBus.emit('export-requested');
        });
        toolPanel.appendChild(exportBtn);

        // Help button
        const helpBtn = this.createUtilityButton('❓', 'Help (H)');
        helpBtn.addEventListener('click', () => {
            this.togglePanel('help');
        });
        toolPanel.appendChild(helpBtn);
    }

    /**
     * Create utility button
     */
    createUtilityButton(icon, tooltip, id = null) {
        const button = document.createElement('button');
        button.className = 'tool-button utility-button';
        if (id) button.id = id;
        button.title = tooltip;
        button.innerHTML = `<span class="tool-icon">${icon}</span>`;
        return button;
    }

    /**
     * Setup help panel
     */
    setupHelpPanel() {
        const helpOverlay = document.getElementById('help-overlay');
        if (!helpOverlay) return;

        helpOverlay.innerHTML = `
            <div class="help-panel">
                <div class="help-header">
                    <h2>HandCraft3D - Quick Guide</h2>
                    <button class="close-button" id="close-help">✕</button>
                </div>
                <div class="help-content">
                    <section>
                        <h3>🖐️ Basic Gestures</h3>
                        <ul>
                            <li><strong>Pinch (thumb + index):</strong> Select objects</li>
                            <li><strong>Two-hand pinch:</strong> Create blocks</li>
                            <li><strong>Palm open (3+ fingers):</strong> Switch modes</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h3>🎨 Modes</h3>
                        <ul>
                            <li><strong>Create:</strong> Build new blocks and shapes</li>
                            <li><strong>Select:</strong> Choose objects to modify</li>
                            <li><strong>Extrude:</strong> Pull faces to create 3D shapes</li>
                            <li><strong>Delete:</strong> Remove selected objects</li>
                            <li><strong>CSG:</strong> Combine, subtract, or intersect shapes</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h3>⌨️ Keyboard Shortcuts</h3>
                        <ul>
                            <li><strong>Ctrl + Z:</strong> Undo</li>
                            <li><strong>Ctrl + Y:</strong> Redo</li>
                            <li><strong>Ctrl + S:</strong> Save scene</li>
                            <li><strong>Ctrl + E:</strong> Export to GLB</li>
                            <li><strong>H:</strong> Toggle this help</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h3>💡 Tips</h3>
                        <ul>
                            <li>Better lighting improves hand tracking accuracy</li>
                            <li>Keep hands clearly visible to the camera</li>
                            <li>Grid snapping helps align objects precisely</li>
                            <li>Use two hands for complex operations</li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        const closeBtn = document.getElementById('close-help');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.togglePanel('help'));
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // H key for help
        window.addEventListener('keydown', (event) => {
            if (event.key === 'h' || event.key === 'H') {
                if (!event.ctrlKey && !event.metaKey) {
                    this.togglePanel('help');
                }
            }

            // Escape to close panels
            if (event.key === 'Escape') {
                this.closeAllPanels();
            }
        });

        // Click outside to close
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('overlay')) {
                this.closeAllPanels();
            }
        });
    }

    /**
     * Toggle panel visibility
     */
    togglePanel(panel) {
        this.panels[panel] = !this.panels[panel];

        const overlayId = `${panel}-overlay`;
        const overlay = document.getElementById(overlayId);

        if (overlay) {
            overlay.classList.toggle('active', this.panels[panel]);
        }
    }

    /**
     * Close all panels
     */
    closeAllPanels() {
        Object.keys(this.panels).forEach(panel => {
            this.panels[panel] = false;
            const overlay = document.getElementById(`${panel}-overlay`);
            if (overlay) {
                overlay.classList.remove('active');
            }
        });
    }

    /**
     * Get mode icon
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
}
