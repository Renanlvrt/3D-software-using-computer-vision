/** 
 * Coordinate Mapper - Transform coordinates between MediaPipe and Three.js
 * Maps camera space (MediaPipe) to 3D world space (Three.js)
 */

export class CoordinateMapper {
    constructor(videoElement, workspaceBounds = null) {
        this.videoWidth = videoElement?.videoWidth || 1280;
        this.videoHeight = videoElement?.videoHeight || 720;

        // Define 3D workspace bounds (can be customized)
        this.bounds = workspaceBounds || {
            x: { min: -10, max: 10 },
            y: { min: -10, max: 10 },
            z: { min: -10, max: 10 }
        };
    }

    /**
     * Convert MediaPipe normalized coordinates to Three.js world coordinates
     * MediaPipe: x[0,1] (left to right), y[0,1] (top to bottom), z[-1,1] (relative depth)
     * Three.js: x[-10,10], y[-10,10], z[-10,10]
     * @param {Object} landmark - MediaPipe landmark with x, y, z
     * @returns {Object} Three.js world position
     */
    mediaPipeToWorld(landmark) {
        // Depth-based mapping for intuitive cursor control:
        // Hand X (left-right) → World X (left-right)
        // Hand Y (up-down) → World Z (forward-back depth)
        // Hand Z (MediaPipe depth) → World Y (height)

        return {
            // X: Map [0,1] to workspace X bounds (flip for natural mirroring)
            x: this.mapRange(
                1 - landmark.x,
                0, 1,
                this.bounds.x.min,
                this.bounds.x.max
            ),

            // Y: Use MediaPipe's depth (z) for world height
            // MediaPipe z is roughly [-0.1, 0.1] for close hand, scale to world Y
            y: this.mapRange(
                -landmark.z * 5, // Scale and invert
                -1, 1,
                this.bounds.y.min,
                this.bounds.y.max
            ),

            // Z: Map hand Y to world depth (forward/back)
            // Moving hand down on screen = moving forward in 3D space
            z: this.mapRange(
                landmark.y,
                0, 1,
                this.bounds.z.max,  // Inverted: top of screen = far
                this.bounds.z.min   // bottom of screen = close
            )
        };
    }

    /**
     * Map value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    mapRange(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    /**
     * Update video resolution (call when video size changes)
     * @param {number} width - Video width
     * @param {number} height - Video height
     */
    updateResolution(width, height) {
        this.videoWidth = width;
        this.videoHeight = height;
    }

    /**
     * Update workspace bounds
     * @param {Object} bounds - New workspace bounds
     */
    updateBounds(bounds) {
        this.bounds = bounds;
    }

    /**
     * Get current workspace bounds
     * @returns {Object} Workspace bounds
     */
    getBounds() {
        return this.bounds;
    }

    /**
     * Convert world coordinates back to MediaPipe coordinates
     * (useful for inverse operations)
     * @param {Object} worldPos - Three.js world position
     * @returns {Object} MediaPipe normalized coordinates
     */
    worldToMediaPipe(worldPos) {
        return {
            x: this.mapRange(
                worldPos.x,
                this.bounds.x.min,
                this.bounds.x.max,
                0, 1
            ),
            y: 1 - this.mapRange(
                worldPos.y,
                this.bounds.y.min,
                this.bounds.y.max,
                0, 1
            ),
            z: this.mapRange(
                worldPos.z,
                this.bounds.z.min,
                this.bounds.z.max,
                -1, 1
            )
        };
    }
}
