/**
 * Scene Manager - Three.js Scene Setup
 * Manages 3D scene, camera, renderer, and lighting
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
    constructor(container) {
        this.container = container;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.clock = new THREE.Clock();
    }

    /**
     * Initialize scene, camera, renderer, and lights
     */
    initialize() {
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.container.appendChild(this.renderer.domElement);

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 20);
        this.camera.lookAt(0, 0, 0);

        // Setup lighting
        this.setupLighting();

        // Add helpers
        this.addHelpers();

        // Add orbit controls (for debugging/optional camera control)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 5;
        this.controls.maxPolarAngle = Math.PI / 2; // Don't go below ground

        console.log('✅ Three.js scene initialized');
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Ambient light - base illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Main directional light (sun-like)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(15, 25, 15);
        mainLight.castShadow = true;

        // Configure shadow properties for quality
        mainLight.shadow.camera.left = -20;
        mainLight.shadow.camera.right = 20;
        mainLight.shadow.camera.top = 20;
        mainLight.shadow.camera.bottom = -20;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0001;

        this.scene.add(mainLight);

        // Fill light (softer, from opposite side)
        const fillLight = new THREE.DirectionalLight(0x7fb8ff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        // Hemisphere light (sky + ground)
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1a1a2e, 0.4);
        this.scene.add(hemiLight);

        // Accent point light (for visual interest)
        const accentLight = new THREE.PointLight(0x00ff88, 0.5, 30);
        accentLight.position.set(0, 5, 0);
        this.scene.add(accentLight);
    }

    /**
     * Add visual helpers (grid, axes, etc.)
     */
    addHelpers() {
        // Grid helper
        const gridHelper = new THREE.GridHelper(40, 40, 0x00ff88, 0x333333);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);

        // Axes helper (X=red, Y=green, Z=blue)
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(40, 40);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.02; // Slightly below grid
        this.scene.add(ground);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Update scene (called every frame)
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Dispose renderer
        this.renderer.dispose();

        // Clear scene
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.scene.clear();

        console.log('✅ Scene disposed');
    }
}
