/**
 * Rotate Command
 * 
 * Command for rotating objects around an axis.
 * Stores original and new rotations for undo/redo.
 */

import { Command } from './Command.js';
import * as THREE from 'three';

export class RotateCommand extends Command {
    constructor(objects, axis, angle, gridSystem, collisionSystem) {
        super(`Rotate ${objects.length} object(s) by ${Math.round(angle * 180 / Math.PI)}°`);

        this.objects = Array.from(objects);
        this.axis = axis; // 'x', 'y', or 'z'
        this.angle = angle; // Radians
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;

        // Store original rotations and positions
        this.originalRotations = this.objects.map(obj => obj.rotation.clone());
        this.originalPositions = this.objects.map(obj => obj.position.clone());
        this.originalGridPositions = this.objects.map(obj => ({ ...obj.userData.gridPosition }));
    }

    execute() {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];

            // Update rotation
            if (this.axis === 'x') {
                object.rotation.x += this.angle;
            } else if (this.axis === 'y') {
                object.rotation.y += this.angle;
            } else if (this.axis === 'z') {
                object.rotation.z += this.angle;
            }

            // Snap position to grid after rotation
            const snappedPos = this.gridSystem.snapToGrid(object.position);
            const newGridPos = this.gridSystem.worldToGrid(snappedPos);

            // Update collision system
            if (this.collisionSystem) {
                const oldGridPos = this.originalGridPositions[i];
                this.collisionSystem.unregisterVoxel(oldGridPos);
                this.collisionSystem.registerVoxel(object, newGridPos);
            }

            object.position.set(snappedPos.x, snappedPos.y, snappedPos.z);
            object.userData.gridPosition = newGridPos;
        }
    }

    undo() {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            const originalRotation = this.originalRotations[i];
            const originalPosition = this.originalPositions[i];
            const originalGridPos = this.originalGridPositions[i];

            // Restore rotation
            object.rotation.copy(originalRotation);

            // Restore position
            object.position.copy(originalPosition);
            object.userData.gridPosition = originalGridPos;

            // Update collision system
            if (this.collisionSystem) {
                this.collisionSystem.unregisterVoxel(this.gridSystem.worldToGrid(object.position));
                this.collisionSystem.registerVoxel(object, originalGridPos);
            }
        }
    }
}
