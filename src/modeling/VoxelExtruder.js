/**
 * Voxel Extruder
 * 
 * Extrudes voxel faces to create new voxels in a specific direction.
 * Works with face detection system to enable intuitive 3D modeling.
 * 
 * Features:
 * - Single face extrusion
 * - Multi-face extrusion (selection-based)
 * - Intrude (negative extrusion / delete)
 * - Collision detection during extrusion
 * - Real-time preview
 * - Grid-aligned extrusion
 */

import * as THREE from 'three';

export class VoxelExtruder {
    constructor(scene, gridSystem, collisionSystem) {
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;

        // Extrusion state
        this.isExtruding = false;
        this.extrusionPreview = [];
        this.extrusionData = null;

        console.log('✅ VoxelExtruder initialized');
    }

    /**
     * Start extrusion operation
     * 
     * @param {Object} faceData - Face detection data
     * @param {number} distance - Extrusion distance (grid units)
     * @returns {Object} Extrusion result
     */
    extrude(faceData, distance = 1) {
        if (distance === 0) {
            return { success: false, reason: 'zero-distance' };
        }

        const createdVoxels = [];
        const { gridPosition, direction } = faceData;

        // Calculate positions along extrusion path
        for (let i = 1; i <= Math.abs(distance); i++) {
            const offset = distance > 0 ? i : -i;

            const newGridPos = {
                x: gridPosition.x + (direction.x * offset),
                y: gridPosition.y + (direction.y * offset),
                z: gridPosition.z + (direction.z * offset)
            };

            // Collision check
            const collision = this.collisionSystem.canPlaceVoxel(newGridPos);
            if (!collision.canPlace) {
                console.warn(`Extrusion blocked at grid position`, newGridPos);
                break;
            }

            // Create voxel
            const voxel = this.createVoxel(newGridPos, faceData.object);
            createdVoxels.push(voxel);

            // Add to scene
            this.scene.add(voxel);

            // Register in collision system
            this.collisionSystem.registerVoxel(voxel, newGridPos);
        }

        console.log(`↗️ Extruded ${createdVoxels.length} voxels`);

        return {
            success: true,
            voxels: createdVoxels,
            count: createdVoxels.length,
            direction: direction,
            distance: distance
        };
    }

    /**
     * Extrude multiple faces (from selection)
     * 
     * @param {Array} faceDataArray - Array of face data
     * @param {number} distance - Extrusion distance
     * @returns {Object} Extrusion result
     */
    extrudeMultiple(faceDataArray, distance = 1) {
        const allCreatedVoxels = [];

        for (const faceData of faceDataArray) {
            const result = this.extrude(faceData, distance);
            if (result.success) {
                allCreatedVoxels.push(...result.voxels);
            }
        }

        return {
            success: allCreatedVoxels.length > 0,
            voxels: allCreatedVoxels,
            count: allCreatedVoxels.length
        };
    }

    /**
     * Intrude (negative extrusion - delete voxels)
     * 
     * @param {Object} faceData - Face detection data
     * @param {number} distance - Intrusion distance
     * @returns {Object} Intrusion result
     */
    intrude(faceData, distance = 1) {
        const deletedVoxels = [];
        const { gridPosition, direction } = faceData;

        // Calculate positions to delete
        for (let i = 0; i < distance; i++) {
            const deleteGridPos = {
                x: gridPosition.x - (direction.x * i),
                y: gridPosition.y - (direction.y * i),
                z: gridPosition.z - (direction.z * i)
            };

            // Get voxel at position
            const voxel = this.collisionSystem.getVoxelAt(deleteGridPos);
            if (voxel) {
                deletedVoxels.push(voxel);

                // Remove from scene
                this.scene.remove(voxel);

                // Unregister from collision system
                this.collisionSystem.unregisterVoxel(deleteGridPos);

                // Dispose
                if (voxel.geometry) voxel.geometry.dispose();
                if (voxel.material) voxel.material.dispose();
            }
        }

        console.log(`↙️ Intruded ${deletedVoxels.length} voxels`);

        return {
            success: deletedVoxels.length > 0,
            voxels: deletedVoxels,
            count: deletedVoxels.length
        };
    }

    /**
     * Create extrusion preview
     * 
     * @param {Object} faceData - Face data
     * @param {number} distance - Preview distance
     */
    createPreview(faceData, distance) {
        this.clearPreview();

        const { gridPosition, direction } = faceData;

        for (let i = 1; i <= Math.abs(distance); i++) {
            const offset = distance > 0 ? i : -i;

            const newGridPos = {
                x: gridPosition.x + (direction.x * offset),
                y: gridPosition.y + (direction.y * offset),
                z: gridPosition.z + (direction.z * offset)
            };

            // Check collision
            const collision = this.collisionSystem.canPlaceVoxel(newGridPos);
            const color = collision.canPlace ? 0x00ff88 : 0xff0055;

            // Create preview voxel
            const worldPos = this.gridSystem.gridToWorld(newGridPos);
            const preview = this.createPreviewVoxel(worldPos, color);

            this.extrusionPreview.push(preview);
            this.scene.add(preview);
        }

        this.isExtruding = true;
    }

    /**
     * Create a preview voxel (transparent)
     * 
     * @param {Object} worldPos - World position
     * @param {number} color - Color
     * @returns {THREE.Mesh} Preview mesh
     */
    createPreviewVoxel(worldPos, color) {
        const geometry = new THREE.BoxGeometry(3.0, 3.0, 3.0);
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            emissive: color,
            emissiveIntensity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
        mesh.userData.isPreview = true;
        mesh.renderOrder = 998;

        return mesh;
    }

    /**
     * Clear extrusion preview
     */
    clearPreview() {
        for (const preview of this.extrusionPreview) {
            this.scene.remove(preview);
            preview.geometry.dispose();
            preview.material.dispose();
        }

        this.extrusionPreview = [];
        this.isExtruding = false;
    }

    /**
     * Create a voxel
     * 
     * @param {Object} gridPos - Grid position
     * @param {THREE.Object3D} sourceVoxel - Source voxel (for color)
     * @returns {THREE.Mesh} Created voxel
     */
    createVoxel(gridPos, sourceVoxel) {
        const worldPos = this.gridSystem.gridToWorld(gridPos);

        const geometry = new THREE.BoxGeometry(3.0, 3.0, 3.0);
        const material = sourceVoxel.material.clone();

        const voxel = new THREE.Mesh(geometry, material);
        voxel.position.set(worldPos.x, worldPos.y, worldPos.z);
        voxel.userData.gridPosition = gridPos;
        voxel.userData.isVoxel = true;
        voxel.userData.isBlock = true; // For compatibility
        voxel.castShadow = true;
        voxel.receiveShadow = true;

        return voxel;
    }

    /**
     * Get extrusion preview count
     * 
     * @returns {number} Number of preview voxels
     */
    getPreviewCount() {
        return this.extrusionPreview.length;
    }

    /**
     * Check if extruding
     * 
     * @returns {boolean}
     */
    isActive() {
        return this.isExtruding;
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.clearPreview();
        console.log('✅ VoxelExtruder disposed');
    }
}
