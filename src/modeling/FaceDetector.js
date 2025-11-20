/**
 * Face Detector
 * 
 * Detects which face of a voxel the user is pointing at.
 * Uses raycasting to determine intersection point and face normal.
 * 
 * Features:
 * - Raycast from hand/pointer to scene
 * - Determine exact face (top, bottom, left, right, front, back)
 * - Calculate face normal for extrusion direction
 * - Visual highlighting of selected face
 * - Support for multi-voxel face selection
 */

import * as THREE from 'three';

export class FaceDetector {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Raycaster
        this.raycaster = new THREE.Raycaster();

        // Face highlight
        this.faceHighlight = null;
        this.highlightedFace = null;

        // Configuration
        this.HIGHLIGHT_COLOR = 0x00ff88;
        this.HIGHLIGHT_OPACITY = 0.6;
        this.HIGHLIGHT_OFFSET = 0.05; // Slight offset to avoid z-fighting

        console.log('✅ FaceDetector initialized');
    }

    /**
     * Detect face from hand/pointer position
     * 
     * @param {Object} position - Normalized screen position {x, y} or world position
     * @param {Array} selectableObjects - Objects to detect faces on
     * @returns {Object|null} Face detection result
     */
    detect(position, selectableObjects) {
        // Convert position to NDC for raycasting
        const ndc = this.positionToNDC(position);

        // Perform raycast
        this.raycaster.setFromCamera(ndc, this.camera);
        const intersects = this.raycaster.intersectObjects(selectableObjects, false);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            return this.analyzeFace(intersect);
        }

        // No face detected
        this.clearHighlight();
        return null;
    }

    /**
     * Analyze intersected face to determine direction
     * 
     * @param {Object} intersect - Raycast intersection result
     * @returns {Object} Face data
     */
    analyzeFace(intersect) {
        const point = intersect.point;
        const object = intersect.object;
        const face = intersect.face;

        if (!face || !object.userData.gridPosition) {
            return null;
        }

        // Get world-space face normal
        const faceNormal = face.normal.clone();
        faceNormal.transformDirection(object.matrixWorld);
        faceNormal.normalize();

        // Determine cardinal direction (snap to axis-aligned)
        const direction = this.snapToCardinalDirection(faceNormal);

        // Determine face name
        const faceName = this.directionToFaceName(direction);

        // Get grid position
        const gridPosition = object.userData.gridPosition;

        // Calculate face center in world space
        const faceCenter = this.calculateFaceCenter(object, direction);

        const faceData = {
            object,
            gridPosition,
            direction,
            faceName,
            normal: faceNormal,
            faceCenter,
            intersectionPoint: point
        };

        // Update visual highlight
        this.highlightFace(faceData);

        return faceData;
    }

    /**
     * Snap a normal vector to the nearest cardinal direction
     * 
     * @param {THREE.Vector3} normal - Face normal
     * @returns {Object} Cardinal direction {x, y, z}
     */
    snapToCardinalDirection(normal) {
        const absX = Math.abs(normal.x);
        const absY = Math.abs(normal.y);
        const absZ = Math.abs(normal.z);

        const max = Math.max(absX, absY, absZ);

        if (max === absX) {
            return { x: Math.sign(normal.x), y: 0, z: 0 };
        } else if (max === absY) {
            return { x: 0, y: Math.sign(normal.y), z: 0 };
        } else {
            return { x: 0, y: 0, z: Math.sign(normal.z) };
        }
    }

    /**
     * Convert direction to face name
     * 
     * @param {Object} direction - Cardinal direction {x, y, z}
     * @returns {string} Face name
     */
    directionToFaceName(direction) {
        if (direction.x > 0) return 'right';
        if (direction.x < 0) return 'left';
        if (direction.y > 0) return 'top';
        if (direction.y < 0) return 'bottom';
        if (direction.z > 0) return 'front';
        if (direction.z < 0) return 'back';
        return 'unknown';
    }

    /**
     * Calculate face center position
     * 
     * @param {THREE.Object3D} object - Voxel object
     * @param {Object} direction - Face direction
     * @returns {THREE.Vector3} Face center
     */
    calculateFaceCenter(object, direction) {
        const center = object.position.clone();
        const halfSize = 1.5; // Half of 3.0 voxel size

        center.x += direction.x * halfSize;
        center.y += direction.y * halfSize;
        center.z += direction.z * halfSize;

        return center;
    }

    /**
     * Highlight detected face
     * 
     * @param {Object} faceData - Face detection data
     */
    highlightFace(faceData) {
        // Remove old highlight
        this.clearHighlight();

        // Create highlight plane
        const geometry = new THREE.PlaneGeometry(2.8, 2.8);
        const material = new THREE.MeshBasicMaterial({
            color: this.HIGHLIGHT_COLOR,
            transparent: true,
            opacity: this.HIGHLIGHT_OPACITY,
            side: THREE.DoubleSide,
            depthTest: false
        });

        this.faceHighlight = new THREE.Mesh(geometry, material);

        // Position on face
        const offset = this.HIGHLIGHT_OFFSET;
        const faceCenter = faceData.faceCenter.clone();
        faceCenter.x += faceData.direction.x * offset;
        faceCenter.y += faceData.direction.y * offset;
        faceCenter.z += faceData.direction.z * offset;

        this.faceHighlight.position.copy(faceCenter);

        // Orient to face normal
        this.faceHighlight.lookAt(
            faceCenter.x + faceData.normal.x,
            faceCenter.y + faceData.normal.y,
            faceCenter.z + faceData.normal.z
        );

        // Render order (on top)
        this.faceHighlight.renderOrder = 1000;

        this.scene.add(this.faceHighlight);
        this.highlightedFace = faceData;
    }

    /**
     * Clear face highlight
     */
    clearHighlight() {
        if (this.faceHighlight) {
            this.scene.remove(this.faceHighlight);
            this.faceHighlight.geometry.dispose();
            this.faceHighlight.material.dispose();
            this.faceHighlight = null;
        }

        this.highlightedFace = null;
    }

    /**
     * Get currently highlighted face
     * 
     * @returns {Object|null} Face data or null
     */
    getHighlightedFace() {
        return this.highlightedFace;
    }

    /**
     * ConvertPosition to normalized device coordinates
     * 
     * @param {Object} position - Position {x, y}
     * @returns {THREE.Vector2} NDC coordinates
     */
    positionToNDC(position) {
        // If already in 0-1 range (normalized)
        if (position.x >= 0 && position.x <= 1 && position.y >= 0 && position.y <= 1) {
            return new THREE.Vector2(
                position.x * 2 - 1,
                -(position.y * 2 - 1)
            );
        }

        // Otherwise assume already in NDC
        return new THREE.Vector2(position.x, position.y);
    }

    /**
     * Detect faces on multiple voxels (for multi-face extrusion)
     * 
     * @param {Array} objects - Voxels to check
     * @param {Object} direction - Common direction to look for
     * @returns {Array} Face data for each voxel
     */
    detectMultipleFaces(objects, direction) {
        const faces = [];

        for (const object of objects) {
            if (!object.userData.gridPosition) continue;

            const gridPosition = object.userData.gridPosition;
            const faceCenter = this.calculateFaceCenter(object, direction);

            faces.push({
                object,
                gridPosition,
                direction,
                faceName: this.directionToFaceName(direction),
                faceCenter
            });
        }

        return faces;
    }

    /**
     * Check if a face is external (not touching another voxel)
     * 
     * @param {Object} faceData - Face data
     * @param {Object} collisionSystem -Collision detection system
     * @returns {boolean} True if external face
     */
    isExternalFace(faceData, collisionSystem) {
        const adjacentPos = {
            x: faceData.gridPosition.x + faceData.direction.x,
            y: faceData.gridPosition.y + faceData.direction.y,
            z: faceData.gridPosition.z + faceData.direction.z
        };

        return !collisionSystem.isOccupied(adjacentPos);
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.clearHighlight();
        console.log('✅ FaceDetector disposed');
    }
}
