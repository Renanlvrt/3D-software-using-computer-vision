/**
 * Selection System
 * Handles object selection via raycasting and visual feedback
 */

import * as THREE from 'three';

export class SelectionSystem {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;

        // Selection state
        this.selectedObjects = new Set();
        this.hoveredObject = null;

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 0.1;

        // Selection visualization
        this.selectionOutlines = new Map();
    }

    /**
     * Update selection based on hand gestures
     * @param {Object} gestureData - Processed gesture data
     */
    update(gestureData) {
        const { singlePinch } = gestureData;

        if (singlePinch && singlePinch.isActive && singlePinch.justPressed) {
            this.performRaycast(singlePinch.position);
        }
    }

    /**
     * Perform raycast from hand position
     * @param {Object} handPosition - Normalized hand position
     */
    performRaycast(handPosition) {
        // Convert normalized coords to NDC (Normalized Device Coordinates)
        const ndc = new THREE.Vector2(
            handPosition.x * 2 - 1,
            -(handPosition.y * 2 - 1)
        );

        this.raycaster.setFromCamera(ndc, this.camera);

        // Get all selectable objects (blocks)
        const selectableObjects = this.scene.children.filter(
            obj => obj.userData.isBlock
        );

        const intersects = this.raycaster.intersectObjects(selectableObjects, false);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            this.toggleSelection(object);
        } else {
            // Clicked empty space - clear selection
            this.clearSelection();
        }
    }

    /**
     * Toggle object selection
     * @param {THREE.Object3D} object - Object to toggle
     */
    toggleSelection(object) {
        if (this.selectedObjects.has(object)) {
            this.deselectObject(object);
        } else {
            // Clear previous selection (single selection mode)
            this.clearSelection();
            this.selectObject(object);
        }
    }

    /**
     * Select an object
     * @param {THREE.Object3D} object - Object to select
     */
    selectObject(object) {
        if (this.selectedObjects.has(object)) return;

        this.selectedObjects.add(object);
        this.createSelectionOutline(object);

        this.eventBus.emit('object-selected', { object });

        console.log('✓ Object selected');
    }

    /**
     * Deselect an object
     * @param {THREE.Object3D} object - Object to deselect
     */
    deselectObject(object) {
        if (!this.selectedObjects.has(object)) return;

        this.selectedObjects.delete(object);
        this.removeSelectionOutline(object);

        this.eventBus.emit('object-deselected', { object });

        console.log('✗ Object deselected');
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        for (const object of this.selectedObjects) {
            this.removeSelectionOutline(object);
        }

        this.selectedObjects.clear();
        this.eventBus.emit('selection-cleared');
    }

    /**
     * Create selection outline for an object
     * @param {THREE.Object3D} object - Object to outline
     */
    createSelectionOutline(object) {
        // Create outline mesh
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.BackSide
        });

        const outlineMesh = new THREE.Mesh(
            object.geometry.clone(),
            outlineMaterial
        );

        outlineMesh.scale.multiplyScalar(1.05);
        outlineMesh.renderOrder = 0;

        object.add(outlineMesh);
        this.selectionOutlines.set(object, outlineMesh);
    }

    /**
     * Remove selection outline
     * @param {THREE.Object3D} object - Object to remove outline from
     */
    removeSelectionOutline(object) {
        const outline = this.selectionOutlines.get(object);

        if (outline) {
            object.remove(outline);
            outline.geometry.dispose();
            outline.material.dispose();
            this.selectionOutlines.delete(object);
        }
    }

    /**
     * Get selected objects
     * @returns {Set} Set of selected objects
     */
    getSelectedObjects() {
        return this.selectedObjects;
    }

    /**
     * Check if object is selected
     * @param {THREE.Object3D} object - Object to check
     * @returns {boolean} True if selected
     */
    isSelected(object) {
        return this.selectedObjects.has(object);
    }

    /**
     * Select multiple objects
     * @param {Array} objects - Objects to select
     */
    selectMultiple(objects) {
        this.clearSelection();

        for (const object of objects) {
            this.selectObject(object);
        }
    }

    /**
     * Delete selected objects
     */
    deleteSelected() {
        const objectsToDelete = Array.from(this.selectedObjects);

        for (const object of objectsToDelete) {
            this.scene.remove(object);
            this.removeSelectionOutline(object);

            // Dispose geometry and material
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        }

        this.selectedObjects.clear();

        this.eventBus.emit('objects-deleted', { objects: objectsToDelete });

        console.log(`🗑️ Deleted ${objectsToDelete.length} objects`);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clearSelection();
        console.log('✅ SelectionSystem disposed');
    }
}
