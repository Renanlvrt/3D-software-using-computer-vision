/**
 * Move Command
 * 
 * Command for moving objects in 3D space.
 * Stores original and new positions for undo/redo.
 */

import { Command } from './Command.js';

export class MoveCommand extends Command {
    constructor(objects, fromPositions, toPositions, gridSystem, collisionSystem) {
        super(`Move ${objects.length} object(s)`);

        this.objects = Array.from(objects);
        this.fromPositions = fromPositions.map(p => ({ ...p }));
        this.toPositions = toPositions.map(p => ({ ...p }));
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;
    }

    execute() {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            const toPos = this.toPositions[i];
            const fromGridPos = this.gridSystem.worldToGrid(this.fromPositions[i]);
            const toGridPos = this.gridSystem.worldToGrid(toPos);

            // Update collision system
            if (this.collisionSystem) {
                this.collisionSystem.unregisterVoxel(fromGridPos);
                this.collisionSystem.registerVoxel(object, toGridPos);
            }

            // Update position
            object.position.set(toPos.x, toPos.y, toPos.z);
            object.userData.gridPosition = toGridPos;
        }
    }

    undo() {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            const fromPos = this.fromPositions[i];
            const fromGridPos = this.gridSystem.worldToGrid(fromPos);
            const toGridPos = this.gridSystem.worldToGrid(this.toPositions[i]);

            // Update collision system
            if (this.collisionSystem) {
                this.collisionSystem.unregisterVoxel(toGridPos);
                this.collisionSystem.registerVoxel(object, fromGridPos);
            }

            // Restore position
            object.position.set(fromPos.x, fromPos.y, fromPos.z);
            object.userData.gridPosition = fromGridPos;
        }
    }
}
