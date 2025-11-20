/**
 * Finger Cursor System - Screen-Space Edition
 * 
 * Creates visual finger cursors that move in screen space with depth control.
 * 
 * Key Features:
 * - Screen-space movement (moves in camera view direction)
 * - Depth based on hand distance from camera
 * - Ray-AABB collision detection
 * - Always stays in front of blocks
 * - Smooth interpolation
 * 
 * Mathematical Foundation:
 * - Screen coordinates → NDC → Ray casting
 * - Hand distance → Depth mapping
 * - Ray-Block intersection → Position clamping
 */

import * as THREE from 'three';

export class FingerCursorSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Cursor configuration
        this.CURSOR_SIZE = 0.3;
        this.CURSOR_COLOR = 0x00ff88;        // Green
        this.CURSOR_HOVER_COLOR = 0xffaa00;  // Orange
        this.CURSOR_PINCH_COLOR = 0xff0055;  // Red

        // Depth mapping configuration
        this.MIN_DEPTH = 2.0;                // Minimum distance from camera
        this.MAX_DEPTH = 20.0;               // Maximum distance from camera
        this.SURFACE_OFFSET = 0.2;           // Distance to stay in front of blocks

        // Raycasting
        this.raycaster = new THREE.Raycaster();

        // Smooth movement
        this.SMOOTHING_FACTOR = 0.2;         // 0.0 = no smoothing, 1.0 = instant

        // Cursor objects
        this.cursors = new Map(); // handId -> {mesh, targetPosition, currentPosition}
        this.cursorGroup = new THREE.Group();
        this.cursorGroup.name = 'FingerCursors';
        this.scene.add(this.cursorGroup);

        console.log('✅ FingerCursorSystem initialized (Screen-Space Mode)');
    }

    /**
     * Update finger cursors based on hand tracking
     * 
     * @param {Object} handsData - Hand tracking data
     * @param {Object} gestureData - Gesture states
     * @param {Array} sceneObjects - Selectable objects for collision
     */
    update(handsData, gestureData = {}, sceneObjects = []) {
        // Update each hand
        if (handsData.left) {
            this.updateCursor('left', handsData.left, gestureData.leftPinch, sceneObjects);
        } else {
            this.hideCursor('left');
        }

        if (handsData.right) {
            this.updateCursor('right', handsData.right, gestureData.rightPinch, sceneObjects);
        } else {
            this.hideCursor('right');
        }
    }

    /**
     * Update a single cursor using screen-space ray casting
     * 
     * @param {string} handId - Hand identifier
     * @param {Array} landmarks - MediaPipe hand landmarks
     * @param {Object} pinchState - Pinch gesture state
     * @param {Array} sceneObjects - Scene objects for collision
     */
    updateCursor(handId, landmarks, pinchState, sceneObjects) {
        // Get or create cursor data
        let cursorData = this.cursors.get(handId);
        if (!cursorData) {
            cursorData = this.createCursorData(handId);
            this.cursors.set(handId, cursorData);
        }

        // Get index finger tip (landmark 8) and wrist (landmark 0)
        const indexTip = landmarks[8];
        const wrist = landmarks[0];

        // Step 1: Convert hand position to normalized screen coordinates
        const screenCoords = this.landmarkToScreenSpace(indexTip);

        // Step 2: Calculate hand distance from camera (Z depth in MediaPipe space)
        const handDistance = this.calculateHandDistance(indexTip, wrist);

        // Step 3: Create ray from camera through screen point
        const ray = this.createCameraRay(screenCoords);

        // Step 4: Map hand distance to cursor depth
        const desiredDepth = this.mapHandDistanceToDepth(handDistance);

        // Step 5: Perform collision detection and get final depth
        const finalDepth = this.getCollisionAwareDepth(ray, desiredDepth, sceneObjects);

        // Step 6: Calculate target cursor position
        const targetPosition = ray.origin.clone().add(
            ray.direction.clone().multiplyScalar(finalDepth)
        );

        // Step 7: Smooth interpolation
        if (!cursorData.currentPosition) {
            cursorData.currentPosition = targetPosition.clone();
        } else {
            cursorData.currentPosition.lerp(targetPosition, this.SMOOTHING_FACTOR);
        }

        // Update mesh position
        cursorData.mesh.position.copy(cursorData.currentPosition);
        cursorData.mesh.visible = true;

        // Update visual appearance
        this.updateCursorAppearance(
            cursorData.mesh,
            pinchState,
            this.isNearBlock(cursorData.currentPosition, sceneObjects)
        );
    }

    /**
     * Convert MediaPipe landmark to normalized screen coordinates
     * 
     * @param {Object} landmark - MediaPipe landmark {x, y, z}
     * @returns {THREE.Vector2} NDC coordinates (-1 to 1)
     */
    landmarkToScreenSpace(landmark) {
        // MediaPipe gives us normalized coordinates (0-1)
        // Convert to NDC (-1 to 1)
        const ndcX = landmark.x * 2 - 1;
        const ndcY = -(landmark.y * 2 - 1); // Flip Y axis

        return new THREE.Vector2(ndcX, ndcY);
    }

    /**
     * Calculate hand distance from camera using Z-depth
     * 
     * @param {Object} indexTip - Index finger tip landmark
     * @param {Object} wrist - Wrist landmark
     * @returns {number} Normalized distance (0-1)
     */
    calculateHandDistance(indexTip, wrist) {
        // Use average Z of index tip and wrist for stability
        const avgZ = (indexTip.z + wrist.z) / 2;

        // MediaPipe Z is negative when hand is closer to camera
        // Normalize to 0-1 range (0 = close, 1 = far)
        // Typical range: -0.3 (very close) to 0.0 (far)
        const normalized = Math.max(0, Math.min(1, (avgZ + 0.3) / 0.3));

        return 1.0 - normalized; // Invert so 0 = far, 1 = close
    }

    /**
     * Create ray from camera through screen coordinates
     * 
     * @param {THREE.Vector2} screenCoords - NDC coordinates
     * @returns {THREE.Ray} Ray from camera
     */
    createCameraRay(screenCoords) {
        // Use Three.js raycaster to create ray from screen coords
        this.raycaster.setFromCamera(screenCoords, this.camera);

        return this.raycaster.ray.clone();
    }

    /**
     * Map hand distance to cursor depth along ray
     * 
     * @param {number} handDistance - Normalized hand distance (0-1)
     * @returns {number} Depth in world units
     */
    mapHandDistanceToDepth(handDistance) {
        // Linear interpolation between min and max depth
        // handDistance: 0 (far) → MAX_DEPTH
        // handDistance: 1 (close) → MIN_DEPTH
        return THREE.MathUtils.lerp(this.MAX_DEPTH, this.MIN_DEPTH, handDistance);
    }

    /**
     * Get collision-aware depth using ray-AABB intersection
     * 
     * @param {THREE.Ray} ray - Camera ray
     * @param {number} desiredDepth - Desired cursor depth
     * @param {Array} sceneObjects - Objects to check collision against
     * @returns {number} Final depth (clamped if collision)
     */
    getCollisionAwareDepth(ray, desiredDepth, sceneObjects) {
        let nearestHitDistance = Infinity;

        // Test ray against all blocks
        for (const obj of sceneObjects) {
            // Skip if not a voxel/block
            if (!obj.userData.isVoxel && !obj.userData.isBlock) continue;

            // Get bounding box
            const box = this.getObjectBoundingBox(obj);

            // Ray-AABB intersection test
            const intersection = this.rayIntersectBox(ray, box);

            if (intersection && intersection.distance < nearestHitDistance) {
                nearestHitDistance = intersection.distance;
            }
        }

        // If collision detected, clamp depth to stay in front
        if (nearestHitDistance < Infinity) {
            const maxAllowedDepth = nearestHitDistance - this.SURFACE_OFFSET;
            return Math.min(desiredDepth, maxAllowedDepth);
        }

        // No collision, use desired depth
        return desiredDepth;
    }

    /**
     * Get bounding box for an object
     * 
     * @param {THREE.Object3D} object - Scene object
     * @returns {THREE.Box3} Bounding box
     */
    getObjectBoundingBox(object) {
        // For voxels, create box from position (assuming 3x3x3 size)
        const halfSize = 1.5; // Half of 3.0 voxel size
        const pos = object.position;

        return new THREE.Box3(
            new THREE.Vector3(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize),
            new THREE.Vector3(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize)
        );
    }

    /**
     * Ray-AABB intersection test (Slab Method)
     * 
     * @param {THREE.Ray} ray - Ray to test
     * @param {THREE.Box3} box - Bounding box
     * @returns {Object|null} {distance, point} or null
     */
    rayIntersectBox(ray, box) {
        const origin = ray.origin;
        const direction = ray.direction;
        const min = box.min;
        const max = box.max;

        let tMin = -Infinity;
        let tMax = Infinity;

        // Test each axis (X, Y, Z)
        for (let i = 0; i < 3; i++) {
            const axis = ['x', 'y', 'z'][i];
            const originVal = origin[axis];
            const dirVal = direction[axis];
            const minVal = min[axis];
            const maxVal = max[axis];

            if (Math.abs(dirVal) < 0.0001) {
                // Ray parallel to slab - no hit if outside
                if (originVal < minVal || originVal > maxVal) {
                    return null;
                }
            } else {
                // Calculate intersection distances
                let t1 = (minVal - originVal) / dirVal;
                let t2 = (maxVal - originVal) / dirVal;

                // Ensure t1 < t2
                if (t1 > t2) {
                    [t1, t2] = [t2, t1];
                }

                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);

                // No intersection
                if (tMin > tMax) {
                    return null;
                }
            }
        }

        // Intersection exists if tMax >= 0
        if (tMax < 0) {
            return null;
        }

        // Return nearest intersection
        const distance = tMin >= 0 ? tMin : tMax;
        const point = origin.clone().add(direction.clone().multiplyScalar(distance));

        return { distance, point };
    }

    /**
     * Check if cursor is near any block
     * 
     * @param {THREE.Vector3} position - Cursor position
     * @param {Array} sceneObjects - Scene objects
     * @returns {boolean} True if near a block
     */
    isNearBlock(position, sceneObjects) {
        const nearThreshold = 2.5;

        for (const obj of sceneObjects) {
            if (!obj.userData.isVoxel && !obj.userData.isBlock) continue;

            const distance = position.distanceTo(obj.position);
            if (distance < nearThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Update cursor appearance based on state
     * 
     * @param {THREE.Mesh} cursor - Cursor mesh
     * @param {Object} pinchState - Pinch state
     * @param {boolean} nearBlock - Is near a block
     */
    updateCursorAppearance(cursor, pinchState, nearBlock) {
        let color = this.CURSOR_COLOR;
        let scale = 1.0;

        if (pinchState && pinchState.isActive) {
            color = this.CURSOR_PINCH_COLOR;
            scale = 0.8;
        } else if (nearBlock) {
            color = this.CURSOR_HOVER_COLOR;
            scale = 1.2;
        }

        cursor.material.color.setHex(color);
        cursor.material.emissive.setHex(color);

        const targetScale = scale * this.CURSOR_SIZE;
        cursor.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            0.3
        );
    }

    /**
     * Create cursor data structure
     * 
     * @param {string} handId - Hand identifier
     * @returns {Object} Cursor data
     */
    createCursorData(handId) {
        const mesh = this.createCursorMesh(handId);

        return {
            mesh,
            targetPosition: null,
            currentPosition: null
        };
    }

    /**
     * Create cursor mesh
     * 
     * @param {string} handId - Hand identifier
     * @returns {THREE.Mesh} Cursor mesh
     */
    createCursorMesh(handId) {
        const geometry = new THREE.SphereGeometry(this.CURSOR_SIZE, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: this.CURSOR_COLOR,
            emissive: this.CURSOR_COLOR,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false
        });

        const cursor = new THREE.Mesh(geometry, material);
        cursor.userData.isFingerCursor = true;
        cursor.userData.handId = handId;
        cursor.renderOrder = 9999;
        cursor.visible = false;

        // Add glow ring
        const ringGeometry = new THREE.RingGeometry(
            this.CURSOR_SIZE * 0.8,
            this.CURSOR_SIZE * 1.2,
            16
        );
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.CURSOR_COLOR,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        cursor.add(ring);

        this.cursorGroup.add(cursor);

        return cursor;
    }

    /**
     * Hide cursor
     * 
     * @param {string} handId - Hand identifier
     */
    hideCursor(handId) {
        const cursorData = this.cursors.get(handId);
        if (cursorData) {
            cursorData.mesh.visible = false;
        }
    }

    /**
     * Get cursor position
     * 
     * @param {string} handId - Hand identifier
     * @returns {THREE.Vector3|null} Position or null
     */
    getCursorPosition(handId) {
        const cursorData = this.cursors.get(handId);
        if (cursorData && cursorData.mesh.visible && cursorData.currentPosition) {
            return cursorData.currentPosition.clone();
        }
        return null;
    }

    /**
     * Check if cursor is visible
     * 
     * @param {string} handId - Hand identifier
     * @returns {boolean}
     */
    isCursorVisible(handId) {
        const cursorData = this.cursors.get(handId);
        return cursorData ? cursorData.mesh.visible : false;
    }

    /**
     * Dispose resources
     */
    dispose() {
        for (const [handId, cursorData] of this.cursors) {
            cursorData.mesh.geometry.dispose();
            cursorData.mesh.material.dispose();

            if (cursorData.mesh.children.length > 0) {
                const ring = cursorData.mesh.children[0];
                ring.geometry.dispose();
                ring.material.dispose();
            }
        }

        this.cursors.clear();
        this.scene.remove(this.cursorGroup);

        console.log('✅ FingerCursorSystem disposed');
    }
}
