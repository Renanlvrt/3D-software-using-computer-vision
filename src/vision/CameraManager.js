/**
 * Camera Manager - WebRTC Camera Access
 * Handles camera initialization and provides video stream
 */

export class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.isActive = false;
    }

    /**
     * Initialize camera with optimal settings
     * @param {HTMLVideoElement} videoElement - Video element to attach stream
     * @returns {Promise<MediaStream>} Camera stream
     */
    async initialize(videoElement) {
        this.videoElement = videoElement;

        // Define camera constraints for optimal hand tracking
        const constraints = {
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 60, min: 30 },
                facingMode: 'user' // Front-facing camera
            },
            audio: false // No audio needed
        };

        try {
            console.log('📷 Requesting camera access...');

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Attach stream to video element
            this.videoElement.srcObject = this.stream;

            // Wait for video metadata to load
            await new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play()
                        .then(resolve)
                        .catch(reject);
                };

                this.videoElement.onerror = () => {
                    reject(new Error('Failed to load video'));
                };

                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Camera initialization timeout'));
                }, 10000);
            });

            this.isActive = true;

            console.log('✅ Camera initialized:', {
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight,
                stream: this.stream
            });

            return this.stream;

        } catch (error) {
            console.error('❌ Camera access failed:', error);

            // Provide user-friendly error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access and reload.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please connect a camera and reload.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('Camera is in use by another application. Please close it and reload.');
            } else {
                throw new Error(`Camera error: ${error.message}`);
            }
        }
    }

    /**
     * Get current video resolution
     * @returns {Object} Width and height
     */
    getResolution() {
        if (!this.videoElement) {
            return { width: 0, height: 0 };
        }

        return {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
        };
    }

    /**
     * Get video element
     * @returns {HTMLVideoElement}
     */
    getVideoElement() {
        return this.videoElement;
    }

    /**
     * Check if camera is active
     * @returns {boolean}
     */
    isReady() {
        return this.isActive && this.stream && this.videoElement.readyState >= 2;
    }

    /**
     * Stop camera and release resources
     */
    dispose() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('🛑 Stopped camera track:', track.label);
            });
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.isActive = false;
        console.log('✅ Camera disposed');
    }
}
