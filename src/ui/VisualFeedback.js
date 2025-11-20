/**
 * Visual Feedback - Hand Cursor and Gesture Visualization
 * Provides real-time visual feedback for hand tracking in 3D space
 */

import * as THREE from 'three';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

export class VisualFeedback {
    constructor(scene, canvasElement) {
        this.scene = scene;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement?.getContext('2d');

        // Hand cursors in 3D space
        this.handCursors = new Map();

        // Pinch indicators
        this.pinchIndicators = new Map();
    }

    /**
     * Draw hand skeleton on 2D canvas overlay
     * @param {Object} results - MediaPipe hands results
     */
    drawHandOverlay(results) {
        if (!this.canvasCtx || !this.canvasElement) return;

        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // Draw video frame (mirrored for user friendliness)
        this.canvasCtx.drawImage(
            results.image,
            0, 0,
            this.canvasElement.width,
            this.canvasElement.height
        );

        // Draw hand landmarks and connections
        if (results.multiHandLandmarks) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i].label;

                // Choose color based on hand
                const color = handedness === 'Left' ? '#00FF88' : '#00CCFF';

                // Draw connections
                drawConnectors(
                    this.canvasCtx,
                    landmarks,
                    HAND_CONNECTIONS,
                    { color: color, lineWidth: 2 }
                );

                // Draw landmarks
                drawLandmarks(
                    this.canvasCtx,
                    landmarks,
                    { color: color, fillColor: '#FFFFFF', lineWidth: 1, radius: 3 }
                );
            }
        }

        this.canvasCtx.restore();
    }

    /**
     * Show hand cursor in 3D space
     * @param {string} handId - Hand identifier
     * @param {Object} position - 3D position
     * @param {Object} state - Gesture state (isPinched, etc.)
     */
    showHandCursor(handId, position, state = {}) {
        if (!this.handCursors.has(handId)) {
            // Create cursor geometry
            const geometry = new THREE.SphereGeometry(0.2, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: handId === 'left' ? 0x00ff88 : 0x00ccff,
                transparent: true,
                opacity: 0.8
            });

            const cursor = new THREE.Mesh(geometry, material);
            cursor.renderOrder = 999; // Always render on top

            this.scene.add(cursor);
            this.handCursors.set(handId, cursor);
        }

        const cursor = this.handCursors.get(handId);

        // Update position
        cursor.position.set(position.x, position.y, position.z);

        // Update color based on pinch state
        if (state.isPinched) {
            cursor.material.color.setHex(0xff6b9d); // Pink when pinching
            cursor.scale.setScalar(0.7);
        } else {
            const baseColor = handId === 'left' ? 0x00ff88 : 0x00ccff;
            cursor.material.color.setHex(baseColor);
            cursor.scale.setScalar(1.0);
        }
    }

    /**
     * Hide hand cursor
     * @param {string} handId - Hand identifier
     */
    hideHandCursor(handId) {
        if (this.handCursors.has(handId)) {
            const cursor = this.handCursors.get(handId);
            this.scene.remove(cursor);
            cursor.geometry.dispose();
            cursor.material.dispose();
            this.handCursors.delete(handId);
        }
    }

    /**
     * Show object selection highlight
     * @param {THREE.Object3D} object - Object to highlight
     */
    highlightObject(object) {
        // Create outline effect
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.BackSide
        });

        const outlineMesh = new THREE.Mesh(object.geometry, outlineMaterial);
        outlineMesh.scale.multiplyScalar(1.05);

        object.add(outlineMesh);
        object.userData.highlight = outlineMesh;
    }

    /**
     * Remove object highlight
     * @param {THREE.Object3D} object - Object to remove highlight from
     */
    removeHighlight(object) {
        if (object.userData.highlight) {
            object.remove(object.userData.highlight);
            object.userData.highlight.geometry.dispose();
            object.userData.highlight.material.dispose();
            delete object.userData.highlight;
        }
    }

    /**
     * Clean up all visual feedback
     */
    dispose() {
        // Remove all hand cursors
        for (const [handId, cursor] of this.handCursors) {
            this.scene.remove(cursor);
            cursor.geometry.dispose();
            cursor.material.dispose();
        }
        this.handCursors.clear();

        console.log('✅ VisualFeedback disposed');
    }
}
