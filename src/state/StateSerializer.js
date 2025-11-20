/**
 * State Serializer
 * Handles saving/loading scene state and exporting to various formats
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export class StateSerializer {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // IndexedDB configuration
        this.dbName = 'HandCraft3D';
        this.dbVersion = 1;
        this.storeName = 'scenes';
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     * @returns {Promise<void>}
     */
    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }

    /**
     * Serialize scene to JSON
     * @returns {Object} Serialized scene data
     */
    serializeScene() {
        const objects = [];

        // Iterate through scene objects
        this.scene.traverse((object) => {
            // Only serialize user-created objects
            if (object.userData.isBlock || object.userData.isExtruded) {
                objects.push({
                    type: object.userData.isBlock ? 'block' : 'extrusion',
                    position: object.position.toArray(),
                    rotation: object.rotation.toArray(),
                    scale: object.scale.toArray(),
                    geometry: this.serializeGeometry(object.geometry),
                    material: this.serializeMaterial(object.material),
                    userData: object.userData
                });
            }
        });

        return {
            version: '1.0',
            timestamp: Date.now(),
            objects: objects,
            camera: {
                position: this.scene.camera?.position.toArray() || [0, 5, 10],
                rotation: this.scene.camera?.rotation.toArray() || [0, 0, 0]
            }
        };
    }

    /**
     * Serialize geometry data
     * @param {THREE.BufferGeometry} geometry - Geometry to serialize
     * @returns {Object} Serialized geometry
     */
    serializeGeometry(geometry) {
        return {
            type: geometry.type,
            parameters: geometry.parameters || {}
        };
    }

    /**
     * Serialize material data
     * @param {THREE.Material} material - Material to serialize
     * @returns {Object} Serialized material
     */
    serializeMaterial(material) {
        return {
            type: material.type,
            color: material.color?.getHex() || 0xffffff,
            roughness: material.roughness || 0.5,
            metalness: material.metalness || 0.5
        };
    }

    /**
     * Save scene to IndexedDB
     * @param {string} name - Scene name
     * @returns {Promise<number>} Saved scene ID
     */
    async saveScene(name = 'Untitled Scene') {
        if (!this.db) {
            await this.initializeDB();
        }

        const sceneData = this.serializeScene();
        sceneData.name = name;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const request = objectStore.add(sceneData);

            request.onsuccess = () => {
                console.log(`💾 Scene saved: ${name} (ID: ${request.result})`);
                this.eventBus.emit('scene-saved', { id: request.result, name });
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load scene from IndexedDB
     * @param {number} id - Scene ID
     * @returns {Promise<Object>} Scene data
     */
    async loadScene(id) {
        if (!this.db) {
            await this.initializeDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);

            const request = objectStore.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    console.log(`📂 Scene loaded: ${request.result.name}`);
                    this.eventBus.emit('scene-loaded', { sceneData: request.result });
                    resolve(request.result);
                } else {
                    reject(new Error('Scene not found'));
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * List all saved scenes
     * @returns {Promise<Array>} List of scenes
     */
    async listScenes() {
        if (!this.db) {
            await this.initializeDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);

            const request = objectStore.getAll();

            request.onsuccess = () => {
                const scenes = request.result.map(scene => ({
                    id: scene.id,
                    name: scene.name,
                    timestamp: scene.timestamp,
                    objectCount: scene.objects.length
                }));
                resolve(scenes);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete scene from IndexedDB
     * @param {number} id - Scene ID
     * @returns {Promise<void>}
     */
    async deleteScene(id) {
        if (!this.db) {
            await this.initializeDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log(`🗑️ Scene deleted: ID ${id}`);
                this.eventBus.emit('scene-deleted', { id });
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Export scene to GLB format
     * @param {string} filename - Output filename
     * @returns {Promise<void>}
     */
    async exportGLB(filename = 'scene.glb') {
        const exporter = new GLTFExporter();

        return new Promise((resolve, reject) => {
            exporter.parse(
                this.scene,
                (gltf) => {
                    const blob = new Blob([gltf], { type: 'application/octet-stream' });
                    this.downloadBlob(blob, filename);

                    console.log(`📦 Exported to GLB: ${filename}`);
                    this.eventBus.emit('scene-exported', { format: 'glb', filename });
                    resolve();
                },
                (error) => {
                    console.error('❌ GLB export failed:', error);
                    reject(error);
                },
                { binary: true }
            );
        });
    }

    /**
     * Export scene to STL format (simplified version)
     * @param {string} filename - Output filename
     */
    exportSTL(filename = 'scene.stl') {
        // STL export requires additional library or custom implementation
        // This is a placeholder for future implementation
        console.log('🚧 STL export not yet implemented');
        this.eventBus.emit('export-not-implemented', { format: 'stl' });
    }

    /**
     * Download blob as file
     * @param {Blob} blob - Data to download
     * @param {string} filename - Output filename
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        console.log('✅ StateSerializer disposed');
    }
}
