/**
 * Grab Detector
 * 
 * Combines closed fist detection with hand proximity to selected objects
 * to determine when user intends to "grab" and start dragging.
 * 
 * Grab Requirements:
 * 1. Closed fist detected (via ClosedFistDetector)
 * 2. Hand within "grab radius" of selected object
 * 3. Fist held for minimum duration (handled by ClosedFistDetector)
 * 
 * This prevents accidental grabs when hand is far from objects.
 */

import { ClosedFistDetector } from './ClosedFistDetector.js';

export class GrabDetector {
    constructor() {
        this.fistDetector = new ClosedFistDetector();

        // Grab configuration
        this.GRAB_RADIUS = 0.2;            // Max distance to grab (world units)
        this.MIN_CONFIDENCE = 0.7;         // Minimum fist confidence to grab

        // State
        this.isGrabbing = false;
        this.grabbedObjects = null;
        this.grabStartPosition = null;

        console.log('✅ GrabDetector initialized');
    }

    /**
     * Detect grab gesture
     * 
     * @param {Array} landmarks - Hand landmarks
     * @param {Object} handWorldPosition - Hand position in 3D world space
     * @param {Set} selectedObjects - Currently selected objects
     * @returns {Object} Grab detection result
     */
    detect(landmarks, handWorldPosition, selectedObjects) {
        // Detect fist
        const fistResult = this.fistDetector.detect(landmarks);

        if (!fistResult.isFist || fistResult.confidence < this.MIN_CONFIDENCE) {
            // No fist or low confidence
            if (this.isGrabbing) {
                return this.releaseGrab();
            }

            return {
                isGrabbing: false,
                canGrab: false,
                fistDetected: fistResult.isFist,
                confidence: fistResult.confidence
            };
        }

        // Fist detected - check proximity to selected objects
        if (selectedObjects && selectedObjects.size > 0) {
            const nearestObject = this.findNearestObject(handWorldPosition, selectedObjects);

            if (nearestObject && nearestObject.distance <= this.GRAB_RADIUS) {
                // Hand close enough to grab
                if (!this.isGrabbing) {
                    return this.startGrab(handWorldPosition, selectedObjects, fistResult);
                }

                return {
                    isGrabbing: true,
                    justGrabbed: false,
                    grabbedObjects: this.grabbedObjects,
                    grabStartPosition: this.grabStartPosition,
                    currentPosition: handWorldPosition,
                    fistConfidence: fistResult.confidence,
                    nearestObject: nearestObject.object,
                    distance: nearestObject.distance
                };
            }
        }

        // Fist detected but not close enough to grab
        return {
            isGrabbing: false,
            canGrab: false,
            fistDetected: true,
            confidence: fistResult.confidence,
            reason: selectedObjects?.size > 0 ? 'too-far' : 'no-selection'
        };
    }

    /**
     * Start grab operation
     * 
     * @param {Object} handPosition - Hand world position
     * @param {Set} objects - Objects to grab
     * @param {Object} fistResult - Fist detection result
     * @returns {Object} Grab started result
     */
    startGrab(handPosition, objects, fistResult) {
        this.isGrabbing = true;
        this.grabbedObjects = new Set(objects);
        this.grabStartPosition = { ...handPosition };

        console.log(`✊ Grab started (${this.grabbedObjects.size} objects)`);

        return {
            isGrabbing: true,
            justGrabbed: true,
            grabbedObjects: this.grabbedObjects,
            grabStartPosition: this.grabStartPosition,
            currentPosition: handPosition,
            fistConfidence: fistResult.confidence
        };
    }

    /**
     * Release grab operation
     * 
     * @returns {Object} Grab released result
     */
    releaseGrab() {
        if (!this.isGrabbing) {
            return { isGrabbing: false };
        }

        console.log(`✋ Grab released (${this.grabbedObjects.size} objects)`);

        const result = {
            isGrabbing: false,
            justReleased: true,
            releasedObjects: this.grabbedObjects,
            grabStartPosition: this.grabStartPosition
        };

        this.isGrabbing = false;
        this.grabbedObjects = null;
        this.grabStartPosition = null;

        return result;
    }

    /**
     * Find nearest object to hand position
     * 
     * @param {Object} handPosition - Hand world position
     * @param {Set} objects - Objects to check
     * @returns {Object|null} Nearest object and distance
     */
    findNearestObject(handPosition, objects) {
        let nearestObject = null;
        let nearestDistance = Infinity;

        for (const object of objects) {
            const objectPosition = object.position;
            const distance = Math.sqrt(
                Math.pow(handPosition.x - objectPosition.x, 2) +
                Math.pow(handPosition.y - objectPosition.y, 2) +
                Math.pow(handPosition.z - objectPosition.z, 2)
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestObject = object;
            }
        }

        return nearestObject ? {
            object: nearestObject,
            distance: nearestDistance
        } : null;
    }

    /**
     * Check if currently Grabbing
     * 
     * @returns {boolean}
     */
    isActive() {
        return this.isGrabbing;
    }

    /**
     * Get current grab state
     * 
     * @returns {Object} State information
     */
    getState() {
        return {
            isGrabbing: this.isGrabbing,
            objectCount: this.grabbedObjects ? this.grabbedObjects.size : 0,
            grabStartPosition: this.grabStartPosition
        };
    }

    /**
     * Reset detector
     */
    reset() {
        this.isGrabbing = false;
        this.grabbedObjects = null;
        this.grabStartPosition = null;
        this.fistDetector.reset();
    }
}
