/**
 * Box Selector
 * 
 * Creates 3D box selection for selecting multiple voxels at once.
 * Uses axis-aligned bounding box (AABB) intersection.
 * 
 * Features:
 * - Drag to create selection box visual
 * - AABB intersection with voxels
 * - Real-time visual feedback
 * - Multi-select mode support
 */

import * as THREE from 'three';

export class BoxSelector {
    constructor(scene, gridSystem) {
        this.scene = scene;
        this.gridSystem = gridSystem;

        // Selection state
        this.isSelecting = false;
        this.startPosition = null;
        this.endPosition = null;
        this.selectionBox = null;

        // Configuration
        this.BOX_COLOR = 0x00aaff;
        this.BOX_OPACITY = 0.3;

        console.log('✅ BoxSelector initialized');
    }

    /**
     * Start box selection
     * 
     * @param {Object} worldPosition - Starting world position
     */
    startSelection(worldPosition) {
        this.isSelecting = true;
        this.startPosition = this.gridSystem.snapToGrid(worldPosition);
        this.endPosition = { ...this.startPosition };

        this.createSelectionBox();
    }

    /**
     * Update box selection endpoint
     * 
     * @param {Object} worldPosition - Current world position
     */
    updateSelection(worldPosition) {
        if (!this.isSelecting) return;

        this.endPosition = this.gridSystem.snapToGrid(worldPosition);
        this.updateSelectionBox();
    }

    /**
     * Finalize selection and get selected objects
     * 
     * @param {Array} allObjects - All selectable objects
     * @returns {Array} Selected objects
     */
    finalizeSelection(allObjects) {
        if (!this.isSelecting) return [];

        const selected = this.getObjectsInBox(allObjects);

        this.clearSelectionBox();
        this.isSelecting = false;
        this.startPosition = null;
        this.endPosition = null;

        console.log(`📦 Box selection: ${selected.length} objects`);

        return selected;
    }

    /**
     * Cancel selection
     */
    cancelSelection() {
        this.clearSelectionBox();
        this.isSelecting = false;
        this.startPosition = null;
        this.endPosition = null;
    }

    /**
     * Create visual selection box
     */
    createSelectionBox() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: this.BOX_COLOR,
            transparent: true,
            opacity: this.BOX_OPACITY,
            wireframe: false,
            side: THREE.DoubleSide
        });

        this.selectionBox = new THREE.Mesh(geometry, material);
        this.selectionBox.userData.isSelectionBox = true;
        this.selectionBox.renderOrder = 1001;

        // Create wireframe outline
        const wireGeometry = new THREE.EdgesGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({
            color: this.BOX_COLOR,
            linewidth: 2
        });
        const wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
        this.selectionBox.add(wireframe);

        this.scene.add(this.selectionBox);
        this.updateSelectionBox();
    }

    /**
     * Update selection box size and position
     */
    updateSelectionBox() {
        if (!this.selectionBox || !this.startPosition || !this.endPosition) return;

        // Calculate bounding box
        const minX = Math.min(this.startPosition.x, this.endPosition.x);
        const maxX = Math.max(this.startPosition.x, this.endPosition.x);
        const minY = Math.min(this.startPosition.y, this.endPosition.y);
        const maxY = Math.max(this.startPosition.y, this.endPosition.y);
        const minZ = Math.min(this.startPosition.z, this.endPosition.z);
        const maxZ = Math.max(this.startPosition.z, this.endPosition.z);

        // Calculate center and size
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const sizeX = maxX - minX + 3.0; // +voxel size
        const sizeY = maxY - minY + 3.0;
        const sizeZ = maxZ - minZ + 3.0;

        // Update box
        this.selectionBox.position.set(centerX, centerY, centerZ);
        this.selectionBox.scale.set(sizeX, sizeY, sizeZ);
    }

    /**
     * Get objects within selection box
     * 
     * @param {Array} allObjects - All objects to test
     * @returns {Array} Objects within box
     */
    getObjectsInBox(allObjects) {
        if (!this.startPosition || !this.endPosition) return [];

        // Calculate bounding box in grid coordinates
        const minX = Math.min(this.startPosition.x, this.endPosition.x);
        const maxX = Math.max(this.startPosition.x, this.endPosition.x);
        const minY = Math.min(this.startPosition.y, this.endPosition.y);
        const maxY = Math.max(this.startPosition.y, this.endPosition.y);
        const minZ = Math.min(this.startPosition.z, this.endPosition.z);
        const maxZ = Math.max(this.startPosition.z, this.endPosition.z);

        const selected = [];

        for (const object of allObjects) {
            if (!object.userData.gridPosition) continue;

            const gridPos = object.userData.gridPosition;
            const worldPos = object.position;

            // Check AABB intersection
            if (worldPos.x >= minX && worldPos.x <= maxX &&
                worldPos.y >= minY && worldPos.y <= maxY &&
                worldPos.z >= minZ && worldPos.z <= maxZ) {
                selected.push(object);
            }
        }

        return selected;
    }

    /**
     * Clear selection box visual
     */
    clearSelectionBox() {
        if (this.selectionBox) {
            this.scene.remove(this.selectionBox);

            // Dispose wireframe
            if (this.selectionBox.children.length > 0) {
                const wireframe = this.selectionBox.children[0];
                wireframe.geometry.dispose();
                wireframe.material.dispose();
            }

            this.selectionBox.geometry.dispose();
            this.selectionBox.material.dispose();
            this.selectionBox = null;
        }
    }

    /**
     * Check if currently selecting
     * 
     * @returns {boolean}
     */
    isActive() {
        return this.isSelecting;
    }

    /**
     * Get selection bounds
     * 
     * @returns {Object|null} Bounds or null
     */
    getBounds() {
        if (!this.startPosition || !this.endPosition) return null;

        return {
            min: {
                x: Math.min(this.startPosition.x, this.endPosition.x),
                y: Math.min(this.startPosition.y, this.endPosition.y),
                z: Math.min(this.startPosition.z, this.endPosition.z)
            },
            max: {
                x: Math.max(this.startPosition.x, this.endPosition.x),
                y: Math.max(this.startPosition.y, this.endPosition.y),
                z: Math.max(this.startPosition.z, this.endPosition.z)
            }
        };
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.clearSelectionBox();
        console.log('✅ BoxSelector disposed');
    }
}
