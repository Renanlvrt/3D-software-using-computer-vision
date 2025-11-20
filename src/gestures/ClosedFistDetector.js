/**
 * Closed Fist Detector
 * 
 * Detects closed fist gesture from MediaPipe hand landmarks.
 * Uses multiple criteria for robust detection:
 * 1. All fingertips below their metacarpal (MCP) joints
 * 2. Thumb close to index finger base
 * 3. Fingertips near palm center
 * 4. Temporal filtering (200ms hold) to prevent false positives
 * 
 * Research Based On:
 * - Google MediaPipe Hands gesture recognition
 * - Empirical testing with MediaPipe landmark data
 * 
 * MediaPipe Hand Landmarks:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */

export class ClosedFistDetector {
    constructor() {
        // Detection thresholds (tuned through testing)
        this.THUMB_CURL_THRESHOLD = 0.04;      // Distance thumb-to-index base
        this.PALM_PROXIMITY_THRESHOLD = 0.15;  // Distance fingertip-to-palm
        this.MIN_FINGERS_NEAR_PALM = 3;        // Minimum curled fingers

        // Temporal filtering (prevent false positives)
        this.HOLD_DURATION_MS = 200;           // Must hold fist 200ms
        this.RELEASE_DURATION_MS = 100;        // Must release for 100ms

        // State tracking
        this.fistStartTime = null;
        this.fistReleaseTime = null;
        this.lastFistState = false;

        // History for smoothing
        this.detectionHistory = [];
        this.HISTORY_SIZE = 5;

        console.log('✅ ClosedFistDetector initialized');
    }

    /**
     * Detect closed fist from hand landmarks
     * 
     * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
     * @returns {Object} Detection result with confidence
     */
    detect(landmarks) {
        if (!landmarks || landmarks.length < 21) {
            return this.createResult(false, 0);
        }

        // Perform geometric detection
        const geometricResult = this.detectGeometric(landmarks);

        // Add to history
        this.detectionHistory.push(geometricResult.isFist);
        if (this.detectionHistory.length > this.HISTORY_SIZE) {
            this.detectionHistory.shift();
        }

        // Majority vote for smoothing
        const trueCount = this.detectionHistory.filter(v => v).length;
        const smoothedFist = trueCount > (this.detectionHistory.length / 2);

        // Apply temporal filtering
        const filteredResult = this.applyTemporalFilter(smoothedFist, geometricResult.confidence);

        return filteredResult;
    }

    /**
     * Geometric detection - analyze landmark positions
     * 
     * @param {Array} landmarks - Hand landmarks
     * @returns {Object} Raw detection result
     */
    detectGeometric(landmarks) {
        // Extract key landmarks
        const fingertips = [
            landmarks[8],   // Index finger tip
            landmarks[12],  // Middle finger tip
            landmarks[16],  // Ring finger tip
            landmarks[20]   // Pinky finger tip
        ];

        const metacarpals = [
            landmarks[5],   // Index MCP (base)
            landmarks[9],   // Middle MCP
            landmarks[13],  // Ring MCP
            landmarks[17]   // Pinky MCP
        ];

        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const thumbBase = landmarks[2];
        const indexBase = landmarks[5];

        // Check 1: All fingertips below their MCP joints (curled)
        let curledFingers = 0;
        for (let i = 0; i < 4; i++) {
            // In MediaPipe, Y increases downward
            // Fingertip below MCP = curled finger
            const tipY = fingertips[i].y;
            const mcpY = metacarpals[i].y;
            const wristY = wrist.y;

            // Normalize relative to wrist
            const tipRelative = Math.abs(tipY - wristY);
            const mcpRelative = Math.abs(mcpY - wristY);

            if (tipRelative < mcpRelative) {
                curledFingers++;
            }
        }

        const allFingersCurled = (curledFingers >= 3); // Allow 1 finger to be slightly extended

        // Check 2: Thumb position (curled toward palm)
        const thumbToIndexDistance = this.calculate3DDistance(thumbTip, indexBase);
        const thumbCurled = thumbToIndexDistance < this.THUMB_CURL_THRESHOLD;

        // Check 3: Fingertips near palm center (tight fist)
        const palmCenter = {
            x: (metacarpals[0].x + metacarpals[3].x) / 2,
            y: (metacarpals[0].y + metacarpals[3].y) / 2,
            z: (metacarpals[0].z + metacarpals[3].z) / 2
        };

        let fingersNearPalm = 0;
        for (const tip of fingertips) {
            const distanceToPalm = this.calculate3DDistance(tip, palmCenter);
            if (distanceToPalm < this.PALM_PROXIMITY_THRESHOLD) {
                fingersNearPalm++;
            }
        }

        const palmProximity = fingersNearPalm >= this.MIN_FINGERS_NEAR_PALM;

        // Combined detection
        const isFist = allFingersCurled && thumbCurled && palmProximity;

        // Calculate confidence (0.0 - 1.0)
        const confidence = this.calculateConfidence({
            curledFingers,
            thumbToIndexDistance,
            fingersNearPalm
        });

        return {
            isFist,
            confidence,
            metrics: {
                curledFingers,
                thumbCurled,
                palmProximity,
                gripStrength: 1.0 - (thumbToIndexDistance / this.THUMB_CURL_THRESHOLD)
            }
        };
    }

    /**
     * Apply temporal filtering to prevent flickering
     * 
     * @param {boolean} currentFist - Current detection state
     * @param {number} confidence - Detection confidence
     * @returns {Object} Filtered result
     */
    applyTemporalFilter(currentFist, confidence) {
        const now = Date.now();

        if (currentFist) {
            // Fist detected
            if (!this.lastFistState) {
                // Transition from open to fist
                this.fistStartTime = now;
                this.fistReleaseTime = null;
            }

            const holdDuration = now - (this.fistStartTime || now);
            const isFistConfirmed = holdDuration >= this.HOLD_DURATION_MS;

            this.lastFistState = true;

            return this.createResult(isFistConfirmed, confidence, {
                holdDuration,
                state: isFistConfirmed ? 'confirmed' : 'detecting'
            });

        } else {
            // Fist not detected
            if (this.lastFistState) {
                // Transition from fist to open
                this.fistReleaseTime = now;
            }

            // Keep reporting fist for a short grace period
            if (this.fistReleaseTime) {
                const releaseDuration = now - this.fistReleaseTime;
                if (releaseDuration < this.RELEASE_DURATION_MS) {
                    return this.createResult(true, confidence * 0.5, {
                        state: 'releasing'
                    });
                }
            }

            this.lastFistState = false;
            this.fistStartTime = null;

            return this.createResult(false, 0, {
                state: 'open'
            });
        }
    }

    /**
     * Calculate detection confidence score
     * 
     * @param {Object} metrics - Detection metrics
     * @returns {number} Confidence 0.0-1.0
     */
    calculateConfidence(metrics) {
        const fingerScore = metrics.curledFingers / 4.0; // 0.0-1.0
        const thumbScore = Math.max(0, 1.0 - (metrics.thumbToIndexDistance / this.THUMB_CURL_THRESHOLD));
        const palmScore = metrics.fingersNearPalm / 4.0; // 0.0-1.0

        // Weighted average
        const confidence = (fingerScore * 0.4) + (thumbScore * 0.3) + (palmScore * 0.3);

        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Calculate 3D Euclidean distance
     * 
     * @param {Object} point1 - First point {x, y, z}
     * @param {Object} point2 - Second point {x, y, z}
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
     * Create detection result object
     * 
     * @param {boolean} isFist - Is fist detected
     * @param {number} confidence - Confidence score
     * @param {Object} extra - Additional data
     * @returns {Object} Result object
     */
    createResult(isFist, confidence, extra = {}) {
        return {
            isFist,
            confidence,
            timestamp: Date.now(),
            ...extra
        };
    }

    /**
     * Reset detector state
     */
    reset() {
        this.fistStartTime = null;
        this.fistReleaseTime = null;
        this.lastFistState = false;
        this.detectionHistory = [];
    }

    /**
     * Get detector statistics
     * 
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            currentState: this.lastFistState ? 'fist' : 'open',
            historySize: this.detectionHistory.length,
            fistHoldTime: this.fistStartTime ? Date.now() - this.fistStartTime : 0
        };
    }
}
