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
    const startButton = document.getElementById('startButton');
    const coverSection = document.getElementById('cover-section');
    const modelSection = document.getElementById('model-section');
    
    console.log('Found elements:', {
        modelViewer: !!modelViewer,
        topBubble: !!topBubble,
        topDialogue: !!topDialogue,
        prevButton: !!prevButton,
        nextButton: !!nextButton,
        sceneElements: sceneElements.length,
        startButton: !!startButton,
        coverSection: !!coverSection,
        modelSection: !!modelSection
    });
    
    // ================ STATE ================
    let currentSceneIndex = 0;
    let currentDialogueIndex = 0;
    let isStarted = false;
    
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
        currentSceneIndex = 0;
        currentDialogueIndex = 0;
        
        // Set up start button handler
        if (startButton) {
            startButton.addEventListener('click', startEpisode);
        }
        
        // Wait for model to be fully loaded
        if (modelViewer.loaded) {
            console.log('Model already loaded, initializing...');
            initPointerSystem();
            updateHotspots();
            setupEventListeners();
        } else {
            console.log('Waiting for model to load...');
            modelViewer.addEventListener('load', () => {
                console.log('Model loaded, initializing...');
                initPointerSystem();
                updateHotspots();
                setupEventListeners();
            });
        }
    }
    
    function startEpisode() {
        if (!isStarted) {
            isStarted = true;
            coverSection.style.display = 'none';
            modelSection.style.display = 'block';
            // Add a small delay before first view update
            setTimeout(updateView, 100);
        }
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
        console.log('SVG container created and added to model-viewer');
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
        
        // Update hotspots before starting animations
        updateHotspots();
        
        // Hide pointer during camera movement
        const oldPath = document.getElementById('pointer-path');
        if (oldPath) {
            oldPath.remove();
        }
        
        // Get current POV data
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        const dialogue = dialogues?.[currentDialogueIndex];
        
        if (!dialogue) {
            console.error('No dialogue found for current scene/dialogue index');
            return;
        }
        
        const povData = JSON.parse(dialogue.getAttribute('data-pov'));
        console.log('Starting animations with POV data:', povData);
        
        // Set camera values directly
        modelViewer.cameraOrbit = povData.camera_orbit;
        modelViewer.cameraTarget = povData.camera_target;
        if (povData.rotation) {
            modelViewer.rotation = povData.rotation;
        }
        if (povData.field_of_view) {
            modelViewer.fieldOfView = povData.field_of_view;
        }
        if (povData.zoom_speed) {
            modelViewer.zoomSpeed = povData.zoom_speed;
        }
        
        // Wait for camera animation to complete before updating pointer
        let animationComplete = false;
        const checkAnimation = () => {
            if (!animationComplete) {
                const currentOrbit = modelViewer.cameraOrbit;
                const currentTarget = modelViewer.cameraTarget;
                
                if (currentOrbit === povData.camera_orbit && 
                    currentTarget === povData.camera_target) {
                    console.log('Camera animation complete');
                    animationComplete = true;
                    // Add a small delay before drawing the pointer
                    setTimeout(updatePointer, 50);
                } else {
                    setTimeout(checkAnimation, 50);
                }
            }
        };
        
        // Start checking for animation completion
        setTimeout(checkAnimation, 100);
        
        // Update button states after a delay
        setTimeout(() => {
            updateButtonStates();
        }, 1000);
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
        console.log('POV data:', povData);
        
        // Get the dialogue text
        const dialogueText = dialogue.querySelector('p').textContent;
        
        // Find the hotspot for this character
        const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        const characterHotspot = Array.from(hotspots).find(hotspot => 
            hotspot.getAttribute('data-character') === povData.character
        );
        
        if (characterHotspot) {
            // Get the hotspot position
            const position = characterHotspot.getAttribute('data-position');
            console.log('Found hotspot for character:', {
                character: povData.character,
                position: position
            });
            
            // Use the character name in the text bubble
            topDialogue.innerHTML = `<strong>${povData.character}:</strong> ${dialogueText}`;
            
            // Log camera updates
            console.log('Updating camera:', {
                orbit: povData.camera_orbit,
                target: povData.camera_target,
                rotation: povData.rotation
            });
        } else {
            console.error('No hotspot found for character:', povData.character);
            // Fallback to using the POV data directly
            topDialogue.innerHTML = `<strong>${povData.character}:</strong> ${dialogueText}`;
        }
    }

    // Add hotspot name mapping at the top of the file
    const HOTSPOT_NAMES = {
        "2m 2.4m 4.6m": "Will",  // Red dot
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
    
    function updateCameraPosition() {
        return new Promise((resolve, reject) => {
            const currentScene = sceneElements[currentSceneIndex];
            const dialogues = currentScene?.querySelectorAll('.dialogue');
            const dialogue = dialogues?.[currentDialogueIndex];
            
            if (!dialogue) {
                console.error('No dialogue found for current scene/dialogue index');
                reject('No dialogue found');
                return;
            }
            
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('Updating camera with POV data:', povData);
            
            // Use the animation system for all camera changes
            const animation = modelViewer.animate({
                cameraOrbit: povData.camera_orbit,
                cameraTarget: povData.camera_target,
                rotation: povData.rotation || modelViewer.rotation,
                fieldOfView: povData.field_of_view || modelViewer.fieldOfView,
                zoomSpeed: povData.zoom_speed || modelViewer.zoomSpeed
            }, {
                duration: 1000,
                easing: 'ease-in-out',
                fill: 'forwards'
            });
            
            // Wait for animation to complete
            animation.onfinish = () => {
                console.log('Camera animation complete');
                resolve();
            };
        });
    }

    function updatePointer() {
        return new Promise((resolve, reject) => {
            console.log('=== Starting updatePointer ===');
            
            // Clear any existing timeouts
            if (window.pointerUpdateTimeout) {
                clearTimeout(window.pointerUpdateTimeout);
            }
            
            const svg = document.getElementById('pointer-svg');
            if (!svg) {
                console.log('SVG not found, reinitializing...');
                initPointerSystem();
            }
            
            const currentScene = sceneElements[currentSceneIndex];
            const dialogues = currentScene?.querySelectorAll('.dialogue');
            const dialogue = dialogues?.[currentDialogueIndex];
            
            if (!dialogue) {
                console.log('No dialogue found');
                resolve();
                return;
            }
            
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            console.log('POV data for pointer:', povData);
            
            // Find all hotspots
            const hotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
            console.log('All hotspots:', Array.from(hotspots).map(h => ({
                slot: h.getAttribute('slot'),
                character: h.getAttribute('data-character'),
                position: h.getAttribute('data-position')
            })));
            
            // Find the hotspot for this character
            const characterHotspot = Array.from(hotspots).find(hotspot => {
                const hotspotCharacter = hotspot.getAttribute('data-character');
                const targetCharacter = povData.character;
                console.log('Checking hotspot:', {
                    hotspotCharacter,
                    targetCharacter,
                    matches: hotspotCharacter === targetCharacter,
                    exactMatch: hotspotCharacter === targetCharacter
                });
                return hotspotCharacter === targetCharacter;
            });
            
            if (!characterHotspot) {
                console.log('No matching hotspot found for character:', povData.character);
                resolve();
                return;
            }
            
            console.log('Found matching hotspot:', {
                character: characterHotspot.getAttribute('data-character'),
                position: characterHotspot.getAttribute('data-position'),
                povCharacter: povData.character
            });
            
            // Get the text bubble position
            const bubbleRect = topBubble.getBoundingClientRect();
            const modelRect = modelViewer.getBoundingClientRect();
            
            // Calculate bubble position relative to model-viewer
            const bubbleCenterX = bubbleRect.left - modelRect.left + (bubbleRect.width / 2);
            const bubbleBottomY = bubbleRect.top - modelRect.top + bubbleRect.height;
            
            // Wait for camera to settle before getting hotspot position
            window.pointerUpdateTimeout = setTimeout(() => {
                // Get the hotspot's DOM position after camera has settled
                const hotspotRect = characterHotspot.getBoundingClientRect();
                const dot = characterHotspot.querySelector('.dot');
                const dotRect = dot.getBoundingClientRect();
                
                // Use the dot's position instead of the hotspot container
                const screenPosition = {
                    x: dotRect.left - modelRect.left + (dotRect.width / 2),
                    y: dotRect.top - modelRect.top + (dotRect.height / 2)
                };
                
                console.log('Screen positions:', {
                    bubble: { x: bubbleCenterX, y: bubbleBottomY },
                    hotspot: screenPosition,
                    hotspotRect: {
                        left: hotspotRect.left - modelRect.left,
                        top: hotspotRect.top - modelRect.top,
                        width: hotspotRect.width,
                        height: hotspotRect.height
                    },
                    dotRect: {
                        left: dotRect.left - modelRect.left,
                        top: dotRect.top - modelRect.top,
                        width: dotRect.width,
                        height: dotRect.height
                    },
                    character: {
                        hotspot: characterHotspot.getAttribute('data-character'),
                        pov: povData.character
                    }
                });
                
                try {
                    // Calculate control points for the curved line
                    const dx = screenPosition.x - bubbleCenterX;
                    const dy = screenPosition.y - bubbleBottomY;
                    
                    // Create a more pronounced curve by offsetting the control point
                    // The control point is offset perpendicular to the line between bubble and target
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const offset = distance * 0.3; // Adjust this value to control curve amount
                    
                    // Calculate control point that's perpendicular to the line
                    const controlX = bubbleCenterX + dx * 0.5;
                    const controlY = bubbleBottomY + dy * 0.5 - offset;
                    
                    // Create the path data for a curved line using quadratic Bezier curve
                    const pathData = `M ${bubbleCenterX} ${bubbleBottomY} 
                                    Q ${controlX} ${controlY} ${screenPosition.x} ${screenPosition.y}`;
                    
                    console.log('Creating path with data:', pathData);
                    
                    // Create a new path element
                    const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    newPath.id = 'pointer-path';
                    newPath.setAttribute('d', pathData);
                    newPath.setAttribute('stroke', 'black');
                    newPath.setAttribute('stroke-width', '3');
                    newPath.setAttribute('fill', 'none');
                    newPath.setAttribute('stroke-dasharray', '5,5');
                    newPath.setAttribute('stroke-linecap', 'round');
                    
                    // Remove old path and add new one
                    const oldPath = document.getElementById('pointer-path');
                    if (oldPath) {
                        oldPath.remove();
                    }
                    
                    svg.appendChild(newPath);
                    console.log('Pointer path created and added to SVG');
                    resolve();
                    
                } catch (error) {
                    console.error('Error creating/updating path:', error);
                    resolve();
                }
            }, 1000); // Increased delay to ensure camera has fully settled
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
    
    function updateHotspots() {
        console.log('Updating hotspots...');
        
        // Remove existing hotspots
        const existingHotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        existingHotspots.forEach(hotspot => {
            console.log('Removing hotspot:', {
                slot: hotspot.getAttribute('slot'),
                character: hotspot.getAttribute('data-character')
            });
            hotspot.remove();
        });
        
        // Get the current scene's dialogues
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene.querySelectorAll('.dialogue');
        
        console.log('Found dialogues:', Array.from(dialogues).map(dialogue => {
            const data = JSON.parse(dialogue.getAttribute('data-pov'));
            return {
                character: data.character,
                position: `${data.head_x}m ${data.head_y}m ${data.head_z}m`
            };
        }));
        
        // Create new hotspots
        dialogues.forEach((dialogue, index) => {
            const povData = JSON.parse(dialogue.getAttribute('data-pov'));
            const hotspot = document.createElement('div');
            hotspot.setAttribute('slot', `hotspot-${index}`);
            hotspot.className = 'hotspot';
            hotspot.setAttribute('data-position', `${povData.head_x}m ${povData.head_y}m ${povData.head_z}m`);
            hotspot.setAttribute('data-normal', '0m 1m 0m');
            hotspot.setAttribute('data-character', povData.character);
            hotspot.setAttribute('data-head-x', povData.head_x);
            hotspot.setAttribute('data-head-y', povData.head_y);
            hotspot.setAttribute('data-head-z', povData.head_z);
            
            const dot = document.createElement('div');
            dot.className = `dot ${povData.character.toLowerCase()}`;
            dot.textContent = povData.character;
            hotspot.appendChild(dot);
            
            console.log('Creating hotspot:', {
                slot: hotspot.getAttribute('slot'),
                character: povData.character,
                position: hotspot.getAttribute('data-position')
            });
            
            modelViewer.appendChild(hotspot);
        });
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

