/**
 * Event Bus - Pub/Sub Event System
 * Enables decoupled communication between systems
 */

export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        this.events.get(eventName).push(callback);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to an event (one-time)
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     */
    once(eventName, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(eventName, onceWrapper);
        };

        this.on(eventName, onceWrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function to remove
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        // Clean up if no more callbacks
        if (callbacks.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to callbacks
     */
    emit(eventName, data) {
        if (!this.events.has(eventName)) return;

        const callbacks = this.events.get(eventName);

        // Call all callbacks
        for (const callback of callbacks) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for "${eventName}":`, error);
            }
        }
    }

    /**
     * Remove all listeners for an event (or all events)
     * @param {string} [eventName] - Optional event name to clear
     */
    clear(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get number of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
}
