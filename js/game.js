/**
 * Game class for managing the game state and logic
 */
class Game {
    constructor() {
        // Game state
        this.state = {
            loading: true,
            running: false,
            paused: false,
            gameOver: false
        };
        
        // Game settings
        this.settings = {
            totalLaps: 3,
            shadowsEnabled: true,
            soundEnabled: true
        };
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Initialize Three.js scene
        this._initScene();
        
        // Initialize game objects
        this._initGameObjects();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Start loading assets
        this._loadAssets().then(() => {
            this.state.loading = false;
            this._showStartScreen();
        });
    }
    
    _initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        this._setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    _setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 100, -100);
        sunLight.castShadow = this.settings.shadowsEnabled;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);
        
        // Add a hemisphere light for more natural outdoor lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6);
        this.scene.add(hemisphereLight);
    }
    
    _initGameObjects() {
        // Create track
        this.track = new Track(this.scene);
        
        // Create car
        this.car = new Car(this.scene, this.track.getStartPosition());
        
        // Get camera from car
        this.camera = this.car.getCamera();
        
        // Add scenery
        this.track.addScenery();
        
        // Set up total laps in UI
        document.getElementById('total-laps').textContent = this.settings.totalLaps;
    }
    
    _setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this._startGame();
        });
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this._restartGame();
        });
        
        // Keyboard controls for game state
        window.addEventListener('keydown', (e) => {
            // Pause/unpause with Escape key
            if (e.key === 'Escape' && this.state.running) {
                this._togglePause();
            }
            
            // Restart with R key
            if (e.key === 'r' && (this.state.gameOver || this.state.paused)) {
                this._restartGame();
            }
        });
    }
    
    async _loadAssets() {
        // Simulate asset loading time
        return new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    }
    
    _showStartScreen() {
        toggleElementVisibility('loading-screen', false);
        toggleElementVisibility('start-screen', true);
    }
    
    _startGame() {
        // Hide start screen
        toggleElementVisibility('start-screen', false);
        
        // Set up car controls
        this.removeControlsListener = this.car.setupControls();
        
        // Reset car and start time
        this.car.reset(this.track.getStartPosition());
        this.gameStartTime = performance.now();
        
        // Start game loop
        this.state.running = true;
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this._gameLoop.bind(this));
    }
    
    _togglePause() {
        this.state.paused = !this.state.paused;
        
        if (this.state.paused) {
            // Show pause screen
            // For simplicity, we'll just use the start screen with different text
            document.querySelector('.start-content h1').textContent = "PAUSED";
            document.querySelector('.start-content p').textContent = "Press ESC to resume, R to restart";
            document.getElementById('start-button').textContent = "RESUME";
            toggleElementVisibility('start-screen', true);
        } else {
            // Hide pause screen and resume
            toggleElementVisibility('start-screen', false);
            // Reset for next time
            document.querySelector('.start-content h1').textContent = "VIBE-RACER";
            document.querySelector('.start-content p').textContent = "Control your car with arrow keys or WASD";
            document.getElementById('start-button').textContent = "START RACE";
            
            // Reset time tracking to avoid large delta
            this.lastFrameTime = performance.now();
        }
    }
    
    _restartGame() {
        // Hide all screens
        toggleElementVisibility('start-screen', false);
        toggleElementVisibility('game-over-screen', false);
        
        // Reset car and game state
        this.car.reset(this.track.getStartPosition());
        this.gameStartTime = performance.now();
        
        this.state.running = true;
        this.state.paused = false;
        this.state.gameOver = false;
        
        // Reset time tracking
        this.lastFrameTime = performance.now();
    }
    
    _endGame() {
        this.state.running = false;
        this.state.gameOver = true;
        
        // Clean up event listeners
        if (this.removeControlsListener) {
            this.removeControlsListener();
        }
        
        // Calculate total time
        const totalTime = performance.now() - this.gameStartTime;
        
        // Update game over screen
        document.getElementById('total-time').textContent = formatTime(totalTime);
        document.getElementById('best-lap-time').textContent = this.car.bestLapTime ? formatTime(this.car.bestLapTime) : "--:--:---";
        
        // Show game over screen
        toggleElementVisibility('game-over-screen', true);
    }
    
    _gameLoop(timestamp) {
        // Calculate delta time
        this.deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // FPS counter
        this.frameCount++;
        if (timestamp - this.lastFpsUpdate > 1000) {
            this.fps = Math.round(this.frameCount / ((timestamp - this.lastFpsUpdate) / 1000));
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;
        }
        
        // If game is running and not paused
        if (this.state.running && !this.state.paused) {
            // Update car
            this.car.update(this.deltaTime, this.track);
            
            // Update camera
            this.car.updateCamera(this.camera);
            
            // Check for collision with track barriers
            if (this.track.checkCollision(this.car)) {
                // Simple collision response: reduce speed
                this.car.speed *= 0.5;
                
                // Move car back slightly to avoid getting stuck in barriers
                const backupDirection = this.car.direction.clone().multiplyScalar(-1);
                this.car.position.add(backupDirection.multiplyScalar(0.1));
                this.car.mesh.position.copy(this.car.position);
            }
            
            // Check if race is complete
            if (this.car.lap > this.settings.totalLaps) {
                this._endGame();
            }
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
        }
        
        // Continue game loop if not game over
        if (this.state.running) {
            requestAnimationFrame(this._gameLoop.bind(this));
        }
    }
    
    // Public methods
    start() {
        this._startGame();
    }
    
    pause() {
        if (this.state.running && !this.state.paused) {
            this._togglePause();
        }
    }
    
    resume() {
        if (this.state.running && this.state.paused) {
            this._togglePause();
        }
    }
    
    restart() {
        this._restartGame();
    }
}
