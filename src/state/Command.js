/**
 * Command Pattern Base Classes
 * Foundation for undo/redo system
 */

/**
 * Base Command class
 * All commands must implement execute() and undo()
 */
export class Command {
    constructor() {
        this.timestamp = Date.now();
    }

    /**
     * Execute the command
     */
    execute() {
        throw new Error('Command.execute() must be implemented');
    }

    /**
     * Undo the command
     */
    undo() {
        throw new Error('Command.undo() must be implemented');
    }

    /**
     * Get command description for UI
     */
    getDescription() {
        return 'Unknown Command';
    }
}

/**
 * Create Block Command (for Grid System)
 */
export class CreateBlockCommand extends Command {
    constructor(blockSystem, blocks) {
        super();
        this.blockSystem = blockSystem;
        this.blocks = Array.isArray(blocks) ? blocks : [blocks];
    }

    execute() {
        for (const block of this.blocks) {
            this.blockSystem.scene.add(block);
            const key = this.blockSystem.getGridKey(block.userData.gridPosition);
            this.blockSystem.blocks.set(key, block);
        }
    }

    undo() {
        for (const block of this.blocks) {
            const key = this.blockSystem.getGridKey(block.userData.gridPosition);
            this.blockSystem.blocks.delete(key);
            this.blockSystem.scene.remove(block);
        }
    }

    getDescription() {
        return `Create ${this.blocks.length} Block(s)`;
    }
}

/**
 * Delete Objects Command
 */
export class DeleteObjectsCommand extends Command {
    constructor(scene, objects) {
        super();
        this.scene = scene;
        this.objects = objects.map(obj => ({
            object: obj,
            parent: obj.parent
        }));
    }

    execute() {
        for (const { object } of this.objects) {
            this.scene.remove(object);
        }
    }

    undo() {
        for (const { object, parent } of this.objects) {
            if (parent) {
                parent.add(object);
            } else {
                this.scene.add(object);
            }
        }
    }

    getDescription() {
        return `Delete ${this.objects.length} Object(s)`;
    }
}

/**
 * Transform Objects Command
 */
export class TransformObjectsCommand extends Command {
    constructor(transformations) {
        super();
        this.transformations = transformations;
    }

    execute() {
        for (const transform of this.transformations) {
            const { object, finalTransform } = transform;
            object.position.copy(finalTransform.position);
            object.rotation.copy(finalTransform.rotation);
            object.scale.copy(finalTransform.scale);
        }
    }

    undo() {
        for (const transform of this.transformations) {
            const { object, initialTransform } = transform;
            object.position.copy(initialTransform.position);
            object.rotation.copy(initialTransform.rotation);
            object.scale.copy(initialTransform.scale);
        }
    }

    getDescription() {
        return `Transform ${this.transformations.length} Object(s)`;
    }
}

/**
 * Create Extrusion Command
 */
export class CreateExtrusionCommand extends Command {
    constructor(extrudeSystem, mesh) {
        super();
        this.extrudeSystem = extrudeSystem;
        this.mesh = mesh;
    }

    execute() {
        this.extrudeSystem.scene.add(this.mesh);
    }

    undo() {
        this.extrudeSystem.scene.remove(this.mesh);
    }

    getDescription() {
        return 'Create Extrusion';
    }
}
