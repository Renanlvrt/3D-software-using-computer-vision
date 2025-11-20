/**
 * Extrude Command
 * 
 * Command for extruding voxel faces.
 * Stores created voxels for undo/redo.
 */

import { Command } from './Command.js';

export class ExtrudeCommand extends Command {
    constructor(createdVoxels, scene, gridSystem, collisionSystem) {
        super(`Extrude ${createdVoxels.length} voxel(s)`);

        this.createdVoxels = createdVoxels;
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.collisionSystem = collisionSystem;

        // Store voxel data for potential re-creation after undo
        this.voxelData = createdVoxels.map(v => ({
            gridPosition: { ...v.userData.gridPosition },
            position: v.position.clone(),
            color: v.material.color.getHex()
        }));
    }

    execute() {
        // Add voxels to scene
        for (let i = 0; i < this.createdVoxels.length; i++) {
            const voxel = this.createdVoxels[i];
            this.scene.add(voxel);

            if (this.collisionSystem) {
                this.collisionSystem.registerVoxel(voxel, voxel.userData.gridPosition);
            }
        }
    }

    undo() {
        // Remove voxels from scene
        for (const voxel of this.createdVoxels) {
            this.scene.remove(voxel);

            if (this.collisionSystem) {
                this.collisionSystem.unregisterVoxel(voxel.userData.gridPosition);
            }
        }
    }
}
