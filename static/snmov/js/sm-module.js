import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/loaders/GLTFLoader.js";

const modelContainer = document.getElementById('threejsModel');

// Set up the scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, modelContainer.offsetWidth / modelContainer.offsetHeight, 0.1, 1000);
camera.position.set(-2, 2, 2); // Position camera back and slightly above


// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(modelContainer.offsetWidth, modelContainer.offsetHeight);
renderer.setPixelRatio(window.devicePixelRatio);
modelContainer.appendChild(renderer.domElement);

// Add ambient light and directional light
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add orbit controls for camera
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth the controls
controls.dampingFactor = 0.1;
controls.enableZoom = true; // Disable zoom as per requirements

// Load the GLTF model
const gltfLoader = new GLTFLoader();
gltfLoader.load(gltf_file_url, (gltf) => {
    const model = gltf.scene;
    scene.add(model); // Add loaded model to the scene
    gltf.scene.position.set(0, 0, 0); // Adjust model position if needed
0
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Set the camera to look at a point relative to the model's center
    const lookAtPoint = new THREE.Vector3(center.x + 0, center.y + 0, center.z + 0);
    camera.lookAt(lookAtPoint);

    // If using OrbitControls, update the target as well
    controls.target.copy(lookAtPoint);
    controls.update();

}, undefined, (error) => {
    console.error("Error loading GLTF model:", error);
});

// Handle resizing
window.addEventListener('resize', () => {
    renderer.setSize(modelContainer.offsetWidth, modelContainer.offsetHeight);
    camera.aspect = modelContainer.offsetWidth / modelContainer.offsetHeight;
    camera.updateProjectionMatrix();
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update controls each frame
    renderer.render(scene, camera);
}
animate();


// document.addEventListener('DOMContentLoaded', function() {
//     const modelViewer = document.getElementById('gltfModel');
//     const nextButton = document.getElementById('nextButton');
//     const dialogueOverlay = document.getElementById('dialogue-overlay');
//     // Get the parsed JSON data from the template
//     const dialogues = JSON.parse(document.getElementById('dialogues_data').textContent);

//     // Ensure the dialogues data loaded correctly
//     console.log("Dialogues Loaded:", dialogues);
//     let currentDialogueIndex = 0;
    
//     // Debugging: Check if elements are loaded
//     console.log("Next Button:", nextButton);
//     console.log("Dialogue Overlay:", dialogueOverlay);
    

//     if (modelViewer) {
//         console.log("Model is ready to load");
//     } else {
//         console.error("Model viewer element not found.");
//     }
    
//     if (modelViewer) {
//         console.log("Model is ready to load");
//     } else {
//         console.error("Model viewer element not found.");
//     }

//     if (!nextButton || !dialogueOverlay) {
//         console.error("Button or overlay not found");
//         return;
//     }

//     nextButton.addEventListener('click', function() {
//         console.log("next clicked");
        
//         // Check if there are dialogues to display
//         if (currentDialogueIndex < dialogues.length) {
//             // Get the current dialogue
//             const dialogue = dialogues[currentDialogueIndex];
//             dialogueOverlay.innerText = dialogue.text; // Update overlay text
//             dialogueOverlay.style.display = 'block'; // Show the overlay
            
//             console.log(`Displaying dialogue: ${dialogue.text}`);
            
//             // Update the model's zoom and angle based on the POV
//             const pov = dialogue.pov; // Assuming each dialogue has a POV object
//             if (pov) {
//                 const cameraAngle = `${pov.angle_x} ${pov.angle_y} ${pov.angle_z}`; // Format the camera angles
//                 const zoomLevel = pov.zoom_level; // Get the zoom level
//                 console.log("cameraControls structure:", modelViewer.cameraControls.zoom);

//                 console.log("Variable to be accessed for zoom:", zoomLevel); 

//                 // Update the model viewer's camera based on the POV
//                 modelViewer.cameraOrbit = cameraAngle; // Set the camera angle
//                 modelViewer.cameraControls.zoom = zoomLevel; // Set the zoom level
                
//                 console.log(`Updated camera angle to: ${cameraAngle} and zoom level to: ${zoomLevel}`);
//             }
    
//             // Increment index for next click
//             currentDialogueIndex++;
//         } else {
//             // If no more dialogues, hide the overlay
//             dialogueOverlay.style.display = 'none';
//             currentDialogueIndex = 0; // Reset for potential future clicks
//         }
//     });
    

// });