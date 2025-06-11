/**
 * Utility functions for the Vibe-Racer game
 */

// Format time in mm:ss.ms format
function formatTime(timeInMs) {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor((timeInMs % 1000));
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Lerp (Linear interpolation) function
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Calculate distance between two 3D points
function distance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Check if a point is inside a polygon (2D)
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].z;
        const xj = polygon[j].x, yj = polygon[j].z;
        
        const intersect = ((yi > point.z) !== (yj > point.z))
            && (point.x < (xj - xi) * (point.z - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Add helper to show axis for development
function createAxisHelper(scene, size = 10) {
    const axisHelper = new THREE.AxesHelper(size);
    scene.add(axisHelper);
    return axisHelper;
}

// Show/hide an element by ID
function toggleElementVisibility(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
}

// Add event listener with proper cleanup
function addEventListenerWithCleanup(element, type, handler) {
    element.addEventListener(type, handler);
    return () => element.removeEventListener(type, handler);
}
