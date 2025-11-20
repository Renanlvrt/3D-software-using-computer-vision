/**
 * Grid-Based Block System (Minecraft-style)
 * Supports volume creation, face attachment, and collision detection
 */

import * as THREE from 'three';

export class GridBlockSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Grid configuration
        this.gridSize = 1.0; // 1 unit per block
        this.maxBlocks = 1000; // Limit total blocks

        // Block storage with 3D grid key
        this.blocks = new Map(); // key: "x,y,z" -> mesh

        // Volume creation state
        this.isCreating = false;
        this.startCorner = null;
        this.endCorner = null;
        this.previewBlocks = [];

        // Materials
        this.previewMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88, // Same as solid block
            transparent: false, // Opaque for "real" feel
            opacity: 1.0,
            roughness: 0.6,
            metalness: 0.4,
            emissive: 0x004422, // Slight glow to indicate active creation
            emissiveIntensity: 0.5
        });

        this.solidMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            roughness: 0.6,
            metalness: 0.4
        });

        // Block geometry (reused for performance)
        this.blockGeometry = new THREE.BoxGeometry(this.gridSize, this.gridSize, this.gridSize);

        console.log('✅ GridBlockSystem initialized');
    }

    /**
     * Update system with gesture data
     * @param {Object} gestureData - Hand and gesture information
     */
    update(gestureData) {
        if (!gestureData.twoHandPinch) {
            // If hands released, finalize creation
            if (this.isCreating) {
                this.finalizeVolume();
            }
            return;
        }

        const { twoHandPinch } = gestureData;

        if (twoHandPinch.isActive) {
            if (!this.isCreating) {
                // Start new volume
                this.startVolume(twoHandPinch);
            } else {
                // Update volume size
                this.updateVolume(twoHandPinch);
            }
        }
    }

    /**
     * Start volume creation
     * @param {Object} pinchData - Two-hand pinch data
     */
    startVolume(pinchData) {
        this.isCreating = true;

        // Snap to grid
        this.startCorner = this.snapToGrid(pinchData.leftPosition);
        this.endCorner = this.snapToGrid(pinchData.rightPosition);

        this.updateVolumePreview();
    }

    /**
     * Update volume during creation
     * @param {Object} pinchData - Two-hand pinch data
     */
    updateVolume(pinchData) {
        this.endCorner = this.snapToGrid(pinchData.rightPosition);
        this.updateVolumePreview();
    }

    /**
     * Snap position to grid
     * @param {THREE.Vector3} position - World position
     * @returns {THREE.Vector3} Snapped position
     */
    snapToGrid(position) {
        return new THREE.Vector3(
            Math.round(position.x / this.gridSize) * this.gridSize,
            Math.round(position.y / this.gridSize) * this.gridSize,
            Math.round(position.z / this.gridSize) * this.gridSize
        );
    }

    /**
     * Get grid key for position
     * @param {THREE.Vector3} position - Grid position
     * @returns {string} Grid key
     */
    getGridKey(position) {
        const x = Math.round(position.x / this.gridSize);
        const y = Math.round(position.y / this.gridSize);
        const z = Math.round(position.z / this.gridSize);
        return `${x},${y},${z}`;
    }

    /**
     * Check if position is occupied
     * @param {THREE.Vector3} position - Grid position
     * @returns {boolean} True if occupied
     */
    isOccupied(position) {
        return this.blocks.has(this.getGridKey(position));
    }

    /**
     * Update volume preview
     */
    updateVolumePreview() {
        // Clear old preview
        this.clearPreview();

        // Calculate volume bounds
        const minX = Math.min(this.startCorner.x, this.endCorner.x);
        const maxX = Math.max(this.startCorner.x, this.endCorner.x);
        const minY = Math.min(this.startCorner.y, this.endCorner.y);
        const maxY = Math.max(this.startCorner.y, this.endCorner.y);
        const minZ = Math.min(this.startCorner.z, this.endCorner.z);
        const maxZ = Math.max(this.startCorner.z, this.endCorner.z);

        // Create preview blocks
        for (let x = minX; x <= maxX; x += this.gridSize) {
            for (let y = minY; y <= maxY; y += this.gridSize) {
                for (let z = minZ; z <= maxZ; z += this.gridSize) {
                    const pos = new THREE.Vector3(x, y, z);

                    // Skip if position occupied
                    if (this.isOccupied(pos)) continue;

                    // Check if valid placement (first block or touching existing)
                    if (this.blocks.size === 0 || this.isTouchingExisting(pos)) {
                        const block = new THREE.Mesh(this.blockGeometry, this.previewMaterial);
                        block.position.copy(pos);
                        block.castShadow = true;
                        block.receiveShadow = true;

                        this.scene.add(block);
                        this.previewBlocks.push(block);
                    }
                }
            }
        }

        console.log(`📦 Preview: ${this.previewBlocks.length} blocks`);
    }

    /**
     * Check if position touches existing block
     * @param {THREE.Vector3} position - Grid position
     * @returns {boolean} True if touching
     */
    isTouchingExisting(position) {
        // Check all 6 adjacent positions
        const offsets = [
            new THREE.Vector3(this.gridSize, 0, 0),
            new THREE.Vector3(-this.gridSize, 0, 0),
            new THREE.Vector3(0, this.gridSize, 0),
            new THREE.Vector3(0, -this.gridSize, 0),
            new THREE.Vector3(0, 0, this.gridSize),
            new THREE.Vector3(0, 0, -this.gridSize)
        ];

        for (const offset of offsets) {
            const adjacentPos = position.clone().add(offset);
            if (this.isOccupied(adjacentPos)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Clear preview blocks
     */
    clearPreview() {
        for (const block of this.previewBlocks) {
            this.scene.remove(block);
            // Geometry and material are reused, don't dispose
        }
        this.previewBlocks = [];
    }

    /**
     * Finalize volume creation
     */
    finalizeVolume() {
        if (this.previewBlocks.length === 0) {
            this.isCreating = false;
            return;
        }

        const createdBlocks = [];

        // Convert preview to solid blocks
        for (const previewBlock of this.previewBlocks) {
            const position = previewBlock.position.clone();

            // Create solid block
            const block = new THREE.Mesh(
                this.blockGeometry,
                this.solidMaterial.clone() // Clone for independent colors later
            );
            block.position.copy(position);
            block.castShadow = true;
            block.receiveShadow = true;

            // Mark as user-created block
            block.userData.isBlock = true;
            block.userData.gridPosition = position.clone();
            block.userData.createdAt = Date.now();

            // Add to scene and storage
            this.scene.add(block);
            this.blocks.set(this.getGridKey(position), block);

            createdBlocks.push(block);
        }

        // Clear preview
        this.clearPreview();

        // Emit event for undo/redo
        this.eventBus.emit('blocks-created', { blocks: createdBlocks });

        console.log(`✅ Created ${createdBlocks.length} blocks (total: ${this.blocks.size})`);

        // Reset state
        this.isCreating = false;
        this.startCorner = null;
        this.endCorner = null;
    }

    /**
     * Delete block at position
     * @param {THREE.Vector3} position - Grid position
     */
    deleteBlock(position) {
        const key = this.getGridKey(position);
        const block = this.blocks.get(key);

        if (block) {
            this.scene.remove(block);
            this.blocks.delete(key);

            this.eventBus.emit('block-deleted', { block });
            console.log(`🗑️ Deleted block at ${key}`);
        }
    }

    /**
     * Clear all blocks
     */
    clearAll() {
        for (const [key, block] of this.blocks) {
            this.scene.remove(block);
        }

        this.blocks.clear();
        this.clearPreview();

        this.eventBus.emit('blocks-cleared');
        console.log('🗑️ All blocks cleared');
    }

    /**
     * Get block count
     * @returns {number} Number of placed blocks
     */
    getBlockCount() {
        return this.blocks.size;
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.clearAll();
        this.blockGeometry.dispose();
        this.previewMaterial.dispose();
        this.solidMaterial.dispose();

        console.log('✅ GridBlockSystem disposed');
    }
}
