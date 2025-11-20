/**
 * Finger Cursor System
 * 
 * Creates visual finger cursors in 3D space that:
 * - Always render on top of all scene objects
 * - Cannot go inside or behind voxels
 * - Show hand position and pointing direction
 * - Provide visual feedback for gestures
 * 
 * Features:
 * - Depth-independent rendering (always visible)
 * - Collision-aware positioning
 * - Gesture state visualization
 * - Smooth cursor movement
 */

import * as THREE from 'three';

export class FingerCursorSystem {
    constructor(scene, camera, coordinateMapper) {
        this.scene = scene;
        this.camera = camera;
        this.coordinateMapper = coordinateMapper;

        //Cursor configuration
        this.CURSOR_SIZE = 0.3;              // Size of cursor sphere
        this.CURSOR_COLOR = 0x00ff88;        // Green
        this.CURSOR_HOVER_COLOR = 0xffaa00;  // Orange when hovering
        this.CURSOR_PINCH_COLOR = 0xff0055;  // Red when pinching

        // Collision detection
        this.raycaster = new THREE.Raycaster();
        this.MIN_DISTANCE_FROM_SURFACE = 0.5; // Stay this far from objects

        // Cursor objects
        this.cursors = new Map(); // handId -> cursor mesh
        this.cursorGroup = new THREE.Group();
        this.cursorGroup.name = 'FingerCursors';
        this.scene.add(this.cursorGroup);

        console.log('✅ FingerCursorSystem initialized');
    }

    /**
     * Update finger cursors based on hand tracking
     * 
     * @param {Object} handsData - Hand tracking data {left, right}
     * @param {Object} gestureData - Current gesture states
     * @param {Array} sceneObjects - Objects to check collision against
     */
    update(handsData, gestureData = {}, sceneObjects = []) {
        // Update left hand cursor
        if (handsData.left) {
            this.updateCursor('left', handsData.left, gestureData.leftPinch, sceneObjects);
        } else {
            this.hideCursor('left');
        }

        // Update right hand cursor
        if (handsData.right) {
            this.updateCursor('right', handsData.right, gestureData.rightPinch, sceneObjects);
        } else {
            this.hideCursor('right');
        }
    }

    /**
     * Update a single cursor
     * 
     * @param {string} handId - 'left' or 'right'
     * @param {Array} landmarks - Hand landmarks
     * @param {Object} pinchState - Pinch gesture state
     * @param {Array} sceneObjects - Scene objects for collision
     */
    updateCursor(handId, landmarks, pinchState, sceneObjects) {
        // Get or create cursor
        let cursor = this.cursors.get(handId);
        if (!cursor) {
            cursor = this.createCursor(handId);
            this.cursors.set(handId, cursor);
        }

        // Get index finger tip position (landmark 8)
        const indexTip = landmarks[8];

        // Convert to world coordinates
        const worldPos = this.coordinateMapper.mediaPipeToWorld(indexTip);

        // Apply collision-aware positioning
        const finalPos = this.getCollisionAwarePosition(
            worldPos,
            landmarks,
            sceneObjects
        );

        // Update cursor position
        cursor.position.copy(finalPos);

        // Update cursor appearance based on state
        this.updateCursorAppearance(cursor, pinchState, sceneObjects, finalPos);

        // Make visible
        cursor.visible = true;
    }

    /**
     * Get position that doesn't clip behind objects
     * 
     * @param {THREE.Vector3} targetPos - Desired cursor position
     * @param {Array} landmarks - Hand landmarks
     * @param {Array} sceneObjects - Scene objects
     * @returns {THREE.Vector3} Adjusted position
     */
    getCollisionAwarePosition(targetPos, landmarks, sceneObjects) {
        // Raycast from camera to cursor position
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.camera.position)
            .normalize();

        this.raycaster.set(this.camera.position, direction);

        // Check intersections
        const intersects = this.raycaster.intersectObjects(sceneObjects, false);

        if (intersects.length > 0) {
            const firstHit = intersects[0];
            const hitDistance = firstHit.distance;
            const cursorDistance = this.camera.position.distanceTo(targetPos);

            // If cursor would be behind object, place it in front
            if (cursorDistance > hitDistance) {
                // Position cursor in front of object
                const safePos = this.camera.position.clone()
                    .add(direction.multiplyScalar(hitDistance - this.MIN_DISTANCE_FROM_SURFACE));

                return safePos;
            }
        }

        // No collision, use target position
        return targetPos;
    }

    /**
     * Update cursor visual appearance
     * 
     * @param {THREE.Mesh} cursor - Cursor mesh
     * @param {Object} pinchState - Pinch state
     * @param {Array} sceneObjects - Scene objects
     * @param {THREE.Vector3} position - Cursor position
     */
    updateCursorAppearance(cursor, pinchState, sceneObjects, position) {
        // Check if hovering over object
        const isHovering = this.isHoveringObject(position, sceneObjects);

        // Determine color based on state
        let color = this.CURSOR_COLOR; // Default green
        let scale = 1.0;

        if (pinchState && pinchState.isActive) {
            // Pinching - red
            color = this.CURSOR_PINCH_COLOR;
            scale = 0.8; // Slightly smaller when pinching
        } else if (isHovering) {
            // Hovering - orange
            color = this.CURSOR_HOVER_COLOR;
            scale = 1.2; // Slightly larger when hovering
        }

        // Update material
        cursor.material.color.setHex(color);
        cursor.material.emissive.setHex(color);
        cursor.material.emissiveIntensity = 0.5;

        // Update scale smoothly
        const targetScale = scale * this.CURSOR_SIZE;
        cursor.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.3);
    }

    /**
     * Check if cursor is hovering over an object
     * 
     * @param {THREE.Vector3} position - Cursor position
     * @param {Array} sceneObjects - Scene objects
     * @returns {boolean} True if hovering
     */
    isHoveringObject(position, sceneObjects) {
        // Check if cursor is very close to any object
        for (const obj of sceneObjects) {
            const distance = position.distanceTo(obj.position);
            if (distance < 2.0) { // Within 2 units
                return true;
            }
        }
        return false;
    }

    /**
     * Create a finger cursor mesh
     * 
     * @param {string} handId - Hand identifier
     * @returns {THREE.Mesh} Cursor mesh
     */
    createCursor(handId) {
        // Create glowing sphere cursor
        const geometry = new THREE.SphereGeometry(this.CURSOR_SIZE, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: this.CURSOR_COLOR,
            emissive: this.CURSOR_COLOR,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
            depthTest: false,  // Always render on top
            depthWrite: false
        });

        const cursor = new THREE.Mesh(geometry, material);
        cursor.userData.isFingerCursor = true;
        cursor.userData.handId = handId;
        cursor.renderOrder = 9999; // Render last (on top)
        cursor.visible = false;

        // Add glow ring
        const ringGeometry = new THREE.RingGeometry(this.CURSOR_SIZE * 0.8, this.CURSOR_SIZE * 1.2, 16);
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
     * Hide a cursor
     * 
     * @param {string} handId - Hand identifier
     */
    hideCursor(handId) {
        const cursor = this.cursors.get(handId);
        if (cursor) {
            cursor.visible = false;
        }
    }

    /**
     * Get cursor position
     * 
     * @param {string} handId - Hand identifier
     * @returns {THREE.Vector3|null} Cursor position or null
     */
    getCursorPosition(handId) {
        const cursor = this.cursors.get(handId);
        return cursor && cursor.visible ? cursor.position.clone() : null;
    }

    /**
     * Check if cursor is visible
     * 
     * @param {string} handId - Hand identifier
     * @returns {boolean} True if visible
     */
    isCursorVisible(handId) {
        const cursor = this.cursors.get(handId);
        return cursor ? cursor.visible : false;
    }

    /**
     * Set cursor color
     * 
     * @param {string} handId - Hand identifier
     * @param {number} color - Hex color
     */
    setCursorColor(handId, color) {
        const cursor = this.cursors.get(handId);
        if (cursor) {
            cursor.material.color.setHex(color);
            cursor.material.emissive.setHex(color);
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        for (const [handId, cursor] of this.cursors) {
            cursor.geometry.dispose();
            cursor.material.dispose();

            // Dispose ring
            if (cursor.children.length > 0) {
                const ring = cursor.children[0];
                ring.geometry.dispose();
                ring.material.dispose();
            }
        }

        this.cursors.clear();
        this.scene.remove(this.cursorGroup);

        console.log('✅ FingerCursorSystem disposed');
    }
}
