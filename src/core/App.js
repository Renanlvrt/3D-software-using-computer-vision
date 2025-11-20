/**
 * HandCraft3D Application Core
 * Main application controller that coordinates all subsystems
 */

import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { EventBus } from './EventBus.js';
import { CameraManager } from '../vision/CameraManager.js';
import { HandTracker } from '../vision/HandTracker.js';
import { GestureRecognizer } from '../vision/GestureRecognizer.js';
import { CoordinateMapper } from '../vision/CoordinateMapper.js';
import { VisualFeedback } from '../ui/VisualFeedback.js';
import { BlockSystem } from '../modeling/BlockSystem.js';
import { SelectionSystem } from '../modeling/SelectionSystem.js';
import { ManipulationSystem } from '../modeling/ManipulationSystem.js';
import { ExtrudeSystem } from '../modeling/ExtrudeSystem.js';
import { CSGOperations } from '../modeling/CSGOperations.js';
import { UndoManager } from '../state/UndoManager.js';
import { StateSerializer } from '../state/StateSerializer.js';
import { CreateBlockCommand, DeleteObjectsCommand, TransformObjectsCommand, CreateExtrusionCommand } from '../state/Command.js';
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

        this.modeIndicator = null;
        this.statsPanel = null;

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

    /**
     * Initialize all application systems
     */
    async initialize() {
        console.log('🚀 Initializing HandCraft3D...');

        try {
            // Phase 1: Initialize Three.js scene
            updateLoadingStep('scene', 'active');
            await this.initializeScene();
            updateLoadingStep('scene', 'complete');
            console.log('✅ Scene initialized');

            // Phase 2: Initialize camera
            updateLoadingStep('camera', 'active');
            await this.initializeCamera();
            updateLoadingStep('camera', 'complete');
            console.log('✅ Camera initialized');

            // Phase 3: Initialize MediaPipe hand tracking
            updateLoadingStep('mediapipe', 'active');
            await this.initializeHandTracking();
            updateLoadingStep('mediapipe', 'complete');
            console.log('✅ Hand tracking initialized');

            // Phase 4: Initialize gesture recognition
            this.gestureRecognizer = new GestureRecognizer();
            console.log('✅ Gesture recognizer initialized');

            // Phase 5: Initialize coordinate mapper
            this.coordinateMapper = new CoordinateMapper(this.videoElement);
            console.log('✅ Coordinate mapper initialized');

            // Phase 6: Initialize visual feedback
            this.visualFeedback = new VisualFeedback(
                this.sceneManager.scene,
                // Phase 10: Start render loop
                this.startRenderLoop();

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize Three.js scene
     */
    async initializeScene() {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            throw new Error('Canvas container not found');
        }

        this.sceneManager = new SceneManager(canvasContainer);
        this.sceneManager.initialize();

        // Add a test cube to verify scene is working
        this.addTestCube();
    }

    /**
     * Initialize camera
     */
    async initializeCamera() {
        this.videoElement = document.getElementById('input-video');
        this.canvasElement = document.getElementById('output-canvas');

        if (!this.videoElement || !this.canvasElement) {
            throw new Error('Video or canvas element not found');
        }

        // Set canvas size to match video
        this.canvasElement.width = 1280;
        this.canvasElement.height = 720;

        // Initialize camera manager
        this.cameraManager = new CameraManager();
        await this.cameraManager.initialize(this.videoElement);

        // Update camera status
        const statusText = document.querySelector('#camera-status .status-text');
        if (statusText) {
            statusText.textContent = 'Camera Active';
        }
    }

    /**
     * Initialize hand tracking
     */
    async initializeHandTracking() {
        this.handTracker = new HandTracker({
            videoElement: this.videoElement,
            onResults: (results) => this.onHandsDetected(results)
        });

        await this.handTracker.initialize();
        await this.handTracker.start();
    }

    /**
     * Initialize modeling systems
     */
    initializeModelingSystems() {
        // Block creation system
        this.blockSystem = new BlockSystem(this.sceneManager.scene, this.eventBus);
        console.log('✅ BlockSystem initialized');

        // Selection system
        this.selectionSystem = new SelectionSystem(
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.eventBus
        );
        console.log('✅ SelectionSystem initialized');

        // Manipulation system
        this.manipulationSystem = new ManipulationSystem(
            this.sceneManager.scene,
            this.eventBus
        );
        console.log('✅ ManipulationSystem initialized');
    }

    /**
     * Initialize state management systems
     */
    async initializeStateManagement() {
        // Undo/Redo manager
        this.undoManager = new UndoManager(this.eventBus);
        console.log('✅ UndoManager initialized');

        // State serializer for save/load
        this.stateSerializer = new StateSerializer(this.sceneManager.scene, this.eventBus);
        await this.stateSerializer.initializeDB();
        console.log('✅ StateSerializer initialized');

        // Extrude system
        this.extrudeSystem = new ExtrudeSystem(this.sceneManager.scene, this.eventBus);
        console.log('✅ ExtrudeSystem initialized');

        // CSG operations
        this.csgOperations = new CSGOperations(this.sceneManager.scene, this.eventBus);
        console.log('✅ CSGOperations initialized');

        // Setup event listeners for automatic command recording
        this.setupStateEventListeners();
    }

    /**
     * Setup event listeners for state management
     */
    setupStateEventListeners() {
        // Block creation
        this.eventBus.on('blocks-created', ({ blocks }) => {
            for (const block of blocks) {
                const command = new CreateBlockCommand(this.blockSystem, block);
                this.undoManager.execute(command);
            }
        });

        // Object deletion
        this.eventBus.on('objects-deleted', ({ objects }) => {
            const command = new DeleteObjectsCommand(this.sceneManager.scene, objects);
            this.undoManager.execute(command);
        });

        // Object transformation
        this.eventBus.on('objects-transformed', ({ transformations }) => {
            const command = new TransformObjectsCommand(transformations);
            this.undoManager.execute(command);
        });

        // Extrusion creation
        this.eventBus.on('extrude-created', ({ mesh }) => {
            const command = new CreateExtrusionCommand(this.extrudeSystem, mesh);
            this.undoManager.execute(command);
        });
    }

    /**
     * Handle hand tracking results
     */
    onHandsDetected(results) {
        this.latestHandResults = results;

        // Extract left and right hands
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

        // Update hand count UI
        const handCount = document.getElementById('hand-count');
        if (handCount) {
            const count = (this.leftHand ? 1 : 0) + (this.rightHand ? 1 : 0);
            handCount.textContent = count.toString();
        }

        // Draw hand visualization
        if (this.visualFeedback) {
            this.visualFeedback.drawHandOverlay(results);
        }
    }

    /**
     * Process hand tracking data and update modeling systems
     */
    processHandData() {
        if (!this.leftHand && !this.rightHand) return;

        // Prepare gesture data object
        const gestureData = {
            leftHand: this.leftHand,
            rightHand: this.rightHand,
            singlePinch: null,
            twoHandPinch: null
        };

        // Detect two-hand pinch for block creation
        if (this.leftHand && this.rightHand) {
            const twoHandPinch = this.gestureRecognizer.detectTwoHandPinch(
                this.leftHand,
                this.rightHand
            );

            if (twoHandPinch.isActive) {
                gestureData.twoHandPinch = {
                    isActive: true,
                    center: this.coordinateMapper.mediaPipeToWorld(twoHandPinch.center),
                    leftPosition: this.coordinateMapper.mediaPipeToWorld(twoHandPinch.leftPosition),
                    rightPosition: this.coordinateMapper.mediaPipeToWorld(twoHandPinch.rightPosition),
                    separation: twoHandPinch.separation
                };
            }
        }

        // Update block system
        if (this.blockSystem) {
            this.blockSystem.update(gestureData);
        }

        // Update hand cursors
        if (this.leftHand) {
            const pinch = this.gestureRecognizer.detectPinch(this.leftHand);
            const worldPos = this.coordinateMapper.mediaPipeToWorld(pinch.position);
            this.visualFeedback.showHandCursor('left', worldPos, { isPinched: pinch.isPinched });
        } else {
            this.visualFeedback.hideHandCursor('left');
        }

        if (this.rightHand) {
            const pinch = this.gestureRecognizer.detectPinch(this.rightHand);
            const worldPos = this.coordinateMapper.mediaPipeToWorld(pinch.position);
            this.visualFeedback.showHandCursor('right', worldPos, { isPinched: pinch.isPinched });
        } else {
            this.visualFeedback.hideHandCursor('right');
        }
    }

    /**
     * Add a test cube to verify rendering (temporary)
     */
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

        // Animate cube rotation
        this.eventBus.on('update', () => {
            cube.rotation.y += 0.01;
            cube.rotation.x += 0.005;
        });
    }

    /**
     * Initialize UI
     */
    initializeUI() {
        // UI initialization (stats, mode indicator, etc.)
        console.log('✅ UI initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });

        // Keyboard shortcuts (undo/redo will be implemented in Phase 5)
        window.addEventListener('keydown', (event) => {
            // Ctrl+Z / Cmd+Z - Undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                console.log('Undo triggered (not yet implemented)');
                // this.undoManager?.undo();
            }

            // Ctrl+Y / Cmd+Shift+Z - Redo
            if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
                console.log('Redo triggered (not yet implemented)');
                // this.undoManager?.redo();
            }
        });
    }

    /**
     * Start the main render loop
     */
    startRenderLoop() {
        this.isRunning = true;
        this.lastFPSUpdate = performance.now();

        const animate = (timestamp) => {
            if (!this.isRunning) return;

            requestAnimationFrame(animate);

            // Emit update event
            this.eventBus.emit('update', { timestamp });

            // Update systems
            this.update(timestamp);

            // Render scene
            this.sceneManager.render();

            // Update FPS counter
            this.updateFPS(timestamp);
        };

        animate(performance.now());
        console.log('✅ Render loop started');
    }

    /**
     * Update all systems
     */
    update(timestamp) {
        // Update scene manager
        if (this.sceneManager) {
            this.sceneManager.update();
        }

        // Process hand tracking results
        if (this.latestHandResults) {
            this.processHandData();
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS(timestamp) {
        this.frameCount++;

        const elapsed = timestamp - this.lastFPSUpdate;

        // Update FPS every 500ms
        if (elapsed >= 500) {
            this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFPSUpdate = timestamp;

            // Update UI
            const fpsCounter = document.getElementById('fps-counter');
            if (fpsCounter) {
                fpsCounter.textContent = this.currentFPS.toString();

                // Color code based on performance
                if (this.currentFPS >= 50) {
                    fpsCounter.style.color = '#00ff88';
                } else if (this.currentFPS >= 30) {
                    fpsCounter.style.color = '#ffaa00';
                } else {
                    fpsCounter.style.color = '#ff6b9d';
                }
            }
        }
    }

    /**
     * Stop the application
     */
    stop() {
        this.isRunning = false;

        // Dispose systems
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }

        if (this.handTracker) {
            this.handTracker.dispose();
        }

        if (this.cameraManager) {
            this.cameraManager.dispose();
        }

        if (this.visualFeedback) {
            this.visualFeedback.dispose();
        }

        console.log('🛑 HandCraft3D stopped');
    }

    /**
     * Get current application state
     */
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
