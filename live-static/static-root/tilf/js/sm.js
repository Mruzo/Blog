// Global variables
let currentDialogueIndex = 0;
let dialogues = [];
let isUpdatingPointer = false;
let isAnimating = false;
let isModelReady = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    const modelViewer = document.getElementById('model-viewer');
    const topDialogue = document.getElementById('top-dialogue');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    if (!modelViewer || !topDialogue || !prevButton || !nextButton) {
        console.error('Required elements not found:', {
            modelViewer: !!modelViewer,
            topDialogue: !!topDialogue,
            prevButton: !!prevButton,
            nextButton: !!nextButton
        });
        return;
    }

    // Set model-viewer attributes
    modelViewer.setAttribute('interpolation-decay', '200');
    modelViewer.setAttribute('camera-controls', '');
    modelViewer.setAttribute('interpolation', 'cubic-bezier(0.3, 0.0, 0.7, 1.0)');
    modelViewer.setAttribute('min-camera-orbit', 'auto auto 1m');
    modelViewer.setAttribute('max-camera-orbit', 'auto auto 30m');
    modelViewer.setAttribute('min-field-of-view', '10deg');
    modelViewer.setAttribute('max-field-of-view', '90deg');

    // Create SVG container for pointer
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.id = 'pointer-svg';
    svgContainer.style.position = 'absolute';
    svgContainer.style.top = '0';
    svgContainer.style.left = '0';
    svgContainer.style.width = '100%';
    svgContainer.style.height = '100%';
    svgContainer.style.pointerEvents = 'none';
    svgContainer.style.zIndex = '1000';
    
    // Create pointer path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = 'pointer-path';
    path.setAttribute('stroke', 'black');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-dasharray', '5,5');
    path.setAttribute('stroke-linecap', 'round');
    path.style.display = 'none';
    svgContainer.appendChild(path);
    
    // Add SVG container to model-viewer
    modelViewer.appendChild(svgContainer);
    console.log('SVG container created and added to model-viewer');

    // Extract dialogues data
    document.querySelectorAll('.dialogue').forEach(dialogue => {
        try {
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('Found dialogue:', povData);
            dialogues.push(povData);
        } catch (error) {
            console.error('Error parsing dialogue data:', error);
        }
    });

    console.log('Extracted dialogues:', dialogues);

    // Wait for model to be ready
    modelViewer.addEventListener('load', () => {
        console.log('=== Model loaded, waiting for initialization ===', new Date().getTime());
        // Give a small delay for hotspots to be created
        setTimeout(() => {
            isModelReady = true;
            console.log('=== Model and hotspots ready ===', new Date().getTime());
            // Show initial dialogue
            showDialogue();
        }, 1000);
    });

    function showDialogue() {
        if (!isModelReady) {
            console.log('Model not ready yet, skipping dialogue');
            return;
        }

        console.log('=== Starting showDialogue ===', new Date().getTime());
        console.log('Current dialogue index:', currentDialogueIndex);
        const currentDialogue = dialogues[currentDialogueIndex];
        
        if (currentDialogue) {
            console.log('Current dialogue:', currentDialogue);
            
            // Reset flags
            isUpdatingPointer = false;
            isAnimating = true;
            
            // Hide pointer during camera movement
            const path = document.getElementById('pointer-path');
            if (path) {
                console.log('Hiding pointer path');
                path.style.display = 'none';
            }
            
            // Update dialogue text - keep original styling
            topDialogue.innerHTML = `<strong>${currentDialogue.character}:</strong> ${currentDialogue.text}`;
            
            // Parse camera orbit and target
            const orbit = currentDialogue.camera_orbit.split(' ');
            const target = currentDialogue.camera_target.split(' ');
            
            console.log('Camera settings:', {
                orbit: orbit.join(' '),
                target: target.join(' '),
                fieldOfView: currentDialogue.field_of_view
            });
            
            // Animate camera position using model-viewer's animation system
            modelViewer.animate({
                cameraOrbit: orbit.join(' '),
                cameraTarget: target.join(' '),
                fieldOfView: currentDialogue.field_of_view + "deg"
            }, {
                duration: 1000,
                easing: 'ease-in-out'
            });
            
            // Update navigation buttons
            prevButton.disabled = currentDialogueIndex === 0;
            nextButton.disabled = currentDialogueIndex === dialogues.length - 1;
            
            console.log('=== Finished showDialogue ===', new Date().getTime());
        } else {
            console.error('No dialogue found for current index');
        }
    }

    // Listen for animation start
    modelViewer.addEventListener('animation-start', () => {
        console.log('=== Animation started ===', new Date().getTime());
        isAnimating = true;
        const path = document.getElementById('pointer-path');
        if (path) {
            path.style.display = 'none';
        }
    });

    // Listen for animation end
    modelViewer.addEventListener('animation-end', () => {
        console.log('=== Animation ended ===', new Date().getTime());
        isAnimating = false;
        if (!isUpdatingPointer && isModelReady) {
            isUpdatingPointer = true;
            updatePointer();
        }
    });

    // Keep camera-change as a backup
    modelViewer.addEventListener('camera-change', () => {
        if (!isAnimating && !isUpdatingPointer && isModelReady) {
            console.log('=== Camera changed (no animation) ===', new Date().getTime());
            isUpdatingPointer = true;
            updatePointer();
        }
    });

    function updatePointer() {
        if (!isModelReady) {
            console.log('Model not ready yet, skipping pointer update');
            isUpdatingPointer = false;
            return;
        }

        console.log('=== Starting updatePointer ===', new Date().getTime());
        const currentDialogue = dialogues[currentDialogueIndex];
        
        if (!currentDialogue) {
            console.log('No dialogue found');
            isUpdatingPointer = false;
            return;
        }
        
        // Extract base character name (remove numbers)
        const baseCharacterName = currentDialogue.character.replace(/\s*\d+$/, '');
        console.log('Updating pointer for character:', baseCharacterName);
        
        // Find the hotspot using model-viewer's native syntax
        const hotspot = modelViewer.querySelector(`[slot="hotspot-${baseCharacterName}"]`);
        
        if (!hotspot) {
            console.log('No hotspot found for character:', baseCharacterName);
            const path = document.getElementById('pointer-path');
            if (path) {
                path.style.display = 'none';
            }
            isUpdatingPointer = false;
            return;
        }

        // Get positions
        const topBubble = document.getElementById('top-bubble');
        const bubbleRect = topBubble.getBoundingClientRect();
        const hotspotRect = hotspot.getBoundingClientRect();
        const modelRect = modelViewer.getBoundingClientRect();
        
        console.log('Element positions:', {
            bubble: {
                top: bubbleRect.top,
                bottom: bubbleRect.bottom,
                height: bubbleRect.height
            },
            hotspot: {
                top: hotspotRect.top,
                bottom: hotspotRect.bottom,
                height: hotspotRect.height
            },
            model: {
                top: modelRect.top,
                bottom: modelRect.bottom,
                height: modelRect.height
            }
        });
        
        // Calculate endpoints relative to model-viewer
        const bubbleCenterX = bubbleRect.left - modelRect.left + (bubbleRect.width / 2);
        const bubbleBottomY = bubbleRect.bottom - modelRect.top;
        const hotspotCenterX = hotspotRect.left - modelRect.left + (hotspotRect.width / 2);
        const hotspotCenterY = hotspotRect.top - modelRect.top + (hotspotRect.height / 2);
        
        // Calculate line geometry
        const dx = hotspotCenterX - bubbleCenterX;
        const dy = hotspotCenterY - bubbleBottomY;
        
        // Create a more pronounced curve by offsetting the control point
        const distance = Math.sqrt(dx * dx + dy * dy);
        const offset = distance * 0.3; // Adjust this value to control curve amount
        
        // Calculate control point that's perpendicular to the line
        const controlX = bubbleCenterX + dx * 0.5;
        const controlY = bubbleBottomY + dy * 0.5 - offset;
        
        // Create the path data for a curved line using quadratic Bezier curve
        const pathData = `M ${bubbleCenterX} ${bubbleBottomY} 
                        Q ${controlX} ${controlY} ${hotspotCenterX} ${hotspotCenterY}`;
        
        console.log('Creating path with data:', pathData);
        
        // Get or create path element
        let path = document.getElementById('pointer-path');
        if (!path) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.id = 'pointer-path';
            svgContainer.appendChild(path);
        }
        
        // Update path
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', 'black');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('stroke-linecap', 'round');
        path.style.display = 'block';

        console.log('=== Finished updatePointer ===', new Date().getTime());
        isUpdatingPointer = false;
    }

    // Add event listeners for navigation buttons
    prevButton.addEventListener('click', () => {
        if (currentDialogueIndex > 0) {
            currentDialogueIndex--;
            showDialogue();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentDialogueIndex < dialogues.length - 1) {
            currentDialogueIndex++;
            showDialogue();
        }
    });
}); 