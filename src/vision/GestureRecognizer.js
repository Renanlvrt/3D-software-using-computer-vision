/**
 * Gesture Recognizer - Hand Gesture Detection
 * Detects various hand gestures from MediaPipe landmarks
 */

export class GestureRecognizer {
    constructor() {
        // Gesture thresholds (tuned through testing)
        this.PINCH_THRESHOLD = 0.05;      // Distance for pinch detection
        this.PALM_THRESHOLD = 1.1;        // Multiplier for palm open detection
        this.MOVEMENT_SMOOTHING = 0.3;    // Smoothing factor for velocity

        // Previous positions for tracking movement
        this.previousPositions = new Map();
        this.velocities = new Map();
    }

    /**
     * Detect pinch gesture (thumb + index finger)
     * @param {Array} landmarks - Hand landmarks from MediaPipe (21 points)
     * @returns {Object} Pin ch state and position
     */
    detectPinch(landmarks) {
        const thumbTip = landmarks[4];   // Thumb tip
        const indexTip = landmarks[8];   // Index finger tip

        // Calculate 3D Euclidean distance
        const distance = this.calculate3DDistance(thumbTip, indexTip);

        // Calculate pinch center point
        const position = {
            x: (thumbTip.x + indexTip.x) / 2,
            y: (thumbTip.y + indexTip.y) / 2,
            z: (thumbTip.z + indexTip.z) / 2
        };

        return {
            isPinched: distance < this.PINCH_THRESHOLD,
            strength: Math.max(0, Math.min(1, 1.0 - (distance / this.PINCH_THRESHOLD))),
            position: position,
            distance: distance
        };
    }

    /**
     * Detect two-hand pinch for block creation
     * @param {Array} leftLandmarks - Left hand landmarks
     * @param {Array} rightLandmarks - Right hand landmarks
     * @returns {Object} Two-hand pinch state
     */
    detectTwoHandPinch(leftLandmarks, rightLandmarks) {
        const leftPinch = this.detectPinch(leftLandmarks);
        const rightPinch = this.detectPinch(rightLandmarks);

        if (leftPinch.isPinched && rightPinch.isPinched) {
            // Calculate center point between both pinches
            const centerPoint = {
                x: (leftPinch.position.x + rightPinch.position.x) / 2,
                y: (leftPinch.position.y + rightPinch.position.y) / 2,
                z: (leftPinch.position.z + rightPinch.position.z) / 2
            };

            // Calculate separation for initial block size
            const separation = this.calculate3DDistance(
                leftPinch.position,
                rightPinch.position
            );

            return {
                isActive: true,
                center: centerPoint,
                separation: separation,
                leftPosition: leftPinch.position,
                rightPosition: rightPinch.position,
                leftStrength: leftPinch.strength,
                rightStrength: rightPinch.strength
            };
        }

        return { isActive: false };
    }

    /**
     * Detect open palm gesture
     * @param {Array} landmarks - Hand landmarks
     * @returns {boolean} True if palm is open
     */
    detectPalmOpen(landmarks) {
        // Check if fingers are extended
        const fingers = [
            { tip: 8, pip: 6 },   // Index
            { tip: 12, pip: 10 }, // Middle
            { tip: 16, pip: 14 }, // Ring
            { tip: 20, pip: 18 }  // Pinky
        ];

        const wrist = landmarks[0];
        let extendedCount = 0;

        for (const finger of fingers) {
            const tip = landmarks[finger.tip];
            const pip = landmarks[finger.pip];

            // Calculate distances from wrist
            const tipDistance = this.calculate3DDistance(tip, wrist);
            const pipDistance = this.calculate3DDistance(pip, wrist);

            // Finger is extended if tip is farther from wrist than PIP joint
            if (tipDistance > pipDistance * this.PALM_THRESHOLD) {
                extendedCount++;
            }
        }

        // Palm is open if 3 or more fingers are extended
        return extendedCount >= 3;
    }

    /**
     * Track hand movement/velocity
     * @param {string} handId - Hand identifier ('left' or 'right')
     * @param {Array} landmarks - Hand landmarks
     * @returns {Object} Velocity vector
     */
    trackMovement(handId, landmarks) {
        const wrist = landmarks[0];
        const currentPos = { x: wrist.x, y: wrist.y, z: wrist.z };

        if (this.previousPositions.has(handId)) {
            const prevPos = this.previousPositions.get(handId);

            // Calculate velocity (movement per frame)
            const velocity = {
                x: currentPos.x - prevPos.x,
                y: currentPos.y - prevPos.y,
                z: currentPos.z - prevPos.z
            };

            // Apply exponential moving average for smoothing
            const prevVelocity = this.velocities.get(handId) || velocity;

            const smoothedVelocity = {
                x: this.MOVEMENT_SMOOTHING * velocity.x + (1 - this.MOVEMENT_SMOOTHING) * prevVelocity.x,
                y: this.MOVEMENT_SMOOTHING * velocity.y + (1 - this.MOVEMENT_SMOOTHING) * prevVelocity.y,
                z: this.MOVEMENT_SMOOTHING * velocity.z + (1 - this.MOVEMENT_SMOOTHING) * prevVelocity.z
            };

            this.velocities.set(handId, smoothedVelocity);
        }

        this.previousPositions.set(handId, currentPos);

        return this.velocities.get(handId) || { x: 0, y: 0, z: 0 };
    }

    /**
     * Detect rotation gesture (two-hand angle)
     * @param {Array} leftLandmarks - Left hand landmarks
     * @param {Array} rightLandmarks - Right hand landmarks  
     * @returns {Object} Rotation data
     */
    detectRotation(leftLandmarks, rightLandmarks) {
        const leftIndex = leftLandmarks[8];
        const rightIndex = rightLandmarks[8];

        // Calculate angle between index fingers in XY plane
        const angle = Math.atan2(
            rightIndex.y - leftIndex.y,
            rightIndex.x - leftIndex.x
        );

        return {
            isActive: true,
            angle: angle,
            axis: 'y' // Default rotation axis
        };
    }

    /**
     * Calculate 3D Euclidean distance between two points
     * @param {Object} point1 - First point with x, y, z
     * @param {Object} point2 - Second point with x, y, z
     * @returns {number} Distance
     */
    calculate3DDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2) +
            Math.pow(point1.z - point2.z, 2)
        );
    }

    /**
     * Reset tracking data
     */
    reset() {
        this.previousPositions.clear();
        this.velocities.clear();
    }
}
