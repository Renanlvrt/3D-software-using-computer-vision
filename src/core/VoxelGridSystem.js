/**
 * Voxel Grid System - Integer Grid Coordinate Management
 * 
 * Critical Design Principle: ALL grid positions MUST be integers.
 * This ensures perfect alignment, no floating-point errors, and reliable collision detection.
 * 
 * Grid coordinates: {x: 5, y: 2, z: -3} (integers only)
 * World coordinates: {x: 5.0, y: 2.0, z: -3.0} (floats, but always grid-aligned)
 * 
 * Research Foundation:
 * - Berkeley Snap-Dragging (1988): Gravity-based grid alignment
 * - Stanford Grid Optimization (2016): Optimal snapping algorithms
 */

import * as THREE from 'three';

export class VoxelGridSystem {
    constructor(voxelSize = 3.0) {
        // Grid configuration
        this.voxelSize = voxelSize;  // Size of one grid cell (3.0 for better control)
        this.gridOrigin = { x: 0, y: 0, z: 0 };  // World-space grid origin
        this.showGrid = true;  // Whether to display visual grid

        // Performance tracking
        this.stats = {
            snapOperations: 0,
            conversions: 0
        };

        console.log('✅ VoxelGridSystem initialized (voxelSize:', this.voxelSize, ')');
    }

    /**
     * Snap a world-space position to the nearest grid point
     * 
     * This is the MOST CRITICAL function in the voxel system.
     * It ensures all voxels align perfectly to the integer grid.
     * 
     * @param {Object} worldPos - World position {x, y, z} (floats)
     * @returns {Object} Snapped world position {x, y, z} (floats, grid-aligned)
     * 
     * Example:
     *   Input:  {x: 2.7, y: -3.2, z: 0.6}
     *   Output: {x: 3.0, y: -3.0, z: 1.0}
     */
    snapToGrid(worldPos) {
        this.stats.snapOperations++;

        return {
            x: Math.round(worldPos.x / this.voxelSize) * this.voxelSize,
            y: Math.round(worldPos.y / this.voxelSize) * this.voxelSize,
            z: Math.round(worldPos.z / this.voxelSize) * this.voxelSize
        };
    }

    /**
     * Convert world-space coordinates to integer grid coordinates
     * 
     * Grid coordinates are ALWAYS integers. No exceptions.
     * 
     * @param {Object} worldPos - World position {x, y, z}
     * @returns {Object} Grid position {x, y, z} (integers)
     * 
     * Example:
     *   Input:  {x: 5.0, y: -2.0, z: 3.0}
     *   Output: {x: 5, y: -2, z: 3}
     */
    worldToGrid(worldPos) {
        this.stats.conversions++;

        const gridPos = {
            x: Math.round(worldPos.x / this.voxelSize),
            y: Math.round(worldPos.y / this.voxelSize),
            z: Math.round(worldPos.z / this.voxelSize)
        };

        // CRITICAL: Verify integers (safety check)
        if (!Number.isInteger(gridPos.x) || !Number.isInteger(gridPos.y) || !Number.isInteger(gridPos.z)) {
            console.error('❌ worldToGrid produced non-integer:', gridPos, 'from', worldPos);
        }

        return gridPos;
    }

    /**
     * Convert integer grid coordinates to world-space coordinates
     * 
     * @param {Object} gridPos - Grid position {x, y, z} (integers)
     * @returns {Object} World position {x, y, z} (floats, grid-aligned)
     * 
     * Example:
     *   Input:  {x: 5, y: -2, z: 3}
     *   Output: {x: 5.0, y: -2.0, z: 3.0}
     */
    gridToWorld(gridPos) {
        // CRITICAL: Verify inputs are integers
        if (!Number.isInteger(gridPos.x) || !Number.isInteger(gridPos.y) || !Number.isInteger(gridPos.z)) {
            console.error('❌ gridToWorld received non-integer grid position:', gridPos);
        }

        return {
            x: gridPos.x * this.voxelSize,
            y: gridPos.y * this.voxelSize,
            z: gridPos.z * this.voxelSize
        };
    }

    /**
     * Generate spatial hash key for grid position
     * 
     * Used by CollisionDetectionSystem for O(1) lookup.
     * Format: "x,y,z" (e.g., "5,2,-3")
     * 
     * @param {Object} gridPos - Grid position {x, y, z} (integers)
     * @returns {string} Spatial hash key
     */
    getGridKey(gridPos) {
        return `${gridPos.x},${gridPos.y},${gridPos.z}`;
    }

    /**
     * Parse spatial hash key back to grid position
     * 
     * @param {string} key - Spatial hash key (e.g., "5,2,-3")
     * @returns {Object} Grid position {x, y, z}
     */
    parseGridKey(key) {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
    }

    /**
     * Check if a world position is exactly on the grid
     * 
     * Useful for validation and debugging.
     * 
     * @param {Object} position - World position {x, y, z}
     * @param {number} tolerance - Floating-point tolerance (default: 0.001)
     * @returns {boolean} True if position is grid-aligned
     */
    isOnGrid(position, tolerance = 0.001) {
        const snapped = this.snapToGrid(position);

        return Math.abs(position.x - snapped.x) < tolerance &&
            Math.abs(position.y - snapped.y) < tolerance &&
            Math.abs(position.z - snapped.z) < tolerance;
    }

    /**
     * Create visual grid helper for the scene
     * 
     * Displays a horizontal grid at Y=0 to help users visualize the grid.
     * 
     * @param {number} size - Grid size in world units (default: 40)
     * @param {number} divisions - Number of grid divisions (default: 40)
     * @returns {THREE.GridHelper} Grid helper mesh
     */
    createGridHelper(size = 40, divisions = 40) {
        const gridHelper = new THREE.GridHelper(
            size,
            divisions,
            0x00ff88,  // Primary color (green)
            0x333333   // Secondary color (dark gray)
        );

        // Position slightly below Y=0 to avoid z-fighting
        gridHelper.position.y = -0.01;

        gridHelper.userData.isGridHelper = true;

        return gridHelper;
    }

    /**
     * Get grid bounds for a set of grid positions
     * 
     * Useful for calculating bounding boxes, spatial queries, etc.
     * 
     * @param {Array} gridPositions - Array of grid positions [{x,y,z}, ...]
     * @returns {Object} Bounds {min: {x,y,z}, max: {x,y,z}}
     */
    calculateBounds(gridPositions) {
        if (gridPositions.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 }
            };
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const pos of gridPositions) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            minZ = Math.min(minZ, pos.z);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
            maxZ = Math.max(maxZ, pos.z);
        }

        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }

    /**
     * Calculate Manhattan distance between two grid positions
     * 
     * Manhattan distance = |x1-x2| + |y1-y2| + |z1-z2|
     * Useful for pathfinding, neighbor detection, etc.
     * 
     * @param {Object} gridPos1 - First grid position {x,y,z}
     * @param {Object} gridPos2 - Second grid position {x,y,z}
     * @returns {number} Manhattan distance (integer)
     */
    manhattanDistance(gridPos1, gridPos2) {
        return Math.abs(gridPos1.x - gridPos2.x) +
            Math.abs(gridPos1.y - gridPos2.y) +
            Math.abs(gridPos1.z - gridPos2.z);
    }

    /**
     * Get grid positions along a line between two points
     * 
     * Uses 3D Bresenham's line algorithm for voxel traversal.
     * Useful for line creation, raycasting, etc.
     * 
     * @param {Object} start - Start grid position {x,y,z}
     * @param {Object} end - End grid position {x,y,z}
     * @returns {Array} Array of grid positions along the line
     */
    getLinePositions(start, end) {
        const positions = [];

        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        const dz = Math.abs(end.z - start.z);

        const sx = start.x < end.x ? 1 : -1;
        const sy = start.y < end.y ? 1 : -1;
        const sz = start.z < end.z ? 1 : -1;

        let x = start.x;
        let y = start.y;
        let z = start.z;

        // Determine dominant axis
        if (dx >= dy && dx >= dz) {
            // X is dominant
            let err1 = 2 * dy - dx;
            let err2 = 2 * dz - dx;

            while (x !== end.x) {
                positions.push({ x, y, z });

                if (err1 > 0) {
                    y += sy;
                    err1 -= 2 * dx;
                }
                if (err2 > 0) {
                    z += sz;
                    err2 -= 2 * dx;
                }

                err1 += 2 * dy;
                err2 += 2 * dz;
                x += sx;
            }
        } else if (dy >= dx && dy >= dz) {
            // Y is dominant
            let err1 = 2 * dx - dy;
            let err2 = 2 * dz - dy;

            while (y !== end.y) {
                positions.push({ x, y, z });

                if (err1 > 0) {
                    x += sx;
                    err1 -= 2 * dy;
                }
                if (err2 > 0) {
                    z += sz;
                    err2 -= 2 * dy;
                }

                err1 += 2 * dx;
                err2 += 2 * dz;
                y += sy;
            }
        } else {
            // Z is dominant
            let err1 = 2 * dy - dz;
            let err2 = 2 * dx - dz;

            while (z !== end.z) {
                positions.push({ x, y, z });

                if (err1 > 0) {
                    y += sy;
                    err1 -= 2 * dz;
                }
                if (err2 > 0) {
                    x += sx;
                    err2 -= 2 * dz;
                }

                err1 += 2 * dy;
                err2 += 2 * dx;
                z += sz;
            }
        }

        // Add final position
        positions.push({ x: end.x, y: end.y, z: end.z });

        return positions;
    }

    /**
     * Get statistics about grid system usage
     * 
     * @returns {Object} Usage statistics
     */
    getStats() {
        return {
            voxelSize: this.voxelSize,
            snapOperations: this.stats.snapOperations,
            conversions: this.stats.conversions
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats.snapOperations = 0;
        this.stats.conversions = 0;
    }
}
