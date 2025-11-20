/**
 * Ghost Preview System
 * 
 * Creates semi-transparent preview meshes of objects being dragged/manipulated.
 * Provides visual feedback before finalizing placement.
 * 
 * Features:
 * - Clone selected objects as transparent meshes
 * - Update positions in real-time
 * - Color coding: Green (valid), Red (collision), Blue (preview)
 * - Automatic cleanup on release
 * - Grid snapping visualization
 */

import * as THREE from 'three';

export class GhostPreview {
    constructor(scene, gridSystem, collisionSystem) {
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;

        // Preview configuration
        this.PREVIEW_OPACITY = 0.5;
        this.VALID_COLOR = 0x00ff88;      // Green - valid placement
        this.INVALID_COLOR = 0xff0055;    // Red - collision
        this.NEUTRAL_COLOR = 0x00aaff;    // Blue - neutral preview

        // Preview state
        this.previewMeshes = [];
        this.isActive = false;
        this.originalObjects = [];
        this.currentValid = true;

        console.log('✅ GhostPreview initialized');
    }

    /**
     * Create ghost preview from selected objects
     * 
     * @param {Set|Array} objects - Objects to preview
     * @param {string} previewType - Type: 'move', 'rotate', 'extrude'
     * @returns {Array} Created preview meshes
     */
    create(objects, previewType = 'move') {
        if (this.isActive) {
            this.clear();
        }

        this.originalObjects = Array.from(objects);
        this.previewMeshes = [];

        for (const originalObject of this.originalObjects) {
            const ghostMesh = this.createGhostMesh(originalObject, previewType);
            this.previewMeshes.push(ghostMesh);
            this.scene.add(ghostMesh);
        }

        this.isActive = true;

        console.log(`👻 Created ghost preview (${this.previewMeshes.length} objects, type: ${previewType})`);

        return this.previewMeshes;
    }

    /**
     * Create a single ghost mesh from an object
     * 
     * @param {THREE.Object3D} originalObject - Source object
     * @param {string} previewType - Preview type
     * @returns {THREE.Mesh} Ghost mesh
     */
    createGhostMesh(originalObject, previewType) {
        // Clone geometry
        const geometry = originalObject.geometry.clone();

        // Create ghost material
        const material = new THREE.MeshStandardMaterial({
            color: this.NEUTRAL_COLOR,
            transparent: true,
            opacity: this.PREVIEW_OPACITY,
            emissive: this.NEUTRAL_COLOR,
            emissiveIntensity: 0.3,
            roughness: 0.5,
            metalness: 0.5,
            depthWrite: false  // Render behind solid objects
        });

        const ghostMesh = new THREE.Mesh(geometry, material);

        // Copy transform
        ghostMesh.position.copy(originalObject.position);
        ghostMesh.rotation.copy(originalObject.rotation);
        ghostMesh.scale.copy(originalObject.scale);

        // Store reference
        ghostMesh.userData.isGhost = true;
        ghostMesh.userData.originalObject = originalObject;
        ghostMesh.userData.previewType = previewType;

        // Don't cast shadows
        ghostMesh.castShadow = false;
        ghostMesh.receiveShadow = false;

        // Render on top (but transparent)
        ghostMesh.renderOrder = 999;

        return ghostMesh;
    }

    /**
     * Update preview positions
     * 
     * @param {Object} offset - Position offset {x, y, z}
     * @param {boolean} snapToGrid - Whether to snap to grid
     * @returns {boolean} True if valid placement
     */
    updatePositions(offset, snapToGrid = true) {
        if (!this.isActive) return true;

        let allValid = true;

        for (let i = 0; i < this.previewMeshes.length; i++) {
            const ghostMesh = this.previewMeshes[i];
            const originalObject = this.originalObjects[i];

            // Calculate new position
            const newPosition = {
                x: originalObject.position.x + offset.x,
                y: originalObject.position.y + offset.y,
                z: originalObject.position.z + offset.z
            };

            // Snap to grid if requested
            const finalPosition = snapToGrid
                ? this.gridSystem.snapToGrid(newPosition)
                : newPosition;

            ghostMesh.position.set(finalPosition.x, finalPosition.y, finalPosition.z);

            // Check collision (if collision system available)
            if (this.collisionSystem && snapToGrid) {
                const gridPos = this.gridSystem.worldToGrid(finalPosition);
                const collision = this.collisionSystem.canPlaceVoxel(gridPos);

                if (!collision.canPlace) {
                    allValid = false;
                    this.setMeshColor(ghostMesh, this.INVALID_COLOR);
                } else {
                    this.setMeshColor(ghostMesh, this.VALID_COLOR);
                }
            } else {
                this.setMeshColor(ghostMesh, this.NEUTRAL_COLOR);
            }
        }

        this.currentValid = allValid;
        return allValid;
    }

    /**
     * Update preview rotation
     * 
     * @param {number} angle - Rotation angle in radians
     * @param {string} axis - Rotation axis ('x', 'y', or 'z')
     */
    updateRotation(angle, axis = 'y') {
        if (!this.isActive) return;

        for (let i = 0; i < this.previewMeshes.length; i++) {
            const ghostMesh = this.previewMeshes[i];

            if (axis === 'x') {
                ghostMesh.rotation.x = angle;
            } else if (axis === 'y') {
                ghostMesh.rotation.y = angle;
            } else if (axis === 'z') {
                ghostMesh.rotation.z = angle;
            }
        }
    }

    /**
     * Update all preview meshes to a specific color
     * 
     * @param {number} color - Hex color
     */
    setColor(color) {
        for (const ghostMesh of this.previewMeshes) {
            this.setMeshColor(ghostMesh, color);
        }
    }

    /**
     * Set color for a single mesh
     * 
     * @param {THREE.Mesh} mesh - Mesh to color
     * @param {number} color - Hex color
     */
    setMeshColor(mesh, color) {
        mesh.material.color.setHex(color);
        mesh.material.emissive.setHex(color);
    }

    /**
     * Pulse animation for preview (visual feedback)
     */
    pulse() {
        if (!this.isActive) return;

        const pulseScale = 1.05;
        const duration = 200; // ms

        for (const ghostMesh of this.previewMeshes) {
            const originalScale = ghostMesh.scale.clone();

            // Scale up
            ghostMesh.scale.multiplyScalar(pulseScale);

            // Scale back down after duration
            setTimeout(() => {
                ghostMesh.scale.copy(originalScale);
            }, duration);
        }
    }

    /**
     * Check if current preview placement is valid
     * 
     * @returns {boolean} True if valid
     */
    isValid() {
        return this.currentValid;
    }

    /**
     * Get preview meshes
     * 
     * @returns {Array} Preview meshes
     */
    getMeshes() {
        return this.previewMeshes;
    }

    /**
     * Clear all preview meshes
     */
    clear() {
        for (const ghostMesh of this.previewMeshes) {
            this.scene.remove(ghostMesh);

            // D ispose resources
            if (ghostMesh.geometry) {
                ghostMesh.geometry.dispose();
            }
            if (ghostMesh.material) {
                ghostMesh.material.dispose();
            }
        }

        this.previewMeshes = [];
        this.originalObjects = [];
        this.isActive = false;
        this.currentValid = true;

        console.log('👻 Ghost preview cleared');
    }

    /**
     * Check if preview is active
     * 
     * @returns {boolean}
     */
    isActive() {
        return this.isActive;
    }

    /**
     * Get statistics
     * 
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            meshCount: this.previewMeshes.length,
            isValid: this.currentValid
        };
    }
}
