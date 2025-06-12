// Global variables
let currentDialogueIndex = 0;
let dialogues = [];
let isUpdatingPointer = false;
let isAnimating = false;
let isModelReady = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // ================ DOM ELEMENTS ================
    const modelViewer = document.querySelector('model-viewer');
    const topBubble = document.getElementById('top-bubble');
    const topDialogue = document.getElementById('top-dialogue');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const dialoguesContainer = document.querySelector('.dialogues-container');
    const dialogues = dialoguesContainer?.querySelectorAll('.dialogue');
    
    console.log('Found elements:', {
        modelViewer: !!modelViewer,
        topBubble: !!topBubble,
        topDialogue: !!topDialogue,
        prevButton: !!prevButton,
        nextButton: !!nextButton,
        dialoguesContainer: !!dialoguesContainer,
        dialoguesCount: dialogues?.length || 0
    });
    
    // ================ STATE ================
    let currentDialogueIndex = 0;
    
    // ================ INITIALIZATION ================
    function init() {
        console.log('Initializing...');
        if (!modelViewer || !topBubble || !topDialogue) {
            console.error('Required elements not found');
            return;
        }
        
        // Set the animation duration and easing
        modelViewer.setAttribute('interpolation-decay', '200');
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('interpolation', 'cubic-bezier(0.3, 0.0, 0.7, 1.0)');
        
        // Set camera orbit limits and field of view
        modelViewer.setAttribute('min-camera-orbit', 'auto auto 1m');
        modelViewer.setAttribute('max-camera-orbit', 'auto auto 30m');
        modelViewer.setAttribute('min-field-of-view', '10deg');  // Allow closer zooming
        modelViewer.setAttribute('max-field-of-view', '90deg');  // Maximum zoom out
        
        // Initialize with first dialogue
        currentDialogueIndex = 0;
        
        // Set up start button handler
        const startButton = document.getElementById('start-button');
        const overlayContainer = document.getElementById('overlay-container');
        
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('Start button clicked');
                if (overlayContainer) {
                    overlayContainer.style.display = 'none';
                }
                startEpisode();
            });
        }
        
        // Wait for model to be fully loaded
        if (modelViewer.loaded) {
            console.log('Model already loaded, initializing...');
            initPointerSystem(); // Initialize pointer system first
            createHotspots();
            setupEventListeners();
        } else {
            console.log('Waiting for model to load...');
            modelViewer.addEventListener('load', () => {
                console.log('Model loaded, initializing...');
                initPointerSystem(); // Initialize pointer system first
                createHotspots();
                setupEventListeners();
            });
        }
    }
    
    function startEpisode() {
        if (isStarted) {
            console.log('Episode already started, ignoring click');
            return;
        }
        
        console.log('Starting episode...');
        if (coverSection) coverSection.style.display = 'none';
        if (modelSection) modelSection.style.display = 'block';
        isStarted = true;
        
        // Add a small delay before first view update to ensure everything is ready
        setTimeout(() => {
            updateView();
        }, 100);
    }
    
    function createHotspots() {
        console.log('Creating hotspots...');
        
        // Remove existing hotspots
        const existingHotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        existingHotspots.forEach(hotspot => {
            console.log('Removing existing hotspot:', hotspot.getAttribute('data-character'));
            hotspot.remove();
        });
        
        // Create a Set to track unique characters
        const processedCharacters = new Set();
        
        // Create hotspots for each dialogue
        dialogues.forEach((dialogue, index) => {
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            const character = povData.character.toLowerCase();
            
            // Skip if we've already created a hotspot for this character
            if (processedCharacters.has(character)) {
                console.log(`Skipping duplicate hotspot for ${character}`);
                return;
            }
            
            console.log(`Creating hotspot for character ${character}:`, povData);
            
            // Create hotspot element
            const hotspot = document.createElement('button');
            hotspot.setAttribute('slot', `hotspot-${character}`);
            hotspot.setAttribute('data-position', `${povData.head_x}m ${povData.head_y}m ${povData.head_z}m`);
            hotspot.setAttribute('data-character', povData.character);
            hotspot.setAttribute('data-camera-target', povData.camera_target);
            hotspot.setAttribute('data-camera-orbit', povData.camera_orbit);
            hotspot.setAttribute('data-field-of-view', povData.field_of_view);
            hotspot.setAttribute('class', 'hotspot');
            hotspot.setAttribute('data-visibility-attribute', 'visible');
            
            // Create dot element
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            // Set color based on character
            switch(character) {
                case 'will':
                    dot.classList.add('red');
                    break;
                case 'nel':
                    dot.classList.add('blue');
                    break;
                case 'ed':
                    dot.classList.add('green');
                    break;
                case 'sam':
                    dot.classList.add('yellow');
                    break;
            }
            
            // Add dot to hotspot
            hotspot.appendChild(dot);
            
            // Add hotspot to model-viewer
            modelViewer.appendChild(hotspot);
            console.log(`Created hotspot for ${povData.character} at position:`, hotspot.getAttribute('data-position'));
            
            // Mark this character as processed
            processedCharacters.add(character);
        });
        
        console.log('Created hotspots for characters:', Array.from(processedCharacters));
        
        // Add event listener for hotspot visibility changes
        modelViewer.addEventListener('hotspot-visibility', (event) => {
            console.log('Hotspot visibility changed:', {
                hotspot: event.target,
                visible: event.detail.visible
            });
        });
    }
    
    function initPointerSystem() {
        console.log('=== Starting initPointerSystem ===');
        
        // Remove existing SVG if it exists
        const existingSvg = document.getElementById('pointer-svg');
        if (existingSvg) {
            existingSvg.remove();
        }
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'pointer-svg';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '9999';
        svg.style.overflow = 'visible';
        
        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = 'pointer-path';
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('stroke-linecap', 'round');
        
        // Add path to SVG
        svg.appendChild(path);
        
        // Add SVG to model-viewer
        modelViewer.appendChild(svg);
        
        // Store references
        window.pointerSvg = svg;
        window.pointerPath = path;
        
        console.log('Pointer system initialized:', {
            svg: {
                id: svg.id,
                style: {
                    position: svg.style.position,
                    top: svg.style.top,
                    left: svg.style.left,
                    width: svg.style.width,
                    height: svg.style.height,
                    pointerEvents: svg.style.pointerEvents,
                    zIndex: svg.style.zIndex,
                    overflow: svg.style.overflow
                }
            },
            path: {
                id: path.id,
                attributes: {
                    fill: path.getAttribute('fill'),
                    stroke: path.getAttribute('stroke'),
                    strokeWidth: path.getAttribute('stroke-width'),
                    strokeDasharray: path.getAttribute('stroke-dasharray'),
                    strokeLinecap: path.getAttribute('stroke-linecap')
                }
            }
        });
        
        console.log('=== Finished initPointerSystem ===');
    }
    
    function setupEventListeners() {
        console.log('Setting up event listeners...');
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                console.log('Next button clicked');
                nextDialogue();
            });
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                console.log('Previous button clicked');
                prevDialogue();
            });
        }
        
        if (modelViewer) {
            // Add load event listener
            modelViewer.addEventListener('load', () => {
                console.log('Model viewer loaded');
                if (isStarted) {
                    updateView();
                }
            });
            
            // Add debounced camera change handler
            let cameraChangeTimeout;
            modelViewer.addEventListener('camera-change', () => {
                if (!isStarted) return; // Only update if episode has started
                
                // Clear any existing timeout
                if (cameraChangeTimeout) {
                    clearTimeout(cameraChangeTimeout);
                }
                
                // Set a new timeout
                cameraChangeTimeout = setTimeout(() => {
                    console.log('Camera settled, updating pointer...');
                    updatePointer();
                }, 500); // Wait 500ms after last camera change
            });
            
            // Add resize observer with debouncing
            let resizeTimeout;
            const resizeObserver = new ResizeObserver(() => {
                if (!isStarted) return; // Only update if episode has started
                
                // Clear any existing timeout
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
                // Set a new timeout
                resizeTimeout = setTimeout(() => {
                    console.log('Resize settled, updating pointer...');
                    updatePointer();
                }, 100);
            });
            resizeObserver.observe(modelViewer);
        }
    }
    
    function updateView() {
        console.log('Updating view...');
        
        // Update dialogue content
        updateDialogueContent();
        
        // Update camera position
        updateCameraPosition()
            .then(() => {
                console.log('Camera position updated, waiting for camera to settle...');
                // Wait for camera to settle before updating pointer
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('Camera settled, updating pointer...');
                        updatePointer().then(resolve);
                    }, 1000);
                });
            })
            .then(() => {
                console.log('Pointer updated, updating button states...');
                updateButtonStates();
            })
            .catch(error => {
                console.error('Error updating view:', error);
                updateButtonStates();
            });
    }
    
    function updateDialogueContent() {
        const dialogue = dialogues?.[currentDialogueIndex];
        
        if (!dialogue) {
            console.error('No dialogue found for current index:', currentDialogueIndex);
            return;
        }
        
        const povData = JSON.parse(dialogue.getAttribute('data-pov'));
        console.log('Updating dialogue content with POV data:', povData);
        
        // Find the hotspot that matches the camera target
        const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        const closestHotspot = findClosestHotspot(hotspots, povData.camera_target, povData.character);
        
        if (closestHotspot) {
            const character = closestHotspot.getAttribute('data-character');
            // Use the character name from the hotspot
            topDialogue.innerHTML = `<strong>${character}:</strong> ${povData.text}`;
        } else {
            // Fallback to POV character if no hotspot found
            topDialogue.innerHTML = `<strong>${povData.character}:</strong> ${povData.text}`;
        }
    }
    
    function findClosestHotspot(hotspots, targetPosition, characterName) {
        console.log('Finding hotspot for character:', characterName);
        
        // First try to find hotspot by character name
        for (const hotspot of hotspots) {
            const character = hotspot.getAttribute('data-character');
            console.log('Checking hotspot:', { character });
            
            if (character === characterName) {
                console.log('Found hotspot by character name:', character);
                return hotspot;
            }
        }
        
        // If no match by name, fall back to closest position
        console.log('No name match, falling back to closest position');
        const targetParts = targetPosition.split(' ').map(p => parseFloat(p));
        let closestHotspot = null;
        let minDistance = Infinity;
        
        hotspots.forEach(hotspot => {
            const position = hotspot.getAttribute('data-position');
            const character = hotspot.getAttribute('data-character');
            
            if (position) {
                const posParts = position.split(' ').map(p => parseFloat(p));
                const distance = Math.sqrt(
                    Math.pow(targetParts[0] - posParts[0], 2) +
                    Math.pow(targetParts[1] - posParts[1], 2) +
                    Math.pow(targetParts[2] - posParts[2], 2)
                );
                
                console.log('Distance for hotspot:', { character, distance });
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestHotspot = hotspot;
                }
            }
        });
        
        if (closestHotspot) {
            const character = closestHotspot.getAttribute('data-character');
            const position = closestHotspot.getAttribute('data-position');
            console.log('Found closest hotspot:', {
                character: character,
                position: position,
                distance: minDistance
            });
        }
        
        return closestHotspot;
    }
    
    function updateCameraPosition() {
        return new Promise((resolve, reject) => {
            console.log('=== Starting updateCameraPosition ===');
            const dialogue = dialogues?.[currentDialogueIndex];
            
            if (!dialogue) {
                console.log('No dialogue found for camera update');
                resolve();
                return;
            }
            
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('POV Data for camera:', povData);
            
            // Get the current camera position
            const currentOrbit = modelViewer.cameraOrbit;
            const currentTarget = modelViewer.cameraTarget;
            console.log('Current camera position:', { currentOrbit, currentTarget });
            
            // Parse the camera orbit string (format: "theta deg phi deg radius m")
            let cameraOrbit = povData.camera_orbit;
            if (cameraOrbit) {
                // Split into parts and ensure proper format
                const parts = cameraOrbit.split(' ');
                if (parts.length === 6) { // Should be "theta deg phi deg radius m"
                    const [theta, deg1, phi, deg2, radius, unit] = parts;
                    // Ensure the radius is a number and has the correct unit
                    const radiusValue = parseFloat(radius);
                    if (!isNaN(radiusValue)) {
                        // Convert radius to a zoom value (inverse relationship)
                        const zoomValue = 1 / radiusValue;
                        cameraOrbit = `${theta}${deg1} ${phi}${deg2} ${radiusValue}${unit}`;
                        console.log('Parsed camera orbit:', cameraOrbit, 'Zoom value:', zoomValue);
                        
                        // Set zoom level
                        if (povData.zoom_speed) {
                            modelViewer.zoomSpeed = povData.zoom_speed;
                        }
                        modelViewer.zoom = zoomValue;
                    } else {
                        console.error('Invalid radius value:', radius);
                    }
                } else {
                    console.error('Invalid camera orbit format:', cameraOrbit);
                }
            }
            
            // Parse the rotation string if it exists
            let rotation = "0deg 0deg 0deg";
            if (povData.rotation) {
                // Ensure the rotation string has the correct format
                const rotationParts = povData.rotation.split(' ');
                if (rotationParts.length === 3) {
                    rotation = povData.rotation;
                }
            }
            
            console.log('Setting camera position:', {
                cameraOrbit,
                cameraTarget: povData.camera_target,
                rotation
            });
            
            try {
                // Set camera position directly
                modelViewer.cameraOrbit = cameraOrbit;
                modelViewer.cameraTarget = povData.camera_target;
                modelViewer.rotation = rotation;
                
                // Update field of view if specified
                if (povData.field_of_view) {
                    modelViewer.fieldOfView = povData.field_of_view + "deg";
                }
                
                console.log('Camera position set');
                
                // Wait a short time for the camera to update
                setTimeout(() => {
                    console.log('Camera position updated, updating pointer');
                    // Update pointer after camera position is set
                    updatePointer().then(() => {
                        console.log('Pointer updated after camera position');
                        resolve();
                    }).catch(error => {
                        console.error('Error updating pointer:', error);
                        resolve();
                    });
                }, 100);
                
            } catch (error) {
                console.error('Error setting camera position:', error);
                resolve();
            }
        });
    }
    
    function updatePointer() {
        return new Promise((resolve, reject) => {
            console.log('=== Starting updatePointer ===');
            
            // Clear any existing timeouts
            if (window.pointerUpdateTimeout) {
                clearTimeout(window.pointerUpdateTimeout);
            }
            
            const svg = window.pointerSvg || document.getElementById('pointer-svg');
            const pointer = window.pointerPath || document.getElementById('pointer-path');
            
            if (!svg || !pointer) {
                console.log('SVG or pointer not found, reinitializing...');
                initPointerSystem();
                resolve();
                return;
            }
            
            const bubble = document.getElementById('top-bubble');
            if (!bubble) {
                console.error('Bubble element not found!');
                resolve();
                return;
            }
            
            // Get the model-viewer's dimensions
            const modelRect = modelViewer.getBoundingClientRect();
            
            // Update SVG viewBox to match model-viewer dimensions
            svg.setAttribute('viewBox', `0 0 ${modelRect.width} ${modelRect.height}`);
            
            const dialogue = dialogues?.[currentDialogueIndex];
            if (!dialogue) {
                console.log('No dialogue found');
                resolve();
                return;
            }
            
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            
            // Find the hotspot for this character
            const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
            const characterHotspot = Array.from(hotspots).find(hotspot => 
                hotspot.getAttribute('data-character') === povData.character
            );
            
            if (!characterHotspot) {
                console.log('No matching hotspot found for character:', povData.character);
                resolve();
                return;
            }
            
            // Get the text bubble position
            const bubbleRect = bubble.getBoundingClientRect();
            
            // Calculate bubble position relative to model-viewer
            const bubbleCenterX = bubbleRect.left - modelRect.left + (bubbleRect.width / 2);
            const bubbleBottomY = bubbleRect.top - modelRect.top + bubbleRect.height;
            
            // Wait for camera to settle before getting hotspot position
            window.pointerUpdateTimeout = setTimeout(() => {
                try {
                    // Get the hotspot's DOM position after camera has settled
                    const dot = characterHotspot.querySelector('.dot');
                    const dotRect = dot.getBoundingClientRect();
                    
                    // Use the dot's position
                    const screenPosition = {
                        x: dotRect.left - modelRect.left + (dotRect.width / 2),
                        y: dotRect.top - modelRect.top + (dotRect.height / 2)
                    };
                    
                    // Calculate control points for the curved line
                    const dx = screenPosition.x - bubbleCenterX;
                    const dy = screenPosition.y - bubbleBottomY;
                    
                    // Create a more pronounced curve
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const offset = distance * 0.3;
                    
                    // Calculate control point
                    const controlX = bubbleCenterX + dx * 0.5;
                    const controlY = bubbleBottomY + dy * 0.5 - offset;
                    
                    // Create the path data
                    const pathData = `M ${bubbleCenterX} ${bubbleBottomY} 
                                    Q ${controlX} ${controlY} ${screenPosition.x} ${screenPosition.y}`;
                    
                    // Update path attributes
                    pointer.setAttribute('d', pathData);
                    
                    // Set color based on character
                    let pointerColor = 'white';
                    switch(povData.character.toLowerCase()) {
                        case 'will':
                            pointerColor = '#ff0000';
                            break;
                        case 'nel':
                            pointerColor = '#0000ff';
                            break;
                        case 'ed':
                            pointerColor = '#00ff00';
                            break;
                        case 'sam':
                            pointerColor = '#ffff00';
                            break;
                    }
                    pointer.setAttribute('stroke', pointerColor);
                    
                    // Force a repaint
                    svg.style.display = 'none';
                    svg.offsetHeight; // Force reflow
                    svg.style.display = 'block';
                    
                } catch (error) {
                    console.error('Error updating pointer:', error);
                }
                
                resolve();
            }, 1000);
        });
    }
    
    function updateButtonStates() {
        console.log('Updating button states...');
        if (prevButton) {
            prevButton.disabled = currentDialogueIndex === 0;
            console.log('Previous button disabled:', prevButton.disabled);
        }
        if (nextButton) {
            nextButton.disabled = currentDialogueIndex === (dialogues?.length - 1);
            console.log('Next button disabled:', nextButton.disabled);
        }
    }
    
    // ================ NAVIGATION ================
    function nextDialogue() {
        console.log('=== Starting nextDialogue ===');
        if (currentDialogueIndex < (dialogues?.length - 1)) {
            currentDialogueIndex++;
            console.log('Incremented currentDialogueIndex to:', currentDialogueIndex);
            
            // Get the current dialogue
            const dialogue = dialogues[currentDialogueIndex];
            if (!dialogue) {
                console.error('No dialogue found for index:', currentDialogueIndex);
                return;
            }
            
            // Parse the POV data
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('Next dialogue POV data:', povData);
            
            // Find the hotspot for this character
            const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
            const characterHotspot = Array.from(hotspots).find(hotspot => 
                hotspot.getAttribute('data-character') === povData.character
            );
            
            if (characterHotspot) {
                console.log('Found hotspot for character:', povData.character);
                
                // Get the hotspot position
                const position = characterHotspot.getAttribute('data-position');
                console.log('Hotspot position:', position);
                
                // Update the camera target to the hotspot position
                modelViewer.setAttribute('camera-target', position);
                
                // Update the camera orbit to look at the hotspot
                const orbitParts = povData.camera_orbit.split(' ');
                const orbit = `${orbitParts[0]} ${orbitParts[1]} ${orbitParts[2]}`;
                modelViewer.setAttribute('camera-orbit', orbit);
                
                // Update the field of view
                modelViewer.setAttribute('field-of-view', povData.field_of_view);
                
                // Update rotation if provided
                if (povData.rotation) {
                    modelViewer.setAttribute('rotation', povData.rotation);
                }
                
                // Update dialogue content
                updateDialogueContent();
                
                // Wait for camera to settle before updating pointer
                setTimeout(() => {
                    updatePointer().then(() => {
                        updateButtonStates();
                    });
                }, 1000);
            } else {
                console.error('No hotspot found for character:', povData.character);
                // Fallback to normal update
                updateView();
            }
        }
    }
    
    function prevDialogue() {
        console.log('=== Starting prevDialogue ===');
        if (currentDialogueIndex > 0) {
            currentDialogueIndex--;
            console.log('Decremented currentDialogueIndex to:', currentDialogueIndex);
            
            // Get the current dialogue
            const dialogue = dialogues[currentDialogueIndex];
            if (!dialogue) {
                console.error('No dialogue found for index:', currentDialogueIndex);
                return;
            }
            
            // Parse the POV data
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('Previous dialogue POV data:', povData);
            
            // Find the hotspot for this character
            const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
            const characterHotspot = Array.from(hotspots).find(hotspot => 
                hotspot.getAttribute('data-character') === povData.character
            );
            
            if (characterHotspot) {
                console.log('Found hotspot for character:', povData.character);
                
                // Get the hotspot position
                const position = characterHotspot.getAttribute('data-position');
                console.log('Hotspot position:', position);
                
                // Update the camera target to the hotspot position
                modelViewer.setAttribute('camera-target', position);
                
                // Update the camera orbit to look at the hotspot
                const orbitParts = povData.camera_orbit.split(' ');
                const orbit = `${orbitParts[0]} ${orbitParts[1]} ${orbitParts[2]}`;
                modelViewer.setAttribute('camera-orbit', orbit);
                
                // Update the field of view
                modelViewer.setAttribute('field-of-view', povData.field_of_view);
                
                // Update rotation if provided
                if (povData.rotation) {
                    modelViewer.setAttribute('rotation', povData.rotation);
                }
                
                // Update dialogue content
                updateDialogueContent();
                
                // Wait for camera to settle before updating pointer
                setTimeout(() => {
                    updatePointer().then(() => {
                        updateButtonStates();
                    });
                }, 1000);
            } else {
                console.error('No hotspot found for character:', povData.character);
                // Fallback to normal update
                updateView();
            }
        } else {
            console.log('Already at first dialogue');
            updateButtonStates();
        }
    }
    
    // ================ START APPLICATION ================
    init();
}); 