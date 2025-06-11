/**
 * Car class for handling car physics and controls
 */
class Car {
    constructor(scene, initialPosition = { x: 0, y: 0.5, z: 0 }) {
        this.scene = scene;
        
        // Physics properties
        this.position = new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, 1);
        
        // Car characteristics
        this.maxSpeed = 120; // km/h
        this.maxReverseSpeed = 30; // km/h
        this.acceleration = 40; // km/h per second
        this.braking = 80; // km/h per second
        this.deceleration = 20; // km/h per second (when not accelerating)
        this.turnSpeed = 2.5; // radians per second
        
        // Current state
        this.speed = 0; // km/h
        this.isGrounded = true;
        this.steeringAngle = 0;
        
        // Car mesh and model
        this.mesh = null;
        this.wheelMeshes = [];
        this.carWidth = 1.8;
        this.carLength = 4.0;
        this.carHeight = 1.4;
        
        // Controls state
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };
        
        // Create car model
        this._createCarModel();
        
        // Add car to scene
        this.scene.add(this.mesh);
        
        // Set up collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
        this.colliderHelper = new THREE.Box3Helper(this.boundingBox, 0xff0000);
        this.colliderHelper.visible = false; // Set to true for debugging
        this.scene.add(this.colliderHelper);
        
        // Checkpoint and lap tracking
        this.currentCheckpoint = 0;
        this.lap = 1;
        this.lapStartTime = 0;
        this.lapTimes = [];
        this.bestLapTime = null;
    }
    
    _createCarModel() {
        // Create a simple car mesh (can be replaced with a loaded model later)
        const carGroup = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(this.carWidth, this.carHeight, this.carLength);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b00 });
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carGroup.add(carBody);
        
        // Car roof
        const roofGeometry = new THREE.BoxGeometry(this.carWidth * 0.8, this.carHeight * 0.4, this.carLength * 0.6);
        const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = this.carHeight * 0.7;
        roof.position.z = -this.carLength * 0.1;
        carGroup.add(roof);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        wheelGeometry.rotateX(Math.PI / 2);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
        
        // Front left wheel
        const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFL.position.set(this.carWidth/2 + 0.1, 0.4, this.carLength/2 - 0.7);
        carGroup.add(wheelFL);
        this.wheelMeshes.push(wheelFL);
        
        // Front right wheel
        const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFR.position.set(-this.carWidth/2 - 0.1, 0.4, this.carLength/2 - 0.7);
        carGroup.add(wheelFR);
        this.wheelMeshes.push(wheelFR);
        
        // Rear left wheel
        const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRL.position.set(this.carWidth/2 + 0.1, 0.4, -this.carLength/2 + 0.7);
        carGroup.add(wheelRL);
        this.wheelMeshes.push(wheelRL);
        
        // Rear right wheel
        const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRR.position.set(-this.carWidth/2 - 0.1, 0.4, -this.carLength/2 + 0.7);
        carGroup.add(wheelRR);
        this.wheelMeshes.push(wheelRR);
        
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffcc });
        
        // Left headlight
        const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightL.position.set(this.carWidth/2 - 0.3, 0.5, this.carLength/2 + 0.1);
        carGroup.add(headlightL);
        
        // Right headlight
        const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightR.position.set(-this.carWidth/2 + 0.3, 0.5, this.carLength/2 + 0.1);
        carGroup.add(headlightR);
        
        // Add headlight spotlights for effect
        const spotlightL = new THREE.SpotLight(0xffffcc, 0.5, 30, Math.PI / 4, 0.5);
        spotlightL.position.copy(headlightL.position);
        spotlightL.target.position.set(headlightL.position.x, 0, headlightL.position.z + 10);
        carGroup.add(spotlightL);
        carGroup.add(spotlightL.target);
        
        const spotlightR = new THREE.SpotLight(0xffffcc, 0.5, 30, Math.PI / 4, 0.5);
        spotlightR.position.copy(headlightR.position);
        spotlightR.target.position.set(headlightR.position.x, 0, headlightR.position.z + 10);
        carGroup.add(spotlightR);
        carGroup.add(spotlightR.target);
        
        // Set position and rotation
        carGroup.position.copy(this.position);
        carGroup.rotation.copy(this.rotation);
        
        // Add shadows
        carGroup.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.mesh = carGroup;
    }
    
    setupControls() {
        // Keyboard controls
        const keyDownHandler = (e) => {
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                    this.controls.forward = true;
                    break;
                case 'ArrowDown':
                case 's':
                    this.controls.backward = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.controls.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.controls.right = true;
                    break;
                case ' ':
                    this.controls.brake = true;
                    break;
            }
        };
        
        const keyUpHandler = (e) => {
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                    this.controls.forward = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.controls.backward = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.controls.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.controls.right = false;
                    break;
                case ' ':
                    this.controls.brake = false;
                    break;
            }
        };
        
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('keyup', keyUpHandler);
        
        return () => {
            window.removeEventListener('keydown', keyDownHandler);
            window.removeEventListener('keyup', keyUpHandler);
        };
    }
    
    update(deltaTime, track) {
        // Convert deltaTime to seconds
        const dt = deltaTime / 1000;
        
        // Handle steering
        if (this.controls.left) {
            this.steeringAngle = this.turnSpeed * (this.speed / this.maxSpeed) * dt;
            this.rotation.y += this.steeringAngle;
        }
        
        if (this.controls.right) {
            this.steeringAngle = -this.turnSpeed * (this.speed / this.maxSpeed) * dt;
            this.rotation.y += this.steeringAngle;
        }
        
        // Update direction vector based on car's rotation
        this.direction.set(0, 0, 1).applyEuler(this.rotation);
        
        // Handle acceleration and braking
        if (this.controls.forward && !this.controls.backward) {
            // Accelerate forward
            this.speed += this.acceleration * dt;
            if (this.speed > this.maxSpeed) {
                this.speed = this.maxSpeed;
            }
        } else if (this.controls.backward && !this.controls.forward) {
            // Accelerate backward
            this.speed -= this.acceleration * dt;
            if (this.speed < -this.maxReverseSpeed) {
                this.speed = -this.maxReverseSpeed;
            }
        } else {
            // Decelerate when no input
            if (this.speed > 0) {
                this.speed -= this.deceleration * dt;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.deceleration * dt;
                if (this.speed > 0) this.speed = 0;
            }
        }
        
        // Apply brakes
        if (this.controls.brake) {
            if (this.speed > 0) {
                this.speed -= this.braking * dt;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.braking * dt;
                if (this.speed > 0) this.speed = 0;
            }
        }
        
        // Calculate velocity vector from direction and speed
        this.velocity.copy(this.direction).multiplyScalar(this.speed);
        
        // Update position
        const movement = this.velocity.clone().multiplyScalar(dt);
        this.position.add(movement);
        
        // Apply movement to mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Update wheel rotation based on speed
        const wheelRotationSpeed = this.speed / 0.4; // Based on wheel radius
        this.wheelMeshes.forEach(wheel => {
            wheel.rotation.x += wheelRotationSpeed * dt;
        });
        
        // Update bounding box for collision detection
        this.boundingBox.setFromObject(this.mesh);
        
        // Check for checkpoint and lap crossing
        if (track) {
            this.checkCheckpoints(track);
        }
        
        // Update UI with current speed
        document.getElementById('speed').textContent = Math.abs(Math.round(this.speed));
    }
    
    checkCheckpoints(track) {
        // Check if we're crossing the current checkpoint
        const checkpointLine = track.checkpoints[this.currentCheckpoint];
        
        if (this.isIntersectingLine(checkpointLine.start, checkpointLine.end)) {
            // Mark checkpoint as passed
            this.currentCheckpoint = (this.currentCheckpoint + 1) % track.checkpoints.length;
            
            // If we crossed the start/finish line
            if (this.currentCheckpoint === 0) {
                const currentTime = performance.now();
                const lapTime = currentTime - this.lapStartTime;
                
                // Record lap time (but not for the first crossing)
                if (this.lap > 1) {
                    this.lapTimes.push(lapTime);
                    
                    // Update best lap time
                    if (this.bestLapTime === null || lapTime < this.bestLapTime) {
                        this.bestLapTime = lapTime;
                        document.getElementById('best-time').textContent = formatTime(this.bestLapTime);
                    }
                    
                    // Update UI
                    document.getElementById('time').textContent = formatTime(lapTime);
                }
                
                // Start timing the new lap
                this.lapStartTime = currentTime;
                this.lap++;
                
                // Update lap counter
                document.getElementById('current-lap').textContent = this.lap;
            }
        }
    }
    
    isIntersectingLine(lineStart, lineEnd) {
        // Create a line segment from the car's previous position to its current position
        const carLine = {
            start: this.position.clone().sub(this.velocity.clone().normalize().multiplyScalar(1)),
            end: this.position.clone()
        };
        
        // Check if the two line segments intersect
        return this.lineSegmentsIntersect(
            carLine.start.x, carLine.start.z,
            carLine.end.x, carLine.end.z,
            lineStart.x, lineStart.z,
            lineEnd.x, lineEnd.z
        );
    }
    
    lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Calculate the direction of the lines
        const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        
        // If uA and uB are between 0-1, the lines are colliding
        return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
    }
    
    reset(position) {
        // Reset car position and rotation
        this.position.copy(position);
        this.rotation.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        
        // Reset lap info
        this.currentCheckpoint = 0;
        this.lap = 1;
        this.lapStartTime = performance.now();
        this.lapTimes = [];
        this.bestLapTime = null;
        
        // Apply to mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Update UI
        document.getElementById('current-lap').textContent = this.lap;
        document.getElementById('time').textContent = "00:00.000";
        document.getElementById('best-time').textContent = "--:--:---";
        document.getElementById('speed').textContent = "0";
    }
    
    getCamera() {
        // Create a camera that follows the car
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Initial camera position
        camera.position.set(0, 3, -6);
        
        return camera;
    }
    
    updateCamera(camera) {
        // Calculate ideal camera position (following the car)
        const idealOffset = new THREE.Vector3(0, 3, -6);
        idealOffset.applyEuler(this.rotation);
        idealOffset.add(this.position);
        
        // Smooth camera movement with lerp
        camera.position.x = lerp(camera.position.x, idealOffset.x, 0.05);
        camera.position.y = lerp(camera.position.y, idealOffset.y, 0.05);
        camera.position.z = lerp(camera.position.z, idealOffset.z, 0.05);
        
        // Camera looks at the car position, slightly ahead
        const lookAtPosition = this.position.clone().add(this.direction.clone().multiplyScalar(8));
        camera.lookAt(lookAtPosition);
    }
}
