/**
 * Hover Indicator
 * 
 * Visual feedback for point-to-select feature.
 * Shows a progress ring around hovered objects.
 */

import * as THREE from 'three';

export class HoverIndicator {
    constructor(scene) {
        this.scene = scene;

        // Configuration
        this.RING_RADIUS = 2.0;
        this.RING_COLOR = 0xffaa00;  // Orange

        // Indicator mesh
        this.indicator = null;
        this.progressRing = null;

        console.log('✅ HoverIndicator initialized');
    }

    /**
     * Show hover indicator on object
     * 
     * @param {THREE.Object3D} object - Object being hovered
     * @param {number} progress - Selection progress 0.0-1.0
     */
    show(object, progress = 0.0) {
        if (!this.indicator) {
            this.createIndicator();
        }

        // Position indicator at object
        this.indicator.position.copy(object.position);
        this.indicator.visible = true;

        // Update progress ring
        this.updateProgress(progress);
    }

    /**
     * Hide indicator
     */
    hide() {
        if (this.indicator) {
            this.indicator.visible = false;
        }
    }

    /**
     * Create indicator mesh
     */
    createIndicator() {
        this.indicator = new THREE.Group();

        // Base ring (full circle)
        const baseGeometry = new THREE.RingGeometry(
            this.RING_RADIUS * 0.9,
            this.RING_RADIUS * 1.0,
            32
        );
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthTest: false
        });

        const baseRing = new THREE.Mesh(baseGeometry, baseMaterial);
        baseRing.rotation.x = -Math.PI / 2;
        this.indicator.add(baseRing);

        // Progress ring (partial circle)
        const progressGeometry = new THREE.RingGeometry(
            this.RING_RADIUS * 0.9,
            this.RING_RADIUS * 1.0,
            32,
            1,
            0,
            Math.PI * 2 * 0.0 // Start at 0%
        );
        const progressMaterial = new THREE.MeshBasicMaterial({
            color: this.RING_COLOR,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthTest: false
        });

        this.progressRing = new THREE.Mesh(progressGeometry, progressMaterial);
        this.progressRing.rotation.x = -Math.PI / 2;
        this.indicator.add(this.progressRing);

        // Pulsing center dot
        const dotGeometry = new THREE.CircleGeometry(this.RING_RADIUS * 0.3, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: this.RING_COLOR,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });

        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.rotation.x = -Math.PI / 2;
        this.indicator.add(dot);

        this.indicator.userData.isHoverIndicator = true;
        this.indicator.renderOrder = 1000;
        this.indicator.visible = false;

        this.scene.add(this.indicator);
    }

    /**
     * Update progress ring
     * 
     * @param {number} progress - Progress 0.0-1.0
     */
    updateProgress(progress) {
        if (!this.progressRing) return;

        // Update ring geometry to show progress
        const angle = Math.PI * 2 * progress;

        // Recreate geometry with new angle
        this.progressRing.geometry.dispose();
        this.progressRing.geometry = new THREE.RingGeometry(
            this.RING_RADIUS * 0.9,
            this.RING_RADIUS * 1.0,
            32,
            1,
            -Math.PI / 2, // Start at top
            angle
        );

        // Pulse effect at 100%
        if (progress >= 1.0) {
            const scale = 1.0 + Math.sin(Date.now() / 100) * 0.1;
            this.progressRing.scale.set(scale, scale, 1);
        } else {
            this.progressRing.scale.set(1, 1, 1);
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.indicator) {
            this.scene.remove(this.indicator);

            for (const child of this.indicator.children) {
                child.geometry.dispose();
                child.material.dispose();
            }
        }

        console.log('✅ HoverIndicator disposed');
    }
}
