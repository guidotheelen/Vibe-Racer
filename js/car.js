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
        this.turnSpeed = 4.0; // radians per second (increased for tighter turning)
        
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

        // Main body (low and long)
        const bodyGeometry = new THREE.BoxGeometry(this.carWidth * 1.1, this.carHeight * 0.4, this.carLength * 0.9);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x151c3a }); // dark blue
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carGroup.add(carBody);

        // Cockpit
        const cockpitGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 }); // yellow
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.rotation.z = Math.PI / 2;
        cockpit.position.set(0, 0.8, 0.2);
        carGroup.add(cockpit);

        // Nose cone
        const noseGeometry = new THREE.CylinderGeometry(0.18, 0.3, 1.2, 16);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 }); // yellow
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.z = Math.PI / 2;
        nose.position.set(0, 0.45, this.carLength * 0.45);
        carGroup.add(nose);

        // Front wing
        const frontWingGeometry = new THREE.BoxGeometry(this.carWidth * 1.5, 0.08, 0.5);
        const frontWingMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // red
        const frontWing = new THREE.Mesh(frontWingGeometry, frontWingMaterial);
        frontWing.position.set(0, 0.32, this.carLength * 0.55);
        carGroup.add(frontWing);

        // Rear wing
        const rearWingGeometry = new THREE.BoxGeometry(this.carWidth * 1.2, 0.08, 0.4);
        const rearWingMaterial = new THREE.MeshPhongMaterial({ color: 0x151c3a }); // dark blue
        const rearWing = new THREE.Mesh(rearWingGeometry, rearWingMaterial);
        rearWing.position.set(0, 0.7, -this.carLength * 0.48);
        carGroup.add(rearWing);
        // Rear wing endplates
        const endplateGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.4);
        const endplateMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const endplateL = new THREE.Mesh(endplateGeometry, endplateMaterial);
        endplateL.position.set(this.carWidth * 0.6, 0.85, -this.carLength * 0.48);
        carGroup.add(endplateL);
        const endplateR = new THREE.Mesh(endplateGeometry, endplateMaterial);
        endplateR.position.set(-this.carWidth * 0.6, 0.85, -this.carLength * 0.48);
        carGroup.add(endplateR);

        // Sidepods
        const podGeometry = new THREE.BoxGeometry(0.18, 0.25, 1.2);
        const podMaterial = new THREE.MeshPhongMaterial({ color: 0x151c3a });
        const podL = new THREE.Mesh(podGeometry, podMaterial);
        podL.position.set(this.carWidth * 0.65, 0.45, 0);
        carGroup.add(podL);
        const podR = new THREE.Mesh(podGeometry, podMaterial);
        podR.position.set(-this.carWidth * 0.65, 0.45, 0);
        carGroup.add(podR);

        // Engine cover (shark fin)
        const finGeometry = new THREE.BoxGeometry(0.08, 0.5, 1.2);
        const finMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        fin.position.set(0, 1.0, -0.3);
        carGroup.add(fin);

        // Wheels (large, F1 style)
        const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24);
        wheelGeometry.rotateZ(Math.PI / 2);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const tireMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 }); // yellow ring
        // Front left wheel
        const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFL.position.set(this.carWidth/2 + 0.25, 0.35, this.carLength/2 - 0.3);
        carGroup.add(wheelFL);
        this.wheelMeshes.push(wheelFL);
        // Front right wheel
        const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFR.position.set(-this.carWidth/2 - 0.25, 0.35, this.carLength/2 - 0.3);
        carGroup.add(wheelFR);
        this.wheelMeshes.push(wheelFR);
        // Rear left wheel
        const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRL.position.set(this.carWidth/2 + 0.25, 0.35, -this.carLength/2 + 0.3);
        carGroup.add(wheelRL);
        this.wheelMeshes.push(wheelRL);
        // Rear right wheel
        const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRR.position.set(-this.carWidth/2 - 0.25, 0.35, -this.carLength/2 + 0.3);
        carGroup.add(wheelRR);
        this.wheelMeshes.push(wheelRR);
        // Add yellow ring to wheels (simple visual effect)
        for (let wheel of this.wheelMeshes) {
            const ringGeometry = new THREE.TorusGeometry(0.45, 0.04, 8, 24);
            const ring = new THREE.Mesh(ringGeometry, tireMaterial);
            ring.rotation.x = Math.PI / 2;
            wheel.add(ring);
        }

        // Red Bull logo (stylized, yellow box)
        const logoGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.02);
        const logoMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, 0.7, 0.7);
        carGroup.add(logo);
        // Oracle logo (stylized, white box)
        const oracleGeometry = new THREE.BoxGeometry(0.7, 0.12, 0.02);
        const oracleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const oracle = new THREE.Mesh(oracleGeometry, oracleMaterial);
        oracle.position.set(0, 0.62, 0.1);
        carGroup.add(oracle);

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
        let currentSteeringAngle = 0;
        if (this.controls.left) {
            this.steeringAngle = this.turnSpeed * (this.speed / this.maxSpeed) * dt;
            this.rotation.y += this.steeringAngle;
            currentSteeringAngle = Math.PI / 6; // 30 degrees wheel turn
        } else if (this.controls.right) {
            this.steeringAngle = -this.turnSpeed * (this.speed / this.maxSpeed) * dt;
            this.rotation.y += this.steeringAngle;
            currentSteeringAngle = -Math.PI / 6; // -30 degrees wheel turn
        } else {
            currentSteeringAngle = 0; // Wheels straight
        }
        
        // Apply steering angle to front wheels (first two wheels in the wheelMeshes array)
        if (this.wheelMeshes.length >= 2) {
            this.wheelMeshes[0].rotation.y = currentSteeringAngle;
            this.wheelMeshes[1].rotation.y = currentSteeringAngle;
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
        
        // --- DRIFTING FUNCTIONALITY ---
        // Calculate drift factor based on speed and steering
        let driftFactor = 0;
        if (Math.abs(currentSteeringAngle) > 0.01 && Math.abs(this.speed) > 30) {
            // More drift at higher speed and higher steering angle
            driftFactor = Math.min(1, (Math.abs(this.speed) / this.maxSpeed) * (Math.abs(currentSteeringAngle) / (Math.PI / 6)) * 1.2);
        }
        // Calculate forward and lateral (sideways) directions
        const forward = new THREE.Vector3(Math.sin(this.rotation.y), 0, Math.cos(this.rotation.y));
        const right = new THREE.Vector3(Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y));
        // Calculate lateral velocity for drift
        let lateralVelocity = 0;
        if (driftFactor > 0) {
            lateralVelocity = driftFactor * this.speed * 0.25; // 0.25 is drift strength
            // Add a little randomness for fun
            lateralVelocity += (Math.random() - 0.5) * driftFactor * 0.5;
        }
        
        // Calculate velocity vector from direction and speed
        this.velocity.copy(this.direction).multiplyScalar(this.speed);
        // Add drift (sideways) component
        if (driftFactor > 0) {
            this.velocity.add(right.clone().multiplyScalar(lateralVelocity));
        }
        
        // Update position
        const movement = this.velocity.clone().multiplyScalar(dt);
        this.position.add(movement);
        
        // Apply movement to mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Update wheel rotation based on speed
        // Convert speed from km/h to radians per second based on wheel radius (0.4m)
        // Circumference = 2πr = 2π * 0.4 = 2.51m
        // At 1 km/h = 0.28 m/s, a wheel completes 0.28/2.51 = 0.11 rotations per second
        // One rotation = 2π radians, so that's 0.11 * 2π = 0.69 radians per second at 1 km/h
        const wheelCircumference = 2 * Math.PI * 0.4; // meters
        const speedMetersPerSecond = Math.abs(this.speed) * (1000 / 3600); // Convert km/h to m/s
        const rotationsPerSecond = speedMetersPerSecond / wheelCircumference; 
        const radiansPerSecond = rotationsPerSecond * 2 * Math.PI;
        
        // Apply rotation in the correct direction based on car's movement
        const rotationDirection = this.speed >= 0 ? 1 : -1;
        const wheelRotationAmount = radiansPerSecond * rotationDirection * dt;
        
        // Apply rotation to each wheel
        for (let i = 0; i < this.wheelMeshes.length; i++) {
            // For the x-axis rotation (forward/backward rolling), apply to all wheels
            this.wheelMeshes[i].rotation.x += wheelRotationAmount;
        }
        
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
