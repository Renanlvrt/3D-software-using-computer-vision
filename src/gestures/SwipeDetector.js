/**
 * Swipe Gesture Detector
 * 
 * Detects two-hand swipe gestures for undo/redo operations.
 * 
 * Swipe Left = Undo
 * Swipe Right = Redo
 */

export class SwipeDetector {
    constructor() {
        // Swipe thresholds
        this.SWIPE_VELOCITY_THRESHOLD = 0.1;  // Minimum velocity
        this.SWIPE_DISTANCE_THRESHOLD = 0.15; // Minimum distance
        this.SWIPE_TIME_WINDOW = 500;         // Max time for swipe (ms)
        this.COOLDOWN_PERIOD = 800;           // Cooldown between swipes

        // State tracking
        this.lastSwipeTime = 0;
        this.swipeStartPositions = null;
        this.swipeStartTime = null;

        console.log('✅ SwipeDetector initialized');
    }

    /**
     * Detect two-hand swipe
     * 
     * @param {Array} leftLandmarks - Left hand landmarks
     * @param {Array} rightLandmarks - Right hand landmarks
     * @param {Object} leftVelocity - Left hand velocity
     * @param {Object} rightVelocity - Right hand velocity
     * @returns {Object} Swipe detection result
     */
    detect(leftLandmarks, rightLandmarks, leftVelocity, rightVelocity) {
        if (!leftLandmarks || !rightLandmarks) {
            this.swipeStartPositions = null;
            this.swipeStartTime = null;
            return { isSwipe: false };
        }

        // Cooldown check
        const now = Date.now();
        if (now - this.lastSwipeTime < this.COOLDOWN_PERIOD) {
            return { isSwipe: false, reason: 'cooldown' };
        }

        const leftWrist = leftLandmarks[0];
        const rightWrist = rightLandmarks[0];

        // Initialize swipe tracking
        if (!this.swipeStartPositions) {
            this.swipeStartPositions = {
                left: { x: leftWrist.x, y: leftWrist.y },
                right: { x: rightWrist.x, y: rightWrist.y }
            };
            this.swipeStartTime = now;
            return { isSwipe: false, reason: 'tracking' };
        }

        // Check if both hands moving in same direction
        const velocityX = (leftVelocity.x + rightVelocity.x) / 2;
        const velocityMagnitude = Math.abs(velocityX);

        if (velocityMagnitude < this.SWIPE_VELOCITY_THRESHOLD) {
            return { isSwipe: false, reason: 'low-velocity' };
        }

        // Calculate total distance traveled
        const leftDistance = Math.abs(leftWrist.x - this.swipeStartPositions.left.x);
        const rightDistance = Math.abs(rightWrist.x - this.swipeStartPositions.right.x);
        const avgDistance = (leftDistance + rightDistance) / 2;

        if (avgDistance < this.SWIPE_DISTANCE_THRESHOLD) {
            return { isSwipe: false, reason: 'short-distance' };
        }

        // Check time window
        const swipeDuration = now - this.swipeStartTime;
        if (swipeDuration > this.SWIPE_TIME_WINDOW) {
            // Reset if too slow
            this.swipeStartPositions = null;
            return { isSwipe: false, reason: 'too-slow' };
        }

        // Determine swipe direction
        const direction = velocityX > 0 ? 'right' : 'left';

        // Swipe detected!
        this.lastSwipeTime = now;
        this.swipeStartPositions = null;
        this.swipeStartTime = null;

        console.log(`👋 Swipe ${direction} detected`);

        return {
            isSwipe: true,
            direction,
            distance: avgDistance,
            velocity: velocityMagnitude,
            duration: swipeDuration
        };
    }

    /**
     * Reset detector
     */
    reset() {
        this.swipeStartPositions = null;
        this.swipeStartTime = null;
    }

    /**
     * Get statistics
     * 
     * @returns {Object}
     */
    getStats() {
        return {
            lastSwipeTime: this.lastSwipeTime,
            isTracking: this.swipeStartPositions !== null
        };
    }
}
