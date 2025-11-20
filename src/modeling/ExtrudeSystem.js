/**
 * Extrude System
 * Handles extruding 2D shapes into 3D geometry
 */

import * as THREE from 'three';

export class ExtrudeSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Extrusion state
        this.isExtruding = false;
        this.extrudePath = [];
        this.previewMesh = null;
        this.extrudeDepth = 1.0;

        // Extrusion parameters
        this.minDepth = 0.1;
        this.maxDepth = 10.0;
        this.steps = 10; // Smoothness of extrusion
    }

    /**
     * Start extrusion from a 2D path
     * @param {Array} pathPoints - Array of 2D points defining the shape
     * @param {Object} startPosition - Starting 3D position
     */
    startExtrusion(pathPoints, startPosition) {
        if (pathPoints.length < 3) {
            console.warn('Need at least 3 points to extrude');
            return;
        }

        this.isExtruding = true;
        this.extrudePath = pathPoints;

        // Create preview
        this.createExtrudePreview(startPosition);

        console.log('🔨 Extrusion started');
    }

    /**
     * Create extrude preview mesh
     * @param {Object} position - 3D position
     */
    createExtrudePreview(position) {
        // Create 2D shape from path
        const shape = new THREE.Shape();

        // Start at first point
        shape.moveTo(this.extrudePath[0].x, this.extrudePath[0].y);

        // Add remaining points
        for (let i = 1; i < this.extrudePath.length; i++) {
            shape.lineTo(this.extrudePath[i].x, this.extrudePath[i].y);
        }

        // Close the path
        shape.lineTo(this.extrudePath[0].x, this.extrudePath[0].y);

        // Extrude settings
        const extrudeSettings = {
            depth: this.extrudeDepth,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelOffset: 0,
            bevelSegments: 3,
            steps: this.steps,
            curveSegments: 12
        };

        // Create geometry
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Semi-transparent material for preview
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.5,
            metalness: 0.3,
            side: THREE.DoubleSide
        });

        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewMesh.position.copy(position);
        this.previewMesh.castShadow = true;
        this.previewMesh.receiveShadow = true;

        this.scene.add(this.previewMesh);
    }

    /**
     * Update extrusion depth
     * @param {number} depth - New extrusion depth
     */
    updateExtrudeDepth(depth) {
        if (!this.isExtruding || !this.previewMesh) return;

        this.extrudeDepth = Math.max(this.minDepth, Math.min(depth, this.maxDepth));

        // Recreate geometry with new depth
        const position = this.previewMesh.position.clone();
        const rotation = this.previewMesh.rotation.clone();

        // Remove old preview
        this.scene.remove(this.previewMesh);
        this.previewMesh.geometry.dispose();
        this.previewMesh.material.dispose();

        // Create new preview
        this.createExtrudePreview(position);
        this.previewMesh.rotation.copy(rotation);
    }

    /**
     * Finalize extrusion and create solid mesh
     * @returns {THREE.Mesh} Created mesh
     */
    finalizeExtrusion() {
        if (!this.isExtruding || !this.previewMesh) {
            return null;
        }

        // Create final solid mesh
        const shape = new THREE.Shape();
        shape.moveTo(this.extrudePath[0].x, this.extrudePath[0].y);

        for (let i = 1; i < this.extrudePath.length; i++) {
            shape.lineTo(this.extrudePath[i].x, this.extrudePath[i].y);
        }

        shape.lineTo(this.extrudePath[0].x, this.extrudePath[0].y);

        const extrudeSettings = {
            depth: this.extrudeDepth,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelOffset: 0,
            bevelSegments: 3,
            steps: this.steps,
            curveSegments: 12
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Solid material
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ccff,
            roughness: 0.6,
            metalness: 0.4,
            side: THREE.DoubleSide
        });

        const finalMesh = new THREE.Mesh(geometry, material);
        finalMesh.position.copy(this.previewMesh.position);
        finalMesh.rotation.copy(this.previewMesh.rotation);
        finalMesh.castShadow = true;
        finalMesh.receiveShadow = true;

        // Mark as extruded object
        finalMesh.userData.isExtruded = true;
        finalMesh.userData.createdAt = Date.now();

        // Remove preview
        this.scene.remove(this.previewMesh);
        this.previewMesh.geometry.dispose();
        this.previewMesh.material.dispose();
        this.previewMesh = null;

        // Add final mesh
        this.scene.add(finalMesh);

        // Emit event
        this.eventBus.emit('extrude-created', { mesh: finalMesh });

        // Reset state
        this.isExtruding = false;
        this.extrudePath = [];
        this.extrudeDepth = 1.0;

        console.log('✅ Extrusion finalized');

        return finalMesh;
    }

    /**
     * Cancel current extrusion
     */
    cancelExtrusion() {
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh.geometry.dispose();
            this.previewMesh.material.dispose();
            this.previewMesh = null;
        }

        this.isExtruding = false;
        this.extrudePath = [];
        this.extrudeDepth = 1.0;

        console.log('❌ Extrusion cancelled');
    }

    /**
     * Create a simple rectangular extrusion
     * @param {Object} center - Center position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} depth - Extrusion depth
     * @returns {THREE.Mesh} Created mesh
     */
    createRectangleExtrusion(center, width, height, depth) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const pathPoints = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ];

        this.extrudePath = pathPoints;
        this.extrudeDepth = depth;
        this.isExtruding = true;

        this.createExtrudePreview(center);
        return this.finalizeExtrusion();
    }

    /**
     * Create a circular extrusion
     * @param {Object} center - Center position
     * @param {number} radius - Circle radius
     * @param {number} depth - Extrusion depth
     * @param {number} segments - Number of segments (smoothness)
     * @returns {THREE.Mesh} Created mesh
     */
    createCircleExtrusion(center, radius, depth, segments = 32) {
        const pathPoints = [];

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            pathPoints.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }

        this.extrudePath = pathPoints;
        this.extrudeDepth = depth;
        this.isExtruding = true;

        this.createExtrudePreview(center);
        return this.finalizeExtrusion();
    }

    /**
     * Check if currently extruding
     * @returns {boolean}
     */
    isActive() {
        return this.isExtruding;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.cancelExtrusion();
        console.log('✅ ExtrudeSystem disposed');
    }
}
