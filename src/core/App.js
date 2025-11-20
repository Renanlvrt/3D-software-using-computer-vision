/**
 * HandCraft3D Application Core
 * Main application controller with Grid-based Minecraft-style building
 */

import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { EventBus } from './EventBus.js';
import { CameraManager } from '../vision/CameraManager.js';
import { HandTracker } from '../vision/HandTracker.js';
import { GestureRecognizer } from '../vision/GestureRecognizer.js';
import { CoordinateMapper } from '../vision/CoordinateMapper.js';
import { VisualFeedback } from '../ui/VisualFeedback.js';
import { GridBlockSystem } from '../modeling/GridBlockSystem.js';
import { SelectionSystem } from '../modeling/SelectionSystem.js';
import { ManipulationSystem } from '../modeling/ManipulationSystem.js';
import { ExtrudeSystem } from '../modeling/ExtrudeSystem.js';
import { CSGOperations } from '../modeling/CSGOperations.js';
import { UndoManager } from '../state/UndoManager.js';
import { StateSerializer } from '../state/StateSerializer.js';
import { CreateBlockCommand, DeleteObjectsCommand, TransformObjectsCommand, CreateExtrusionCommand } from '../state/Command.js';
import { ModeManager } from '../ui/ModeManager.js';
import { UIPanel } from '../ui/UIPanel.js';
import { updateLoadingStep } from '../main.js';

export class HandCraft3DApp {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;

        // Core systems
        this.sceneManager = null;
        this.eventBus = new EventBus();

        // Computer vision systems
        this.cameraManager = null;
        this.handTracker = null;
        this.gestureRecognizer = null;
        this.coordinateMapper = null;

        // Modeling systems
        this.blockSystem = null;
        this.selectionSystem = null;
        this.manipulationSystem = null;
        this.extrudeSystem = null;
        this.csgOperations = null;

        // State management
        this.undoManager = null;
        this.stateSerializer = null;

        // UI systems
        this.visualFeedback = null;
        this.modeManager = null;
        this.uiPanel = null;

        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;

        // Hand tracking data
        this.leftHand = null;
        this.rightHand = null;
        this.latestHandResults = null;

        // DOM elements
        this.videoElement = null;
        this.canvasElement = null;
    }

    async initialize() {
        console.log('🚀 Initializing HandCraft3D...');

        try {
            updateLoadingStep('scene', 'active');
            await this.initializeScene();
            updateLoadingStep('scene', 'complete');

            updateLoadingStep('camera', 'active');
            await this.initializeCamera();
            updateLoadingStep('camera', 'complete');

            updateLoadingStep('mediapipe', 'active');
            await this.initializeHandTracking();
            updateLoadingStep('mediapipe', 'complete');

            this.gestureRecognizer = new GestureRecognizer();
            this.coordinateMapper = new CoordinateMapper(this.videoElement);

            this.visualFeedback = new VisualFeedback(
                this.sceneManager.scene,
                this.canvasElement
            );

            this.initializeModelingSystems();
            await this.initializeStateManagement();
            this.initializeUI();
            this.setupEventListeners();
            this.startRenderLoop();

            this.isInitialized = true;
            console.log('✅ HandCraft3D initialized successfully');

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    async initializeScene() {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) throw new Error('Canvas container not found');

        this.sceneManager = new SceneManager(canvasContainer);
        this.sceneManager.initialize();
        this.addTestCube();
    }

    async initializeCamera() {
        this.videoElement = document.getElementById('input-video');
        this.canvasElement = document.getElementById('output-canvas');

        if (!this.videoElement || !this.canvasElement) {
            throw new Error('Video or canvas element not found');
        }

        this.canvasElement.width = 1280;
        this.canvasElement.height = 720;

        this.cameraManager = new CameraManager();
        await this.cameraManager.initialize(this.videoElement);

        const statusText = document.querySelector('#camera-status .status-text');
        if (statusText) statusText.textContent = 'Camera Active';
    }

    async initializeHandTracking() {
        this.handTracker = new HandTracker({
            videoElement: this.videoElement,
            onResults: (results) => this.onHandsDetected(results)
        });

        await this.handTracker.initialize();
        await this.handTracker.start();
    }

    initializeModelingSystems() {
        this.blockSystem = new GridBlockSystem(this.sceneManager.scene, this.eventBus);
        this.selectionSystem = new SelectionSystem(
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.eventBus
        );
        this.manipulationSystem = new ManipulationSystem(
            this.sceneManager.scene,
            this.eventBus
        );
        console.log('✅ Modeling systems initialized');
    }

    async initializeStateManagement() {
        this.undoManager = new UndoManager(this.eventBus);
        this.stateSerializer = new StateSerializer(this.sceneManager.scene, this.eventBus);
        await this.stateSerializer.initializeDB();

        this.extrudeSystem = new ExtrudeSystem(this.sceneManager.scene, this.eventBus);
        this.csgOperations = new CSGOperations(this.sceneManager.scene, this.eventBus);

        this.setupStateEventListeners();
        console.log('✅ State management initialized');
    }

    setupStateEventListeners() {
        this.eventBus.on('blocks-created', ({ blocks }) => {
            const command = new CreateBlockCommand(this.blockSystem, blocks);
            this.undoManager.execute(command);
        });

        this.eventBus.on('objects-deleted', ({ objects }) => {
            const command = new DeleteObjectsCommand(this.sceneManager.scene, objects);
            this.undoManager.execute(command);
        });

        this.eventBus.on('objects-transformed', ({ transformations }) => {
            const command = new TransformObjectsCommand(transformations);
            this.undoManager.execute(command);
        });

        this.eventBus.on('extrude-created', ({ mesh }) => {
            const command = new CreateExtrusionCommand(this.extrudeSystem, mesh);
            this.undoManager.execute(command);
        });
    }

    onHandsDetected(results) {
        this.latestHandResults = results;

        if (results.multiHandedness && results.multiHandLandmarks) {
            this.leftHand = null;
            this.rightHand = null;

            for (let i = 0; i < results.multiHandedness.length; i++) {
                const handedness = results.multiHandedness[i].label;
                const landmarks = results.multiHandLandmarks[i];

                if (handedness === 'Left') {
                    this.leftHand = landmarks;
                } else {
                    this.rightHand = landmarks;
                }
            }
        }

        const handCount = document.getElementById('hand-count');
        if (handCount) {
            const count = (this.leftHand ? 1 : 0) + (this.rightHand ? 1 : 0);
            handCount.textContent = count.toString();
        }

        if (this.visualFeedback) {
            this.visualFeedback.drawHandOverlay(results);
        }
    }

    addTestCube() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            roughness: 0.5,
            metalness: 0.5
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;

        this.sceneManager.scene.add(cube);

        this.eventBus.on('update', () => {
            cube.rotation.y += 0.01;
            cube.rotation.x += 0.005;
        });
    }

    initializeUI() {
        this.modeManager = new ModeManager(this.eventBus);
        this.modeManager.setMode(this.modeManager.modes.CREATE);

        this.uiPanel = new UIPanel(this.eventBus);
        this.uiPanel.initialize();

        this.setupUIEventListeners();

        console.log('✅ UI initialized');
    }

    setupUIEventListeners() {
        this.eventBus.on('mode-change-requested', ({ mode }) => {
            this.modeManager.setMode(mode);
        });

        this.eventBus.on('undo-requested', () => {
            if (this.undoManager) this.undoManager.undo();
        });

        this.eventBus.on('redo-requested', () => {
            if (this.undoManager) this.undoManager.redo();
        });

        this.eventBus.on('save-requested', () => {
            if (this.stateSerializer) {
                const sceneName = prompt('Enter scene name:', 'My Scene');
                if (sceneName) this.stateSerializer.saveScene(sceneName);
            }
        });

        this.eventBus.on('export-requested', () => {
            if (this.stateSerializer) {
                this.stateSerializer.exportGLB('handcraft3d-scene.glb');
            }
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });

        window.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                if (this.undoManager) this.undoManager.undo();
            }

            if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
                event.preventDefault();
                if (this.undoManager) this.undoManager.redo();
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                if (this.stateSerializer) {
                    const sceneName = prompt('Enter scene name:', 'My Scene');
                    if (sceneName) this.stateSerializer.saveScene(sceneName);
                }
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                if (this.stateSerializer) {
                    this.stateSerializer.exportGLB('handcraft3d-scene.glb');
                }
            }
        });
    }

    startRenderLoop() {
        this.isRunning = true;
        this.lastFPSUpdate = performance.now();

        const animate = (timestamp) => {
            if (!this.isRunning) return;

            requestAnimationFrame(animate);
            this.eventBus.emit('update', { timestamp });
            this.update(timestamp);
            this.sceneManager.render();
            this.updateFPS(timestamp);
        };

        animate(performance.now());
        console.log('✅ Render loop started');
    }

    update(timestamp) {
        if (this.sceneManager) {
            this.sceneManager.update();
        }

        if (this.latestHandResults) {
            this.processHandData();
        }
    }

    processHandData() {
        if (!this.leftHand && !this.rightHand) return;

        let leftPinch = null;
        let rightPinch = null;

        // 1. Detect Pinches & Update Visual Feedback
        if (this.leftHand) {
            leftPinch = this.gestureRecognizer.detectPinch(this.leftHand, 'left');
            if (this.visualFeedback) {
                const leftPos = this.coordinateMapper.mediaPipeToWorld(this.leftHand[8]); // Index tip
                this.visualFeedback.showHandCursor('left', leftPos, leftPinch);
            }
        } else if (this.visualFeedback) {
            this.visualFeedback.hideHandCursor('left');
        }

        if (this.rightHand) {
            rightPinch = this.gestureRecognizer.detectPinch(this.rightHand, 'right');
            if (this.visualFeedback) {
                const rightPos = this.coordinateMapper.mediaPipeToWorld(this.rightHand[8]); // Index tip
                this.visualFeedback.showHandCursor('right', rightPos, rightPinch);
            }
        } else if (this.visualFeedback) {
            this.visualFeedback.hideHandCursor('right');
        }

        // 2. Compute Two-Hand Gesture
        let twoHandPinch = { isActive: false };
        if (leftPinch && rightPinch) {
            twoHandPinch = this.gestureRecognizer.computeTwoHandGesture(leftPinch, rightPinch);

            // Convert pinch positions to world space if active
            if (twoHandPinch.isActive) {
                twoHandPinch.leftPosition = this.coordinateMapper.mediaPipeToWorld(twoHandPinch.leftPosition);
                twoHandPinch.rightPosition = this.coordinateMapper.mediaPipeToWorld(twoHandPinch.rightPosition);
                twoHandPinch.center = this.coordinateMapper.mediaPipeToWorld(twoHandPinch.center);
            }
        }

        // 3. Route to Active Mode System
        if (!this.modeManager) return;
        const currentMode = this.modeManager.currentMode;

        switch (currentMode) {
            case 'CREATE':
                if (this.blockSystem) {
                    this.blockSystem.update({
                        leftHand: this.leftHand,
                        rightHand: this.rightHand,
                        twoHandPinch: twoHandPinch
                    });
                }
                break;

            case 'SELECT':
            case 'DELETE':
                if (this.selectionSystem) {
                    this.selectionSystem.update(this.leftHand, this.rightHand, this.gestureRecognizer, this.coordinateMapper);
                    if (currentMode === 'DELETE') {
                        this.selectionSystem.deleteSelected();
                    }
                }
                break;

            case 'MOVE':
                if (this.selectionSystem) {
                    this.selectionSystem.update(this.leftHand, this.rightHand, this.gestureRecognizer, this.coordinateMapper);
                }
                if (this.manipulationSystem) {
                    this.manipulationSystem.update(this.leftHand, this.rightHand, this.gestureRecognizer, this.coordinateMapper);
                }
                break;

            case 'EXTRUDE':
                if (this.extrudeSystem) {
                    this.extrudeSystem.update(this.leftHand, this.rightHand, this.gestureRecognizer, this.coordinateMapper);
                }
                break;
        }
    }

    stop() {
        this.isRunning = false;

        if (this.sceneManager) this.sceneManager.dispose();
        if (this.handTracker) this.handTracker.dispose();
        if (this.cameraManager) this.cameraManager.dispose();
        if (this.visualFeedback) this.visualFeedback.dispose();
        if (this.stateSerializer) this.stateSerializer.dispose();

        console.log('🛑 HandCraft3D stopped');
    }

    getState() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            fps: this.currentFPS,
            objectCount: this.sceneManager?.scene.children.length || 0,
            handsDetected: (this.leftHand ? 1 : 0) + (this.rightHand ? 1 : 0)
        };
    }
}
