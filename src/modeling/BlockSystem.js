/**
 * Block Creation System
 * Handles creation of 3D blocks using two-hand pinch gesture
 */

import * as THREE from 'three';

export class BlockSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Block creation state
        this.isCreating = false;
        this.previewBlock = null;
        this.placedBlocks = [];
        this.currentLine = [];

        // Creation parameters
        this.defaultColor = 0x00ff88;
        this.minBlockSize = 0.5;
        this.maxBlockSize = 5.0;
        this.gridSize = 0.5; // Snapping grid size
        this.snapToGrid = true;
    }

    /**
     * Update block creation based on hand gestures
     * @param {Object} gestureData - Processed gesture data
     */
    update(gestureData) {
        const { leftHand, rightHand, twoHandPinch, singlePinch } = gestureData;

        // Two-hand pinch: Create new block
        if (twoHandPinch && twoHandPinch.isActive) {
            if (!this.isCreating) {
                this.startBlockCreation(twoHandPinch);
            } else {
                this.updatePreviewBlock(twoHandPinch);
            }
        }
        // Single hand pinch: Line creation mode
        else if (this.isCreating && singlePinch && singlePinch.isActive) {
            this.handleLineCreation(singlePinch);
        }
        // No pinch: Finalize creation
        else if (this.isCreating) {
            this.finalizeBlockCreation();
        }
    }

    /**
     * Start creating a new block
     * @param {Object} pinchData - Two-hand pinch data
     */
    startBlockCreation(pinchData) {
        this.isCreating = true;

        // Create preview block geometry
        const size = Math.max(this.minBlockSize, Math.min(pinchData.separation * 10, this.maxBlockSize));
        const geometry = new THREE.BoxGeometry(size, size, size);

        // Semi-transparent material for preview
        const material = new THREE.MeshStandardMaterial({
            color: this.defaultColor,
            transparent: true,
            opacity: 0.6,
            roughness: 0.5,
            metalness: 0.3
        });

        this.previewBlock = new THREE.Mesh(geometry, material);

        // Position at center point
        const position = this.snapToGrid
            ? this.snapPositionToGrid(pinchData.center)
            : pinchData.center;

        this.previewBlock.position.set(position.x, position.y, position.z);
        this.previewBlock.castShadow = true;
        this.previewBlock.receiveShadow = true;

        this.scene.add(this.previewBlock);

        console.log('📦 Block creation started');
    }

    /**
     * Update preview block during creation
     * @param {Object} pinchData - Two-hand pinch data
     */
    updatePreviewBlock(pinchData) {
        if (!this.previewBlock) return;

        // Update position
        const position = this.snapToGrid
            ? this.snapPositionToGrid(pinchData.center)
            : pinchData.center;

        this.previewBlock.position.set(position.x, position.y, position.z);

        // Update scale based on hand separation
        const size = Math.max(this.minBlockSize, Math.min(pinchData.separation * 10, this.maxBlockSize));
        this.previewBlock.scale.setScalar(size);
    }

    /**
     * Handle line creation mode (continuous blocks)
     * @param {Object} pinchData - Single hand pinch data
     */
    handleLineCreation(pinchData) {
        const worldPos = this.snapToGrid
            ? this.snapPositionToGrid(pinchData.position)
            : pinchData.position;

        // Check if moved enough to create new block
        const lastBlock = this.currentLine[this.currentLine.length - 1];

        if (!lastBlock || this.calculateDistance(worldPos, lastBlock.position) > 1.5) {
            const size = this.previewBlock ? this.previewBlock.scale.x : 1.0;
            const block = this.createBlock(worldPos, size);
            this.currentLine.push(block);
            this.scene.add(block);
        }
    }

    /**
     * Finalize block creation
     */
    finalizeBlockCreation() {
        if (this.previewBlock) {
            // Convert preview to solid block
            const finalBlock = this.createBlock(
                this.previewBlock.position,
                this.previewBlock.scale.x
            );

            this.scene.add(finalBlock);
            this.placedBlocks.push(finalBlock);

            // Remove preview
            this.scene.remove(this.previewBlock);
            this.previewBlock.geometry.dispose();
            this.previewBlock.material.dispose();
            this.previewBlock = null;
        }

        // Add line blocks to placed blocks
        if (this.currentLine.length > 0) {
            this.placedBlocks.push(...this.currentLine);
            console.log(`✅ Created ${this.currentLine.length} blocks in line`);
        }

        // Emit event for undo/redo system
        if (this.currentLine.length > 0) {
            this.eventBus.emit('blocks-created', { blocks: this.currentLine });
        }

        this.currentLine = [];
        this.isCreating = false;

        console.log(`📦 Total blocks: ${this.placedBlocks.length}`);
    }

    /**
     * Create a solid block
     * @param {Object} position - World position
     * @param {number} size - Block size
     * @returns {THREE.Mesh} Created block
     */
    createBlock(position, size = 1.0) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: this.defaultColor,
            roughness: 0.6,
            metalness: 0.4
        });

        const block = new THREE.Mesh(geometry, material);
        block.position.copy(position);
        block.castShadow = true;
        block.receiveShadow = true;

        // Mark as user-created block
        block.userData.isBlock = true;
        block.userData.createdAt = Date.now();

        return block;
    }

    /**
     * Snap position to grid
     * @param {Object} position - World position
     * @returns {Object} Snapped position
     */
    snapPositionToGrid(position) {
        return {
            x: Math.round(position.x / this.gridSize) * this.gridSize,
            y: Math.round(position.y / this.gridSize) * this.gridSize,
            z: Math.round(position.z / this.gridSize) * this.gridSize
        };
    }

    /**
     * Calculate distance between two positions
     * @param {Object} pos1 - Position 1
     * @param {Object} pos2 - Position 2
     * @returns {number} Distance
     */
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    /**
     * Delete a block
     * @param {THREE.Mesh} block - Block to delete
     */
    deleteBlock(block) {
        const index = this.placedBlocks.indexOf(block);
        if (index !== -1) {
            this.placedBlocks.splice(index, 1);
            this.scene.remove(block);
            block.geometry.dispose();
            block.material.dispose();

            this.eventBus.emit('block-deleted', { block });
        }
    }

    /**
     * Get all placed blocks
     * @returns {Array} Array of blocks
     */
    getBlocks() {
        return this.placedBlocks;
    }

    /**
     * Clear all blocks
     */
    clearAll() {
        for (const block of this.placedBlocks) {
            this.scene.remove(block);
            block.geometry.dispose();
            block.material.dispose();
        }

        this.placedBlocks = [];
        this.eventBus.emit('blocks-cleared');

        console.log('🗑️ All blocks cleared');
    }

    /**
     * Toggle grid snapping
     * @param {boolean} enabled - Enable/disable snapping
     */
    setGridSnapping(enabled) {
        this.snapToGrid = enabled;
        console.log(`Grid snapping: ${enabled ? 'ON' : 'OFF'}`);
    }
}
