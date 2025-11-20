/**
 * Hand Tracker - MediaPipe Hands Integration
 * Real-time hand detection and landmark tracking
 */

import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandTracker {
    constructor(config = {}) {
        this.videoElement = config.videoElement;
        this.onResults = config.onResults || (() => { });

        this.hands = null;
        this.camera = null;
        this.isRunning = false;
    }

    /**
     * Initialize MediaPipe Hands
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('🤖 Initializing MediaPipe Hands...');

        try {
            // Create Hands instance
            this.hands = new Hands({
                locateFile: (file) => {
                    // Use CDN for MediaPipe files
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            // Configure MediaPipe Hands
            await this.hands.setOptions({
                maxNumHands: 2,                  // Track both hands
                modelComplexity: 1,              // 0=lite, 1=full (balance accuracy/speed)
                minDetectionConfidence: 0.7,      // Higher = fewer false positives
                minTrackingConfidence: 0.5,       // Lower = better tracking continuity
                selfieMode: false                 // True would mirror, false for natural
            });

            // Set up results callback
            this.hands.onResults((results) => {
                this.onResults(results);
            });

            // Initialize camera utility
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isRunning && this.hands) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 1280,
                height: 720
            });

            console.log('✅ MediaPipe Hands initialized');

        } catch (error) {
            console.error('❌ MediaPipe initialization failed:', error);
            throw new Error(`Failed to initialize hand tracking: ${error.message}`);
        }
    }

    /**
     * Start hand tracking
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.camera) {
            throw new Error('HandTracker not initialized. Call initialize() first.');
        }

        try {
            await this.camera.start();
            this.isRunning = true;
            console.log('✅ Hand tracking started');
        } catch (error) {
            console.error('❌ Failed to start hand tracking:', error);
            throw error;
        }
    }

    /**
     * Stop hand tracking
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        this.isRunning = false;
        console.log('🛑 Hand tracking stopped');
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop();

        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }

        this.camera = null;
        console.log('✅ HandTracker disposed');
    }

    /**
     * Check if tracking is active
     * @returns {boolean}
     */
    isActive() {
        return this.isRunning && this.hands !== null;
    }
}
