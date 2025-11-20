# HandCraft3D

> **Gesture-Controlled 3D Modeling Application**

A revolutionary browser-based 3D modeling tool that uses computer vision hand tracking to enable intuitive creation and manipulation of 3D models through natural hand gestures. No mouse, no keyboard - pure spatial interaction.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 🤚 **Hand Tracking**: Real-time hand detection using MediaPipe (21 landmarks per hand, 30-60 FPS)
- 🎨 **3D Modeling**: Create, select, and manipulate 3D objects using intuitive gestures
- ⚡ **Real-Time Performance**: Optimized for 60 FPS on modern hardware
- 🌐 **Browser-Based**: No installation required - runs entirely in the browser
- 💾 **Export Support**: Export models to GLB and STL formats for 3D printing

## 🎯 Gesture Controls

| Gesture | Action |
|---------|--------|
| 👌 Two-Hand Pinch | Create new block |
| 👆 Single Pinch | Select and move objects |
| ✋ Palm Open | Switch between modes |
| 🔄 Two-Hand Rotation | Rotate selected objects |
| 📏 Two-Hand Pull/Push | Scale objects |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Webcam
- HTTPS connection (or localhost for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/Renanlvrt/handcraft3d.git
cd handcraft3d

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### First Use

1. Grant camera permissions when prompted
2. Position yourself so your hands are visible in the camera feed (top-right corner)
3. Follow the on-screen gesture guide to start creating!

## 🛠️ Technology Stack

- **3D Rendering**: Three.js r160+
- **Computer Vision**: MediaPipe Hands v0.4+
- **Build Tool**: Vite 5.0+
- **CSG Operations**: csg.js (planned)
- **State Management**: Custom Command Pattern

## 📖 Development Roadmap

- [x] Phase 1: Foundation & Project Setup
  - [x] Three.js scene with lighting and camera
  - [x] Base HTML/CSS with modern UI
  - [x] Core application architecture
- [ ] Phase 2: Computer Vision Core
  - [ ] Camera access and WebRTC
  - [ ] MediaPipe Hands integration
  - [ ] Gesture recognition system
  - [ ] Coordinate mapping
- [ ] Phase 3: Core Modeling Features
  - [ ] Block creation system
  - [ ] Selection and manipulation
  - [ ] Visual feedback
- [ ] Phase 4: Advanced Operations
  - [ ] Extrude system
  - [ ] CSG operations (union, subtract, intersect)
- [ ] Phase 5: State Management
  - [ ] Undo/redo system
  - [ ] Save/load functionality
  - [ ] Export to GLB/STL
- [ ] Phase 6: Polish & Optimization
  - [ ] Performance optimization
  - [ ] Cross-browser testing
  - [ ] User experience refinements

## 🏗️ Project Structure

```
handcraft3d/
├── src/
│   ├── core/           # Application core (App, SceneManager, EventBus)
│   ├── vision/         # Computer vision (HandTracker, GestureRecognizer)
│   ├── modeling/       # 3D modeling systems (BlockSystem, Selection, CSG)
│   ├── ui/             # User interface components
│   ├── state/          # State management (UndoManager, Serialization)
│   └── utils/          # Utility functions
├── styles/             # CSS stylesheets
├── index.html          # Main HTML entry point
└── vite.config.js      # Vite configuration
```

## 🎨 Design Philosophy

HandCraft3D follows modern web design principles:
- **Dark theme** optimized for 3D visualization
- **Glassmorphism** UI elements with backdrop blur
- **Smooth animations** for professional feel
- **Responsive design** for various screen sizes
- **Accessibility** with keyboard shortcuts and clear visual feedback

## 🤝 Contributing

Contributions are welcome! This project is in active development.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [@the.poet.engineer](https://www.instagram.com/the.poet.engineer/)'s gesture-driven interfaces
- Built with [MediaPipe](https://google.github.io/mediapipe/) by Google
- Powered by [Three.js](https://threejs.org/)

## 📞 Contact

Created by [@Renanlvrt](https://github.com/Renanlvrt)

---

**Note**: This project is currently in development. Features are being actively implemented. Check the roadmap above for current progress.
