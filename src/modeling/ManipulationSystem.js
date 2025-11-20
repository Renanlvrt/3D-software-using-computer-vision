/**
 * Manipulation System
 * Handles movement, rotation, and scaling of selected objects
 */

import * as THREE from 'three';

export class ManipulationSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Manipulation state
        this.isManipulating = false;
        this.manipulationMode = null; // 'move', 'rotate', 'scale'
        this.manipulatedObjects = new Set();

        // Transform tracking
        this.initialTransforms = new Map();
        this.previousHandPositions = new Map();
    }

    /**
     * Update manipulation based on gestures
     * @param {Object} gestureData - Processed gesture data
     * @param {Set} selectedObjects - Currently selected objects
     */
    update(gestureData, selectedObjects) {
        const { leftHand, rightHand, singlePinch, twoHandPinch } = gestureData;

        if (selectedObjects.size === 0) {
            this.stopManipulation();
            return;
        }

        // Two-hand manipulation (rotate/scale)
        if (leftHand && rightHand && twoHandPinch && twoHandPinch.isActive) {
            if (!this.isManipulating || this.manipulationMode === 'move') {
                this.startTwoHandManipulation(selectedObjects, twoHandPinch);
            } else {
                this.updateTwoHandManipulation(twoHandPinch);
            }
        }
        // Single-hand manipulation (move)
        else if ((leftHand || rightHand) && singlePinch && singlePinch.isActive) {
            if (!this.isManipulating || this.manipulationMode !== 'move') {
                this.startSingleHandManipulation(selectedObjects, singlePinch);
            } else {
                this.updateSingleHandManipulation(singlePinch);
            }
        }
        // No manipulation
        else {
            if (this.isManipulating) {
                this.stopManipulation();
            }
        }
    }

    /**
     * Start single-hand manipulation (move)
     * @param {Set} objects - Objects to manipulate
     * @param {Object} pinchData - Pinch gesture data
     */
    startSingleHandManipulation(objects, pinchData) {
        this.isManipulating = true;
        this.manipulationMode = 'move';
        this.manipulatedObjects = new Set(objects);

        // Store initial transforms
        for (const object of objects) {
            this.initialTransforms.set(object, {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
        }

        // Store initial hand position
        this.previousHandPositions.set('single', pinchData.position);

        console.log('👆 Move mode started');
    }

    /**
     * Update single-hand manipulation
     * @param {Object} pinchData - Pinch gesture data
     */
    updateSingleHandManipulation(pinchData) {
        const previousPos = this.previousHandPositions.get('single');
        if (!previousPos) return;

        // Calculate movement delta
        const delta = {
            x: pinchData.position.x - previousPos.x,
            y: pinchData.position.y - previousPos.y,
            z: pinchData.position.z - previousPos.z
        };

        // Apply movement to all objects
        for (const object of this.manipulatedObjects) {
            object.position.x += delta.x;
            object.position.y += delta.y;
            object.position.z += delta.z;
        }

        // Update previous position
        this.previousHandPositions.set('single', pinchData.position);
    }

    /**
     * Start two-hand manipulation (rotate/scale)
     * @param {Set} objects - Objects to manipulate
     * @param {Object} twoHandData - Two-hand pinch data
     */
    startTwoHandManipulation(objects, twoHandData) {
        this.isManipulating = true;
        this.manipulationMode = 'rotate-scale';
        this.manipulatedObjects = new Set(objects);

        // Store initial transforms
        for (const object of objects) {
            this.initialTransforms.set(object, {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
        }

        // Store initial two-hand data
        this.previousHandPositions.set('twoHand', {
            separation: twoHandData.separation,
            angle: this.calculateAngle(twoHandData.leftPosition, twoHandData.rightPosition)
        });

        console.log('✌️ Rotate/Scale mode started');
    }

    /**
     * Update two-hand manipulation
     * @param {Object} twoHandData - Two-hand pinch data
     */
    updateTwoHandManipulation(twoHandData) {
        const previousData = this.previousHandPositions.get('twoHand');
        if (!previousData) return;

        // Calculate current angle
        const currentAngle = this.calculateAngle(
            twoHandData.leftPosition,
            twoHandData.rightPosition
        );

        // Calculate rotation delta
        const rotationDelta = currentAngle - previousData.angle;

        // Calculate scale delta
        const scaleFactor = twoHandData.separation / previousData.separation;

        // Apply transformations to all objects
        for (const object of this.manipulatedObjects) {
            // Rotate around Y axis
            object.rotation.y += rotationDelta;

            // Scale uniformly
            object.scale.multiplyScalar(scaleFactor);

            // Clamp scale to reasonable values
            const minScale = 0.1;
            const maxScale = 10.0;
            object.scale.x = Math.max(minScale, Math.min(maxScale, object.scale.x));
            object.scale.y = Math.max(minScale, Math.min(maxScale, object.scale.y));
            object.scale.z = Math.max(minScale, Math.min(maxScale, object.scale.z));
        }

        // Update previous data
        this.previousHandPositions.set('twoHand', {
            separation: twoHandData.separation,
            angle: currentAngle
        });
    }

    /**
     * Calculate angle between two positions
     * @param {Object} pos1 - Position 1
     * @param {Object} pos2 - Position 2
     * @returns {number} Angle in radians
     */
    calculateAngle(pos1, pos2) {
        return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
    }

    /**
     * Stop manipulation and emit event for undo/redo
     */
    stopManipulation() {
        if (!this.isManipulating) return;

        // Emit transformation event
        const transformations = [];

        for (const object of this.manipulatedObjects) {
            const initial = this.initialTransforms.get(object);

            if (initial) {
                transformations.push({
                    object: object,
                    initialTransform: initial,
                    finalTransform: {
                        position: object.position.clone(),
                        rotation: object.rotation.clone(),
                        scale: object.scale.clone()
                    }
                });
            }
        }

        if (transformations.length > 0) {
            this.eventBus.emit('objects-transformed', {
                mode: this.manipulationMode,
                transformations: transformations
            });
        }

        // Reset state
        this.isManipulating = false;
        this.manipulationMode = null;
        this.manipulatedObjects.clear();
        this.initialTransforms.clear();
        this.previousHandPositions.clear();

        console.log('✋ Manipulation stopped');
    }

    /**
     * Get current manipulation mode
     * @returns {string|null} Current mode or null
     */
    getMode() {
        return this.manipulationMode;
    }

    /**
     * Check if currently manipulating
     * @returns {boolean} True if manipulating
     */
    isActive() {
        return this.isManipulating;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopManipulation();
        console.log('✅ ManipulationSystem disposed');
    }
}
