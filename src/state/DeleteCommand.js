/**
 * Delete Command
 * 
 * Command for deleting objects.
 * Stores deleted objects and their data for undo/redo.
 */

import { Command } from './Command.js';

export class DeleteCommand extends Command {
    constructor(objects, scene, gridSystem, collisionSystem) {
        super(`Delete ${objects.length} object(s)`);

        this.deletedObjects = Array.from(objects);
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;

        // Store object data
        this.objectData = this.deletedObjects.map(obj => ({
            object: obj,
            gridPosition: { ...obj.userData.gridPosition },
            position: obj.position.clone(),
            rotation: obj.rotation.clone(),
            scale: obj.scale.clone()
        }));
    }

    execute() {
        // Remove objects from scene
        for (const data of this.objectData) {
            this.scene.remove(data.object);

            if (this.collisionSystem) {
                this.collisionSystem.unregisterVoxel(data.gridPosition);
            }
        }
    }

    undo() {
        // Restore objects to scene
        for (const data of this.objectData) {
            this.scene.add(data.object);

            // Restore position/rotation/scale
            data.object.position.copy(data.position);
            data.object.rotation.copy(data.rotation);
            data.object.scale.copy(data.scale);
            data.object.userData.gridPosition = data.gridPosition;

            if (this.collisionSystem) {
                this.collisionSystem.registerVoxel(data.object, data.gridPosition);
            }
        }
    }
}
