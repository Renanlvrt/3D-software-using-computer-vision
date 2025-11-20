/**
 * Point-to-Select Helper
 * 
 * Enhances SelectionSystem with point-to-select capability.
 * User can select blocks by simply pointing at them (no pinch required).
 * 
 * Features:
 * - Hover detection (finger pointing at block)
 * - Dwell time selection (point for 0.5s = select)
 * - Visual feedback (highlighting)
 * - Integration with existing SelectionSystem
 */

export class PointToSelectHelper {
    constructor(selectionSystem) {
        this.selectionSystem = selectionSystem;

        // Configuration
        this.DWELL_TIME_MS = 500;        // Point for 500ms to select
        this.HOVER_DISTANCE = 2.0;       // Max distance to be considered "pointing at"

        // State
        this.hoveredObject = null;
        this.hoverStartTime = null;
        this.lastPointPosition = null;

        console.log('✅ PointToSelectHelper initialized');
    }

    /**
     * Update point-to-select logic
     * 
     * @param {THREE.Vector3} fingerPosition - 3D finger cursor position
     * @param {Array} selectableObjects - Objects that can be selected
     * @returns {Object} Selection state
     */
    update(fingerPosition, selectableObjects) {
        if (!fingerPosition) {
            this.reset();
            return { hovering: false, selecting: false };
        }

        // Find object user is pointing at
        const pointedObject = this.findPointedObject(fingerPosition, selectableObjects);

        if (pointedObject) {
            // Pointing at an object
            if (pointedObject === this.hoveredObject) {
                // Still pointing at same object - check dwell time
                const dwellTime = Date.now() - this.hoverStartTime;

                if (dwellTime >= this.DWELL_TIME_MS) {
                    // Dwell time reached - select!
                    this.selectObject(pointedObject);
                    return {
                        hovering: true,
                        selecting: true,
                        object: pointedObject,
                        dwellProgress: 1.0
                    };
                }

                // Still hovering, not yet selected
                return {
                    hovering: true,
                    selecting: false,
                    object: pointedObject,
                    dwellProgress: dwellTime / this.DWELL_TIME_MS
                };

            } else {
                // Started pointing at new object
                this.hoveredObject = pointedObject;
                this.hoverStartTime = Date.now();

                return {
                    hovering: true,
                    selecting: false,
                    object: pointedObject,
                    dwellProgress: 0.0
                };
            }

        } else {
            // Not pointing at any object
            this.reset();
            return { hovering: false, selecting: false };
        }
    }

    /**
     * Find object that finger is pointing at
     * 
     * @param {THREE.Vector3} fingerPosition - Finger position
     * @param {Array} objects - Selectable objects
     * @returns {THREE.Object3D|null} Pointed object or null
     */
    findPointedObject(fingerPosition, objects) {
        let closestObject = null;
        let closestDistance = this.HOVER_DISTANCE;

        for (const obj of objects) {
            const distance = fingerPosition.distanceTo(obj.position);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestObject = obj;
            }
        }

        return closestObject;
    }

    /**
     * Select the pointed object
     * 
     * @param {THREE.Object3D} object - Object to select
     */
    selectObject(object) {
        // Clear current selection
        this.selectionSystem.clearSelection();

        // Select new object
        this.selectionSystem.selectObject(object);

        console.log('👉 Point-to-select:', object.userData.gridPosition);

        // Reset hover state to prevent re-selection
        this.reset();
    }

    /**
     * Reset hover state
     */
    reset() {
        this.hoveredObject = null;
        this.hoverStartTime = null;
    }

    /**
     * Get current hover progress (for visual feedback)
     * 
     * @returns {number} Progress 0.0-1.0
     */
    getHoverProgress() {
        if (!this.hoveredObject || !this.hoverStartTime) {
            return 0.0;
        }

        const dwellTime = Date.now() - this.hoverStartTime;
        return Math.min(1.0, dwellTime / this.DWELL_TIME_MS);
    }

    /**
     * Get currently hovered object
     * 
     * @returns {THREE.Object3D|null}
     */
    getHoveredObject() {
        return this.hoveredObject;
    }
}
