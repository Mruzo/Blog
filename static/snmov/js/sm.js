import * as THREE from "three";

$(document).ready(function(){
  // Enable Bootstrap dropdown functionality
  $('.dropdown-toggle').dropdown();
});


//scroll animation
$(window).scroll(function(){
    var scroll = $(window).scrollTop(),
    dh = $(document).height(),
    wh = $(window).height();
    scrollPercent = (scroll / (dh-wh)) * 100;
    $('#progressbar').css('height', scrollPercent + '%');
});

var scroll = window.requestAnimationFrame ||
            function(callback){ window.setTimeout(callback, 1000/60)};

var elementsToShow = document.querySelectorAll('.show-on-scroll');

function loop() {
    elementsToShow.forEach(function (element) {
        if (isElementInViewport(element)) {
            element.classList.add('is-visible');
        }else{
            element.classList.remove('is-visible');
        }
    });

    scroll(loop);
}

loop();

//helper function
function isElementInViewport(el) {
    //check to see if jquery is defined
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }
    //rectangle around the element we want to check
    var rect = el.getBoundingClientRect();
    //returns True if element is on the page and on the screen
    return (
        (rect.top <= 0 && rect.bottom >= 0)
        ||
        (rect.bottom >= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight))
        ||
        (rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight))
    );
}


window.LLOS = window.LLOS || {};
if($('#home-animation-wrapper').length){
  window.LLOS.TextSlider = new TextSlider();
}

function loadContent(url, button = null) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      document.getElementById('content').innerHTML = html;
      // Remove active class from all buttons
      document.querySelectorAll('.neumorphic').forEach(btn => {
        btn.classList.remove('active');
      });
      // Add active class to clicked button if present
      if (button) {
        button.classList.add('active');
      } else {
        // Automatically add active class to the Persona button if button is not provided
        const personaButton = document.querySelector('[href*="#about"]');
        if (personaButton) {
          personaButton.classList.add('active');
        }
      }
      window.scrollTo(0, 0);
      initCarousel();
    })
    .catch(error => {
      console.error('Error fetching content:', error);
    });
}

function initCarousel() {
  var carousels = document.querySelectorAll('.carousel');

  // Iterate over each carousel and manually initialize it
  carousels.forEach(function(carousel) {
    var slides = carousel.querySelectorAll('.carousel-item');
    var activeIndex = 0; // Index of the initially active slide

    // Make the first slide active initially
    slides[activeIndex].classList.add('active');

    // Set up event listeners for next and previous buttons
    var nextButton = carousel.querySelector('.carousel-control-next');
    var prevButton = carousel.querySelector('.carousel-control-prev');

    nextButton.addEventListener('click', function() {
      event.preventDefault(); // Prevent the default behavior (e.g., scrolling)
      // Hide the currently active slide
      slides[activeIndex].classList.remove('active');
      // Increment the active index (looping back to 0 if necessary)
      activeIndex = (activeIndex + 1) % slides.length;
      // Show the next slide
      slides[activeIndex].classList.add('active');
    });

    prevButton.addEventListener('click', function() {
      event.preventDefault(); // Prevent the default behavior (e.g., scrolling)
      // Hide the currently active slide
      slides[activeIndex].classList.remove('active');
      // Decrement the active index (looping to the last index if necessary)
      activeIndex = (activeIndex - 1 + slides.length) % slides.length;
      // Show the previous slide
      slides[activeIndex].classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('user-form');

  if (form) {
      form.addEventListener('submit', function(event) {
          event.preventDefault(); // Prevent default form submission

          const formData = new FormData(form); // Create FormData object

          fetch(form.action, {
              method: 'POST',
              body: formData,
              headers: {
                  'X-Requested-With': 'XMLHttpRequest',
              },
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  // Hide form and show success message
                  form.style.display = 'none';
                  showMessage('success', data.message);
              } else {
                  // Show error message
                  showMessage('error', data.message);
              }
          })
          .catch(error => {
              console.error('Error submitting form:', error);
              showMessage('error', 'There was an error submitting the form.');
          });
      });
  } else {
      console.error('Form element not found.');
  }
});

function showMessage(type, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `alert alert-${type}`;
  messageDiv.innerText = message;

  const feedbackMessageContainer = document.getElementById('feedback-message');
  feedbackMessageContainer.innerHTML = ''; // Clear previous messages
  feedbackMessageContainer.appendChild(messageDiv);

  setTimeout(() => {
      messageDiv.remove(); // Remove message after 5 seconds
  }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // ================ DOM ELEMENTS ================
    const modelViewer = document.querySelector('model-viewer');
    const topBubble = document.getElementById('top-bubble');
    const topDialogue = document.getElementById('top-dialogue');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const sceneElements = document.querySelectorAll('.scene');
    
    console.log('Found elements:', {
        modelViewer: !!modelViewer,
        topBubble: !!topBubble,
        topDialogue: !!topDialogue,
        prevButton: !!prevButton,
        nextButton: !!nextButton,
        sceneElements: sceneElements.length
    });
    
    // ================ STATE ================
    let currentSceneIndex = 0;
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
        
        // Set camera orbit limits
        modelViewer.setAttribute('min-camera-orbit', 'auto auto 1m');
        modelViewer.setAttribute('max-camera-orbit', 'auto auto 30m');
        
        // Initialize with first dialogue
        currentSceneIndex = 0;
        currentDialogueIndex = 0;
        
        initPointerSystem();
        setupEventListeners();
        updateView();
    }
    
    function initPointerSystem() {
        console.log('Initializing pointer system...');
        
        // Remove existing SVG if it exists
        const existingSvg = document.getElementById('pointer-svg');
        if (existingSvg) {
            existingSvg.remove();
        }
        
        // Create new SVG container
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'pointer-svg';
        
        // Get model-viewer dimensions
        const modelRect = modelViewer.getBoundingClientRect();
        
        // Set SVG properties
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '9999',
            overflow: 'visible'
        });
        
        // Set initial viewBox
        svg.setAttribute('viewBox', `0 0 ${modelRect.width} ${modelRect.height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        
        // Create initial path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = 'pointer-path';
        path.setAttribute('stroke', 'black');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
        
        // Add SVG to model-viewer
        modelViewer.appendChild(svg);
        console.log('SVG container created and added to model-viewer with viewBox:', svg.getAttribute('viewBox'));
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
            modelViewer.addEventListener('load', () => {
                console.log('Model viewer loaded');
                updateView();
            });
            
            modelViewer.addEventListener('camera-change', () => {
                console.log('Camera changed');
                updatePointer();
            });
            
            // Add resize observer
            const resizeObserver = new ResizeObserver(() => {
                console.log('Model viewer resized');
                setTimeout(updatePointer, 100);
            });
            resizeObserver.observe(modelViewer);
        }
    }
    
    function updateView() {
        // Update dialogue content first
        updateDialogueContent();
        
        // Start both animations at the same time
        const cameraPromise = updateCameraPosition();
        const pointerPromise = updatePointer();
        
        // Wait for both to complete before updating button states
        Promise.all([cameraPromise, pointerPromise])
            .then(() => {
                updateButtonStates();
            })
            .catch(error => {
                console.error('Error updating view:', error);
                updateButtonStates();
            });
    }
    
    function updateDialogueContent() {
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        const dialogue = dialogues?.[currentDialogueIndex];
        
        if (!dialogue) {
            console.error('No dialogue found for current scene/dialogue index');
            return;
        }
        
        const povData = JSON.parse(dialogue.getAttribute('data-pov'));
        console.log('Updating dialogue content with POV data:', povData);
        
        // Find the hotspot that matches the camera target
        const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        const closestHotspot = findClosestHotspot(hotspots, povData.camera_target, povData.character);
        
        if (closestHotspot) {
            const position = closestHotspot.getAttribute('data-position');
            const hotspotName = HOTSPOT_NAMES[position];
            // Use the hotspot's name in the text bubble
            topDialogue.innerHTML = `<strong>${hotspotName}:</strong> ${dialogue.querySelector('p').textContent}`;
        } else {
            // Fallback to POV character if no hotspot found
            topDialogue.innerHTML = `<strong>${povData.character}:</strong> ${dialogue.querySelector('p').textContent}`;
        }
    }
    
    // Function to parse camera orbit string into components
    function parseOrbit(orbitString) {
        if (!orbitString) return { theta: 0, phi: 75, radius: 3 };
        const [theta, phi, radius] = orbitString.split(' ').map(part => parseFloat(part));
        return { theta, phi, radius };
    }

    // Function to create a camera orbit string from components
    function createOrbitString(theta, phi, radius) {
        return `${theta}deg ${phi}deg ${radius}m`;
    }

    // Function to animate camera movement
    function animateCamera(modelViewer, startOrbit, endOrbit, startTarget, endTarget, duration = 1000) {
        // Set initial position
        modelViewer.cameraOrbit = startOrbit;
        modelViewer.cameraTarget = startTarget;

        // Animate to end position
        modelViewer.animate({
            cameraOrbit: endOrbit,
            cameraTarget: endTarget
        }, {
            duration: duration,
            easing: 'ease-in-out'
        });
    }

    // Function to create a dolly-like effect
    function dollyShot(modelViewer, startOrbit, endOrbit, duration = 1000) {
        const start = parseOrbit(startOrbit);
        const end = parseOrbit(endOrbit);
        
        // Keep the same angle, just change the distance
        const orbit = createOrbitString(start.theta, start.phi, end.radius);
        
        modelViewer.animate({
            cameraOrbit: orbit
        }, {
            duration: duration,
            easing: 'ease-in-out'
        });
    }

    // Function to create a pan-like effect
    function panShot(modelViewer, startOrbit, endOrbit, duration = 1000) {
        const start = parseOrbit(startOrbit);
        const end = parseOrbit(endOrbit);
        
        // Keep the same distance, just change the angle
        const orbit = createOrbitString(end.theta, start.phi, start.radius);
        
        modelViewer.animate({
            cameraOrbit: orbit
        }, {
            duration: duration,
            easing: 'ease-in-out'
        });
    }

    // Function to create a tilt-like effect
    function tiltShot(modelViewer, startOrbit, endOrbit, duration = 1000) {
        const start = parseOrbit(startOrbit);
        const end = parseOrbit(endOrbit);
        
        // Keep the same distance and horizontal angle, just change the vertical angle
        const orbit = createOrbitString(start.theta, end.phi, start.radius);
        
        modelViewer.animate({
            cameraOrbit: orbit
        }, {
            duration: duration,
            easing: 'ease-in-out'
        });
    }

    function updateCameraPosition() {
        return new Promise((resolve, reject) => {
            const currentScene = sceneElements[currentSceneIndex];
            const dialogues = currentScene?.querySelectorAll('.dialogue');
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
            
            // Set initial position
            modelViewer.cameraOrbit = currentOrbit;
            modelViewer.cameraTarget = currentTarget;
            
            console.log('Starting camera animation with:', {
                cameraOrbit,
                cameraTarget: povData.camera_target,
                rotation
            });
            
            // Animate to the new camera position
            const animation = modelViewer.animate({
                cameraOrbit: cameraOrbit,
                cameraTarget: povData.camera_target,
                rotation: rotation
            }, {
                duration: 2  // Duration in seconds (not milliseconds)
            });
            
            // Add event listeners for the animation
            animation.addEventListener('finish', () => {
                console.log('Camera animation finished');
                // Ensure final values are set
                modelViewer.cameraOrbit = cameraOrbit;
                modelViewer.cameraTarget = povData.camera_target;
                modelViewer.rotation = rotation;
                resolve();
            });
            
            // Update field of view if specified
            if (povData.field_of_view) {
                modelViewer.fieldOfView = povData.field_of_view + "deg";
            }
        });
    }

    // Add hotspot name mapping at the top of the file
    const HOTSPOT_NAMES = {
        "2m 2.5m 4.5m": "Will",  // Red dot
        "-4.5m 2.5m 2.6m": "Nel",  // Blue dot
        "-2.5m 2.71m -4.5m": "Ed",  // Green dot
        "4.5m 2.71m -2.6m": "Sam"   // Yellow dot
    };

    function findClosestHotspot(hotspots, targetPosition, characterName) {
        console.log('Finding hotspot for character:', characterName);
        
        // First try to find hotspot by character name
        for (const hotspot of hotspots) {
            const position = hotspot.getAttribute('data-position');
            const mappedName = HOTSPOT_NAMES[position];
            console.log('Checking hotspot:', { position, mappedName });
            
            if (mappedName === characterName) {
                console.log('Found hotspot by character name:', mappedName);
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
            const mappedName = HOTSPOT_NAMES[position];
            
            if (position) {
                const posParts = position.split(' ').map(p => parseFloat(p));
                const distance = Math.sqrt(
                    Math.pow(targetParts[0] - posParts[0], 2) +
                    Math.pow(targetParts[1] - posParts[1], 2) +
                    Math.pow(targetParts[2] - posParts[2], 2)
                );
                
                console.log('Distance for hotspot:', { mappedName, distance });
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestHotspot = hotspot;
                }
            }
        });
        
        if (closestHotspot) {
            const position = closestHotspot.getAttribute('data-position');
            console.log('Found closest hotspot:', {
                name: HOTSPOT_NAMES[position],
                position: position,
                distance: minDistance
            });
        }
        
        return closestHotspot;
    }
    
    function updatePointer() {
        return new Promise((resolve, reject) => {
            console.log('=== Starting updatePointer ===');
            
            const svg = document.getElementById('pointer-svg');
            const pointer = document.getElementById('pointer-path');
            
            if (!svg || !pointer) {
                console.log('SVG or pointer not found, reinitializing...');
                initPointerSystem();
                resolve();
                return;
            }
            
            console.log('SVG and pointer elements found');
            
            // Get the model-viewer's dimensions
            const modelRect = modelViewer.getBoundingClientRect();
            console.log('Model viewer rect:', modelRect);
            
            // Update SVG viewBox to match model-viewer dimensions
            svg.setAttribute('viewBox', `0 0 ${modelRect.width} ${modelRect.height}`);
            
            // Log SVG properties
            console.log('SVG properties:', {
                width: svg.style.width,
                height: svg.style.height,
                position: svg.style.position,
                zIndex: svg.style.zIndex,
                viewBox: svg.getAttribute('viewBox'),
                overflow: svg.style.overflow
            });
            
            const currentScene = sceneElements[currentSceneIndex];
            const dialogues = currentScene?.querySelectorAll('.dialogue');
            const dialogue = dialogues?.[currentDialogueIndex];
            
            if (!dialogue) {
                console.log('No dialogue found');
                resolve();
                return;
            }
            
            console.log('Dialogue found:', dialogue);
            
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('POV data:', povData);
            
            const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
            console.log('Found hotspots:', hotspots.length);
            
            // Log all hotspot positions and mapped names
            hotspots.forEach((hotspot, index) => {
                const position = hotspot.getAttribute('data-position');
                console.log(`Hotspot ${index}:`, {
                    position: position,
                    name: HOTSPOT_NAMES[position]
                });
            });
            
            // Find closest hotspot by character name
            let closestHotspot = findClosestHotspot(hotspots, povData.camera_target, povData.character);
            if (!closestHotspot) {
                console.log('No matching hotspot found for character:', povData.character);
                resolve();
                return;
            }
            
            const hotspotPosition = closestHotspot.getAttribute('data-position');
            console.log('Closest hotspot found:', {
                name: HOTSPOT_NAMES[hotspotPosition],
                position: hotspotPosition
            });
            
            // Get the text bubble position
            const bubbleRect = topBubble.getBoundingClientRect();
            console.log('Bubble rect:', bubbleRect);
            
            // Calculate bubble position relative to model-viewer
            const bubbleCenterX = bubbleRect.left - modelRect.left + (bubbleRect.width / 2);
            const bubbleBottomY = bubbleRect.bottom - modelRect.top;
            
            console.log('Calculated bubble position:', { bubbleCenterX, bubbleBottomY });
            
            // Get the hotspot's position in the DOM
            const hotspotRect = closestHotspot.getBoundingClientRect();
            const screenPosition = {
                x: hotspotRect.left - modelRect.left + (hotspotRect.width / 2),
                y: hotspotRect.top - modelRect.top + (hotspotRect.height / 2)
            };
            
            console.log('Hotspot screen position:', screenPosition);
            
            try {
                // Calculate control points for the curved line
                const dx = screenPosition.x - bubbleCenterX;
                const dy = screenPosition.y - bubbleBottomY;
                
                // Create a more pronounced curve by offsetting the control point
                const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5; // Use 50% of the smaller distance
                const controlX = bubbleCenterX + dx * 0.5;
                const controlY = bubbleBottomY + dy * 0.5 + offset; // Add offset to create more curve
                
                // Create the path data for a curved line
                const pathData = `M ${bubbleCenterX} ${bubbleBottomY} 
                                Q ${controlX} ${controlY} ${screenPosition.x} ${screenPosition.y}`;
                
                // Create a new path element
                const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                newPath.id = 'pointer-path';
                newPath.setAttribute('d', pathData);
                newPath.setAttribute('stroke', 'black');
                newPath.setAttribute('stroke-width', '3');
                newPath.setAttribute('fill', 'none');
                
                // Remove old path and add new one
                const oldPath = document.getElementById('pointer-path');
                if (oldPath) {
                    oldPath.remove();
                    console.log('Old path removed');
                }
                
                svg.appendChild(newPath);
                console.log('New path added to SVG');
                
                // Log final path properties
                console.log('Path properties:', {
                    d: newPath.getAttribute('d'),
                    stroke: newPath.getAttribute('stroke'),
                    strokeWidth: newPath.getAttribute('stroke-width'),
                    fill: newPath.getAttribute('fill')
                });
                
                // Force a repaint of the SVG
                svg.style.display = 'none';
                svg.offsetHeight; // Force reflow
                svg.style.display = 'block';
                
                console.log('SVG repainted');
                
            } catch (error) {
                console.error('Error creating/updating path:', error);
            }
            
            console.log('=== Finished updatePointer ===');
            resolve();
        });
    }
    
    function updateButtonStates() {
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        
        if (prevButton) {
            prevButton.disabled = currentDialogueIndex === 0 && currentSceneIndex === 0;
        }
        if (nextButton) {
            nextButton.disabled = currentDialogueIndex === dialogues?.length - 1 && 
                                currentSceneIndex === sceneElements.length - 1;
        }
    }
    
    // ================ NAVIGATION ================
    function nextDialogue() {
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        
        currentDialogueIndex++;
        if (currentDialogueIndex >= dialogues?.length) {
            currentDialogueIndex = 0;
            currentSceneIndex = (currentSceneIndex + 1) % sceneElements.length;
        }
        updateView();
    }
    
    function prevDialogue() {
        currentDialogueIndex--;
        if (currentDialogueIndex < 0) {
            currentSceneIndex = (currentSceneIndex - 1 + sceneElements.length) % sceneElements.length;
            const dialogues = sceneElements[currentSceneIndex]?.querySelectorAll('.dialogue');
            currentDialogueIndex = dialogues?.length - 1 || 0;
        }
        updateView();
    }
    
    // ================ START APPLICATION ================
    init();
});

// Add a function to check if a point is within the model-viewer
function isPointInModelViewer(x, y) {
    const modelViewer = document.querySelector('model-viewer');
    const rect = modelViewer.getBoundingClientRect();
    return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
    );
}

// Add a function to check if coordinates are within bounds
function areCoordinatesValid(x, y, width, height) {
    return x >= 0 && x <= width && y >= 0 && y <= height;
}

// Function to show the current scene
function showScene(index) {
    sceneElements.forEach((scene, i) => {
        scene.style.display = i === index ? 'block' : 'none';
    });

    // Enable/disable navigation buttons
    prevButton.disabled = index === 0;
    nextButton.disabled = index === sceneElements.length - 1;

    // Update the 3D model and pointers for the current scene
    const dialogues = sceneElements[index].querySelectorAll('.dialogue');
    if (dialogues.length > 0) {
        const pov = JSON.parse(dialogues[0].dataset.pov);
        if (modelViewer && pov) {
            // Use the animation system instead of direct assignment
            modelViewer.animate({
                cameraOrbit: pov.camera_orbit,
                cameraTarget: pov.camera_target,
                rotation: pov.rotation
            }, {
                duration: 1000,
                easing: 'ease-in-out'
            });

            // Update field of view and zoom speed
            if (pov.field_of_view) {
                modelViewer.fieldOfView = pov.field_of_view + "deg";
            }
            if (pov.zoom_speed) {
                modelViewer.zoomSpeed = pov.zoom_speed;
            }

            // Update the top pointer
            updatePointer(topPointer, pov.head_x, pov.head_y, pov.head_z);
        }

        // Update the top speech bubble
        if (dialogues[0]) {
            const dialogueContent = dialogues[0].querySelector('.card-text').cloneNode(true);
            topDialogue.innerHTML = '';
            topDialogue.appendChild(dialogueContent);
        }

        // Update the bottom speech bubble and pointer
        if (dialogues[1]) {
            const dialogueContent = dialogues[1].querySelector('.card-text').cloneNode(true);
            bottomDialogue.innerHTML = '';
            bottomDialogue.appendChild(dialogueContent);

            const povBottom = JSON.parse(dialogues[1].dataset.pov);
            updatePointer(bottomPointer, povBottom.head_x, povBottom.head_y, povBottom.head_z);
        }
    }
}

// Event listeners for navigation buttons
prevButton.addEventListener('click', () => {
    if (currentSceneIndex > 0) {
        currentSceneIndex--;
        showScene(currentSceneIndex);
    }
});

nextButton.addEventListener('click', () => {
    if (currentSceneIndex < sceneElements.length - 1) {
        currentSceneIndex++;
        showScene(currentSceneIndex);
    }
});

// Initialize the first scene
showScene(currentSceneIndex);

// Update pointers on camera change
modelViewer.addEventListener('camera-change', () => {
    const currentScene = document.querySelector('.scene[style*="block"]');
    const dialogues = currentScene.querySelectorAll('.dialogue');
    if (dialogues.length > 0) {
        const topPov = JSON.parse(dialogues[0].dataset.pov);
        updatePointer(topPointer, topPov.head_x, topPov.head_y, topPov.head_z);
        if (dialogues[1]) {
            const bottomPov = JSON.parse(dialogues[1].dataset.pov);
            updatePointer(bottomPointer, bottomPov.head_x, bottomPov.head_y, bottomPov.head_z);
        }
    }
});

