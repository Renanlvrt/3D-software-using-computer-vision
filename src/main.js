/**
 * HandCraft3D - Main Entry Point
 * Initializes the application and handles startup sequence
 */

import { HandCraft3DApp } from './core/App.js';

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showErrorScreen(event.error.message);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorScreen(event.reason);
});

/**
 * Initialize application when DOM is ready
 */
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 HandCraft3D starting...');

    // Update loading step
    updateLoadingStep('camera', 'active');

    try {
        // Create app instance
        const app = new HandCraft3DApp();

        // Initialize application
        await app.initialize();

        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);

        // Make app globally accessible for debugging
        window.app = app;

        console.log('✅ HandCraft3D initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize HandCraft3D:', error);
        showErrorScreen(error.message);
    }
});

/**
 * Update loading step status
 */
function updateLoadingStep(stepId, status) {
    const step = document.getElementById(`step-${stepId}`);
    if (step) {
        step.classList.remove('active', 'complete');
        step.classList.add(status);
    }
}

/**
 * Show error screen with message
 */
function showErrorScreen(message) {
    const loadingScreen = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('error-screen');
    const errorMessage = document.getElementById('error-message');

    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }

    if (errorScreen && errorMessage) {
        errorMessage.textContent = message;
        errorScreen.style.display = 'flex';
    }
}

// Export for use in other modules
export { updateLoadingStep };
