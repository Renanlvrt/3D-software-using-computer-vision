/**
 * Undo Manager
 * Manages command history for undo/redo functionality
 */

export class UndoManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Command stacks
        this.undoStack = [];
        this.redoStack = [];

        // Configuration
        this.maxHistorySize = 50; // Limit to prevent memory issues

        // State
        this.isUndoing = false;
        this.isRedoing = false;
    }

    /**
     * Execute and record a command
     * @param {Command} command - Command to execute
     */
    execute(command) {
        if (this.isUndoing || this.isRedoing) {
            return;
        }

        try {
            command.execute();

            // Add to undo stack
            this.undoStack.push(command);

            // Clear redo stack (new action invalidates redo history)
            this.redoStack = [];

            // Limit history size
            if (this.undoStack.length > this.maxHistorySize) {
                this.undoStack.shift();
            }

            this.eventBus.emit('command-executed', { command });
            this.updateUI();

            console.log(`✅ Executed: ${command.getDescription()}`);

        } catch (error) {
            console.error('❌ Command execution failed:', error);
            throw error;
        }
    }

    /**
     * Undo the last command
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return;
        }

        this.isUndoing = true;

        try {
            const command = this.undoStack.pop();
            command.undo();

            // Add to redo stack
            this.redoStack.push(command);

            this.eventBus.emit('command-undone', { command });
            this.updateUI();

            console.log(`↶ Undone: ${command.getDescription()}`);

        } catch (error) {
            console.error('❌ Undo failed:', error);
            throw error;
        } finally {
            this.isUndoing = false;
        }
    }

    /**
     * Redo the last undone command
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return;
        }

        this.isRedoing = true;

        try {
            const command = this.redoStack.pop();
            command.execute();

            // Add back to undo stack
            this.undoStack.push(command);

            this.eventBus.emit('command-redone', { command });
            this.updateUI();

            console.log(`↷ Redone: ${command.getDescription()}`);

        } catch (error) {
            console.error('❌ Redo failed:', error);
            throw error;
        } finally {
            this.isRedoing = false;
        }
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUI();

        console.log('🗑️ Command history cleared');
    }

    /**
     * Get undo/redo availability
     * @returns {Object} Can undo/redo status
     */
    getStatus() {
        return {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0,
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length
        };
    }

    /**
     * Get command history for UI
     * @returns {Array} Command descriptions
     */
    getHistory() {
        return {
            undo: this.undoStack.map(cmd => cmd.getDescription()),
            redo: this.redoStack.map(cmd => cmd.getDescription())
        };
    }

    /**
     * Update UI indicators
     */
    updateUI() {
        const status = this.getStatus();

        // Update undo button
        const undoButton = document.getElementById('undo-button');
        if (undoButton) {
            undoButton.disabled = !status.canUndo;
            undoButton.title = status.canUndo
                ? `Undo: ${this.undoStack[this.undoStack.length - 1].getDescription()}`
                : 'Nothing to undo';
        }

        // Update redo button
        const redoButton = document.getElementById('redo-button');
        if (redoButton) {
            redoButton.disabled = !status.canRedo;
            redoButton.title = status.canRedo
                ? `Redo: ${this.redoStack[this.redoStack.length - 1].getDescription()}`
                : 'Nothing to redo';
        }

        // Emit status update event
        this.eventBus.emit('undo-status-changed', status);
    }

    /**
     * Set maximum history size
     * @param {number} size - Maximum number of commands to keep
     */
    setMaxHistorySize(size) {
        this.maxHistorySize = Math.max(1, size);

        // Trim existing history if needed
        while (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }
}
