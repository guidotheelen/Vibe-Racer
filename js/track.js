/**
 * Track class for creating the racing track
 */
class Track {
    constructor(scene) {
        this.scene = scene;
        this.trackMesh = null;
        this.barriers = [];
        this.checkpoints = [];
        this.startPosition = new THREE.Vector3(0, 0.5, 0);
        this.finishLine = null;
        
        // Track dimensions
        this.trackWidth = 12;
        this.trackLength = 300;
        
        // Create the track
        this._createTrack();
    }
    
    _createTrack() {
        // Create a group for all track elements
        const trackGroup = new THREE.Group();
        
        // Create the ground plane
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a5c1a,
            side: THREE.DoubleSide 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        trackGroup.add(ground);
        
        // Create track path (a closed loop)
        const trackPath = this._createTrackPath();
        
        // Create the track mesh based on the path
        this._createTrackMesh(trackPath, trackGroup);
        
        // Create barriers along the track
        this._createBarriers(trackPath, trackGroup);
        
        // Create checkpoints along the track
        this._createCheckpoints(trackPath);
        
        // Add track objects to the scene
        this.scene.add(trackGroup);
        
        // Store the track mesh for collision detection
        this.trackMesh = trackGroup;
    }
    
    _createTrackPath() {
        // Define the track path using control points
        // This creates a race track in a roughly oval shape with some turns
        const trackPoints = [
            new THREE.Vector3(0, 0, 0),             // Start/finish line
            new THREE.Vector3(40, 0, -20),          // Turn 1 entry
            new THREE.Vector3(60, 0, -60),          // Turn 1 apex
            new THREE.Vector3(50, 0, -100),         // Turn 1 exit
            new THREE.Vector3(20, 0, -120),         // Straight
            new THREE.Vector3(-20, 0, -130),        // Turn 2 entry
            new THREE.Vector3(-60, 0, -110),        // Turn 2 apex
            new THREE.Vector3(-80, 0, -80),         // Turn 2 exit
            new THREE.Vector3(-90, 0, -40),         // Back straight
            new THREE.Vector3(-80, 0, 0),           // Turn 3 entry
            new THREE.Vector3(-60, 0, 30),          // Turn 3 apex
            new THREE.Vector3(-30, 0, 40),          // Turn 3 exit
            new THREE.Vector3(0, 0, 30),            // Final straight
        ];
        
        // Create a closed loop
        trackPoints.push(trackPoints[0].clone());
        
        return trackPoints;
    }
    
    _createTrackMesh(trackPath, trackGroup) {
        // Create track surface
        const trackGeometry = new THREE.BufferGeometry();
        const trackMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const vertices = [];
        const innerTrackPoints = [];
        const outerTrackPoints = [];
        
        // Create inner and outer track edges
        for (let i = 0; i < trackPath.length - 1; i++) {
            const current = trackPath[i];
            const next = trackPath[i + 1];
            
            // Direction from current to next point
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            
            // Create perpendicular vector to define track width
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            
            // Inner and outer track edges
            const innerPoint = current.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));
            const outerPoint = current.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));
            
            innerTrackPoints.push(innerPoint);
            outerTrackPoints.push(outerPoint);
        }
        
        // Create track surface triangles
        for (let i = 0; i < trackPath.length - 1; i++) {
            const nextI = (i + 1) % (trackPath.length - 1);
            
            // Create two triangles for each track segment
            // Triangle 1
            vertices.push(innerTrackPoints[i].x, innerTrackPoints[i].y, innerTrackPoints[i].z);
            vertices.push(outerTrackPoints[i].x, outerTrackPoints[i].y, outerTrackPoints[i].z);
            vertices.push(innerTrackPoints[nextI].x, innerTrackPoints[nextI].y, innerTrackPoints[nextI].z);
            
            // Triangle 2
            vertices.push(innerTrackPoints[nextI].x, innerTrackPoints[nextI].y, innerTrackPoints[nextI].z);
            vertices.push(outerTrackPoints[i].x, outerTrackPoints[i].y, outerTrackPoints[i].z);
            vertices.push(outerTrackPoints[nextI].x, outerTrackPoints[nextI].y, outerTrackPoints[nextI].z);
        }
        
        // Create track mesh
        const verticesArray = new Float32Array(vertices);
        trackGeometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));
        trackGeometry.computeVertexNormals();
        
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.receiveShadow = true;
        track.position.y = 0.01; // Slightly above ground to avoid z-fighting
        trackGroup.add(track);
        
        // Add track markings (start/finish line)
        const startLineGeometry = new THREE.PlaneGeometry(this.trackWidth, 2);
        const startLineMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
        startLine.rotation.x = -Math.PI / 2;
        startLine.position.set(trackPath[0].x, 0.02, trackPath[0].z); // Slightly above track
        trackGroup.add(startLine);
        
        // Add racing line (for visual guidance)
        const racingLinePoints = [];
        for (let i = 0; i < trackPath.length; i++) {
            racingLinePoints.push(new THREE.Vector3(trackPath[i].x, 0.03, trackPath[i].z));
        }
        
        const racingLineGeometry = new THREE.BufferGeometry().setFromPoints(racingLinePoints);
        const racingLineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
        const racingLine = new THREE.Line(racingLineGeometry, racingLineMaterial);
        trackGroup.add(racingLine);
        
        // Set start position
        this.startPosition = new THREE.Vector3(trackPath[0].x, 0.5, trackPath[0].z);
        
        // Store inner and outer track points for collision detection
        this.innerTrackPoints = innerTrackPoints;
        this.outerTrackPoints = outerTrackPoints;
    }
    
    _createBarriers(trackPath, trackGroup) {
        const barrierHeight = 1.5;
        const barrierMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd });
        
        // Create inner and outer barriers
        for (let i = 0; i < trackPath.length - 1; i++) {
            const current = trackPath[i];
            const next = trackPath[i + 1];
            
            // Direction from current to next point
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            
            // Create perpendicular vector to define track width
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            
            // Inner and outer barrier points
            const innerPoint = current.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 0.5));
            const outerPoint = current.clone().add(perpendicular.clone().multiplyScalar(-(this.trackWidth / 2 + 0.5)));
            
            // Create inner barrier
            const innerBarrierGeometry = new THREE.BoxGeometry(0.5, barrierHeight, direction.length() * 1.2);
            const innerBarrier = new THREE.Mesh(innerBarrierGeometry, barrierMaterial);
            innerBarrier.position.set(
                (innerPoint.x + next.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 0.5)).x) / 2,
                barrierHeight / 2,
                (innerPoint.z + next.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 0.5)).z) / 2
            );
            
            // Rotate barrier to align with track
            innerBarrier.lookAt(next.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 0.5)));
            innerBarrier.rotation.x = 0;
            innerBarrier.rotation.z = 0;
            
            // Add inner barrier to the scene
            innerBarrier.castShadow = true;
            trackGroup.add(innerBarrier);
            this.barriers.push(innerBarrier);
            
            // Create outer barrier
            const outerBarrierGeometry = new THREE.BoxGeometry(0.5, barrierHeight, direction.length() * 1.2);
            const outerBarrier = new THREE.Mesh(outerBarrierGeometry, barrierMaterial);
            outerBarrier.position.set(
                (outerPoint.x + next.clone().add(perpendicular.clone().multiplyScalar(-(this.trackWidth / 2 + 0.5))).x) / 2,
                barrierHeight / 2,
                (outerPoint.z + next.clone().add(perpendicular.clone().multiplyScalar(-(this.trackWidth / 2 + 0.5))).z) / 2
            );
            
            // Rotate outer barrier to align with track
            outerBarrier.lookAt(next.clone().add(perpendicular.clone().multiplyScalar(-(this.trackWidth / 2 + 0.5))));
            outerBarrier.rotation.x = 0;
            outerBarrier.rotation.z = 0;
            
            // Add outer barrier to the scene
            outerBarrier.castShadow = true;
            trackGroup.add(outerBarrier);
            this.barriers.push(outerBarrier);
        }
    }
    
    _createCheckpoints(trackPath) {
        // Create checkpoint lines along the track
        for (let i = 0; i < trackPath.length - 1; i++) {
            const current = trackPath[i];
            const next = trackPath[i + 1];
            
            // Direction from current to next point
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            
            // Create perpendicular vector to define checkpoint width
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            
            // Checkpoint position (midpoint between current and next track point)
            const checkpointPos = new THREE.Vector3().addVectors(current, next).multiplyScalar(0.5);
            
            // Checkpoint line start and end
            const checkpointStart = checkpointPos.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));
            const checkpointEnd = checkpointPos.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));
            
            // Add checkpoint
            this.checkpoints.push({
                start: checkpointStart,
                end: checkpointEnd
            });
            
            // The first checkpoint is the start/finish line
            if (i === 0) {
                this.finishLine = {
                    start: checkpointStart,
                    end: checkpointEnd
                };
            }
        }
    }
    
    getStartPosition() {
        return this.startPosition;
    }
    
    checkCollision(car) {
        // Check for collision with barriers
        for (const barrier of this.barriers) {
            const barrierBox = new THREE.Box3().setFromObject(barrier);
            if (car.boundingBox.intersectsBox(barrierBox)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Add scenery to make the track more interesting
    addScenery() {
        // Add trees around the track
        const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
        const treeTrunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
        const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x1b5e20 });
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x795548 });
        
        // Create 50 random trees outside the track
        for (let i = 0; i < 50; i++) {
            const treeGroup = new THREE.Group();
            
            // Tree trunk
            const trunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
            trunk.position.y = 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            // Tree top
            const treeTop = new THREE.Mesh(treeGeometry, treeMaterial);
            treeTop.position.y = 7;
            treeTop.castShadow = true;
            treeGroup.add(treeTop);
            
            // Position tree randomly, but away from the track
            let validPosition = false;
            let attempts = 0;
            let position;
            
            while (!validPosition && attempts < 50) {
                position = new THREE.Vector3(
                    (Math.random() - 0.5) * 400,
                    0,
                    (Math.random() - 0.5) * 400
                );
                
                // Check if the tree is far enough from the track
                validPosition = true;
                for (let j = 0; j < this.innerTrackPoints.length; j++) {
                    const innerPoint = this.innerTrackPoints[j];
                    const outerPoint = this.outerTrackPoints[j];
                    
                    const distToInner = distance(position, innerPoint);
                    const distToOuter = distance(position, outerPoint);
                    
                    if (distToInner < 20 || distToOuter < 20) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            if (validPosition) {
                treeGroup.position.copy(position);
                this.scene.add(treeGroup);
            }
        }
        
        // Add mountains in the background
        const mountainGeometry = new THREE.ConeGeometry(50, 100, 4);
        const mountainMaterial = new THREE.MeshPhongMaterial({ color: 0x757575 });
        
        // Create 10 mountains in the far background
        for (let i = 0; i < 10; i++) {
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            
            // Position mountains in a circle around the track
            const angle = (i / 10) * Math.PI * 2;
            const distance = 350;
            mountain.position.set(
                Math.sin(angle) * distance,
                0,
                Math.cos(angle) * distance
            );
            
            // Vary mountain size
            const scale = 0.5 + Math.random() * 1.5;
            mountain.scale.set(scale, scale, scale);
            
            mountain.castShadow = true;
            this.scene.add(mountain);
        }
        
        // Add a skybox
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterials = [
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // right
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // left
            new THREE.MeshBasicMaterial({ color: 0x6CA6CD, side: THREE.BackSide }), // top
            new THREE.MeshBasicMaterial({ color: 0x6CA6CD, side: THREE.BackSide }), // bottom
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // front
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // back
        ];
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
        this.scene.add(skybox);
    }
}
