// Test if script is loaded
// console.log('sm.js is loaded');

// ================ GLOBAL VARIABLES ================
let currentDialogueIndex = 0;
let dialogues = [];
let isUpdatingPointer = false;
let isAnimating = false;
let isModelReady = false;
let isStarted = false;
let pointerPath = null;
let hotspots = {};
let navigationInitialized = false;  // Add flag to track if navigation is initialized
let startEpisodeInitialized = false;  // Add flag to track if startEpisode has been initialized
let modelReadyHandled = false;  // Add flag to track if model ready has been handled

// ================ UTILITY FUNCTIONS ================
function isElementInViewport(el) {
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }
    var rect = el.getBoundingClientRect();
    return (
        (rect.top <= 0 && rect.bottom >= 0) ||
        (rect.bottom >= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight)) ||
        (rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight))
    );
}

function showMessage(type, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.innerText = message;

    const feedbackMessageContainer = document.getElementById('feedback-message');
    feedbackMessageContainer.innerHTML = '';
    feedbackMessageContainer.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// ================ SCROLL ANIMATION ================
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
        } else {
            element.classList.remove('is-visible');
        }
    });
    scroll(loop);
}

loop();

// ================ HOME PAGE CONTENT LOADING ================
window.loadContent = function(url, button = null) {
  // console.log('loadContent called with URL:', url);
  fetch(url)
    .then(response => {
      // console.log('Response status:', response.status);
      return response.text();
    })
    .then(html => {
      // console.log('Received HTML:', html.substring(0, 100) + '...'); // Log first 100 chars
      const contentDiv = document.getElementById('content');
      if (!contentDiv) {
        // console.error('Content div not found!');
        return;
      }
      
      // If this is the 3D comics page, strip header and footer
      if (url.includes('/3dcomics/')) {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find the main content
        const mainContent = tempDiv.querySelector('main');
        if (mainContent) {
          // Remove comic-header if it exists
          const comicHeader = mainContent.querySelector('.comic-header');
          if (comicHeader) {
            comicHeader.remove();
          }
          contentDiv.innerHTML = mainContent.innerHTML;
        } else {
          contentDiv.innerHTML = html;
        }
      } else {
        // For other pages, use the full HTML
      contentDiv.innerHTML = html;
      }
      
      // Update button states
      document.querySelectorAll('.neumorphic').forEach(btn => {
        btn.classList.remove('active');
      });
      if (button) {
        button.classList.add('active');
      }
      
      // Scroll to top
      window.scrollTo(0, 0);
      
      // Initialize any carousels in the new content
      initCarousel();
    })
    .catch(error => {
      // console.error('Error fetching content:', error);
    });
}

// ================ CAROUSEL ================
function initCarousel() {
  var carousels = document.querySelectorAll('.carousel');
  carousels.forEach(function(carousel) {
    var slides = carousel.querySelectorAll('.carousel-item');
    var activeIndex = 0;
    slides[activeIndex].classList.add('active');

    var nextButton = carousel.querySelector('.carousel-control-next');
    var prevButton = carousel.querySelector('.carousel-control-prev');

    nextButton.addEventListener('click', function() {
      event.preventDefault();
      slides[activeIndex].classList.remove('active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex].classList.add('active');
    });

    prevButton.addEventListener('click', function() {
      event.preventDefault();
      slides[activeIndex].classList.remove('active');
      activeIndex = (activeIndex - 1 + slides.length) % slides.length;
      slides[activeIndex].classList.add('active');
    });
  });
}

// ================ FORM HANDLING ================
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('user-form');
  if (form) {
      form.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(form);
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
                  form.style.display = 'none';
                  showMessage('success', data.message);
              } else {
                  showMessage('error', data.message);
              }
          })
          .catch(error => {
              // console.error('Error submitting form:', error);
              showMessage('error', 'There was an error submitting the form.');
          });
      });
  }
});

// ================ MODEL VIEWER ================
document.addEventListener('DOMContentLoaded', () => {
    // console.log('DOM Content Loaded');
    
    const modelViewer = document.querySelector('model-viewer');
    const topBubble = document.getElementById('top-bubble');
    const topDialogue = document.getElementById('top-dialogue');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    
    if (!modelViewer || !topBubble || !topDialogue || !prevButton || !nextButton) {
        // console.error('Required elements not found:', {
        //     modelViewer: !!modelViewer,
        //     topBubble: !!topBubble,
        //     topDialogue: !!topDialogue,
        //     prevButton: !!prevButton,
        //     nextButton: !!nextButton
        // });
            return;
        }
        
    // Initialize dialogues array from the dialogues container
    const dialogueElements = document.querySelectorAll('.dialogue');
    // console.log('Found dialogue elements:', dialogueElements.length);
    dialogueElements.forEach(element => {
        try {
            const povData = JSON.parse(element.getAttribute('data-pov'));
            dialogues.push(povData);
            // console.log('Added dialogue:', povData);
        } catch (error) {
            // console.error('Error parsing dialogue data:', error);
        }
    });
    // console.log('Initialized dialogues array:', dialogues);
    
    // console.log('Model viewer found:', modelViewer);
    // console.log('Model viewer attributes:', {
    //     interpolationDecay: modelViewer.getAttribute('interpolation-decay'),
    //     cameraControls: modelViewer.getAttribute('camera-controls'),
    //     interpolation: modelViewer.getAttribute('interpolation'),
    //     minCameraOrbit: modelViewer.getAttribute('min-camera-orbit'),
    //     maxCameraOrbit: modelViewer.getAttribute('max-camera-orbit'),
    //     minFieldOfView: modelViewer.getAttribute('min-field-of-view'),
    //     maxFieldOfView: modelViewer.getAttribute('max-field-of-view')
    // });

    // Wait for model to be ready
    modelViewer.addEventListener('load', () => {
        // console.log('Model loaded');
        isModelReady = true;
    });

    modelViewer.addEventListener('camera-change', () => {
        if (!isAnimating) {
            updatePointerPosition();
        }
    });

    modelViewer.addEventListener('model-visibility', (event) => {
        if (event.detail.visible) {
            // console.log('=== Model and hotspots ready ===', new Date().getTime());
            isModelReady = true;
            
            // Create all hotspots from POV data
            // console.log('Creating all hotspots from POV data...');
            createHotspots();
            
            // Don't show first dialogue here - that's handled by startEpisode
        }
    });

    function createHotspots() {
        // console.log('Creating hotspots...');
        
        // Remove existing hotspots
        const existingHotspots = modelViewer.querySelectorAll('[slot^="hotspot"]');
        existingHotspots.forEach(hotspot => {
            // console.log('Removing existing hotspot:', {
            //     slot: hotspot.getAttribute('slot'),
            //     character: hotspot.getAttribute('data-character')
            // });
            hotspot.remove();
        });
        
        // Create new hotspots for each unique character
        const uniqueCharacters = new Set();
        dialogues.forEach((dialogue, index) => {
            // Extract base character name (remove numbers)
            const baseCharacterName = dialogue.character.replace(/\s*\d+$/, '');
            
            // Only create hotspot if we haven't seen this character before
            if (!uniqueCharacters.has(baseCharacterName)) {
                uniqueCharacters.add(baseCharacterName);
            
            const hotspot = document.createElement('div');
            hotspot.setAttribute('slot', `hotspot-${baseCharacterName}`);
            hotspot.className = 'hotspot';
            hotspot.setAttribute('data-position', `${dialogue.head_x}m ${dialogue.head_y}m ${dialogue.head_z}m`);
            hotspot.setAttribute('data-normal', '0m 1m 0m');
            hotspot.setAttribute('data-character', baseCharacterName);
            
                // Create the dot element inside the hotspot
            const dot = document.createElement('div');
                dot.className = 'dot';
                dot.textContent = baseCharacterName;
            hotspot.appendChild(dot);
            
                // Add the hotspot to the model-viewer
                modelViewer.appendChild(hotspot);
                
                // console.log('Created hotspot:', {
                //     element: hotspot,
                //     attributes: {
                //         slot: hotspot.getAttribute('slot'),
                //         class: hotspot.className,
                //         position: hotspot.getAttribute('data-position'),
                //         normal: hotspot.getAttribute('data-normal'),
                //         character: hotspot.getAttribute('data-character')
                //     }
                // });
            }
        });
    }

    function showDialogue(index) {
        if (!dialogues || !dialogues[index]) {
            // console.error('No dialogue loaded for index:', index);
            return;
        }

        // console.log('=== Starting showDialogue ===', new Date().getTime());
        // console.log('Dialogue index:', index);
        
        // Update current index
        currentDialogueIndex = index;
        
        const currentDialogue = dialogues[index];
        
        if (currentDialogue) {
            // console.log('Showing dialogue:', {
            //     index: index,
            //     character: currentDialogue.character,
            //     text: currentDialogue.text,
            //     camera_orbit: currentDialogue.camera_orbit,
            //     camera_target: currentDialogue.camera_target
            // });
            
            // Reset flags
            isUpdatingPointer = false;
            isAnimating = true;
            
            // Hide pointer during camera movement
            const path = document.getElementById('pointer-path');
            if (path) {
                path.style.display = 'none';
            }
            
            // Update dialogue text
            const topDialogue = document.getElementById('top-dialogue');
            if (topDialogue) {
                topDialogue.innerHTML = `<strong>${currentDialogue.character}:</strong> ${currentDialogue.text}`;
            }
            
            // Animate camera position
            if (isModelReady) {
                // console.log('=== CAMERA UPDATE DEBUG ===');
                // console.log('Dialogue index:', index);
                // console.log('Camera target before:', modelViewer.cameraTarget);
                // console.log('Camera orbit before:', modelViewer.cameraOrbit);
                // console.log('New camera target:', currentDialogue.camera_target);
                // console.log('New camera orbit:', currentDialogue.camera_orbit);
                // console.log('Field of view:', currentDialogue.field_of_view);
                
                // First set the target
                modelViewer.cameraTarget = currentDialogue.camera_target;
                // console.log('Camera target after setting:', modelViewer.cameraTarget);
                
                // Set field of view
                modelViewer.fieldOfView = currentDialogue.field_of_view + "deg";
                
                // Use the animation system for smooth camera movement
                // console.log('About to animate with orbit value:', currentDialogue.camera_orbit);
                // console.log('Type of orbit value:', typeof currentDialogue.camera_orbit);
                
                // Try setting camera orbit directly first
                modelViewer.cameraOrbit = currentDialogue.camera_orbit;
                // console.log('Camera orbit after direct setting:', modelViewer.cameraOrbit);
                
                const animation = modelViewer.animate({
                    cameraOrbit: currentDialogue.camera_orbit
                }, {
                    duration: 500,  // 1 second
                    easing: 'ease-in-out'
                });
                
                // console.log('Animation started with orbit:', currentDialogue.camera_orbit);
                
                // Wait for animation to complete
                animation.onfinish = () => {
                    // console.log('Camera animation complete');
                    if (!isUpdatingPointer) {
                        isUpdatingPointer = true;
      updatePointer();
                    }
                };
            }
            
            // Update navigation buttons
            const prevButton = document.getElementById('prevButton');
            const nextButton = document.getElementById('nextButton');
            if (prevButton && nextButton) {
                prevButton.disabled = index === 0;
                nextButton.disabled = index === dialogues.length - 1;
            }
            
            // console.log('=== Finished showDialogue ===', new Date().getTime());
        } else {
            // console.error('No dialogue found for index:', index);
        }
    }

    // Listen for animation start
    modelViewer.addEventListener('animation-start', () => {
        // console.log('=== Animation started ===', new Date().getTime());
        isAnimating = true;
        const path = document.getElementById('pointer-path');
        if (path) {
            path.style.display = 'none';
        }
    });

    // Listen for animation end
    modelViewer.addEventListener('animation-end', () => {
        // console.log('=== Animation ended ===', new Date().getTime());
        isAnimating = false;
        if (!isUpdatingPointer && isModelReady) {
            isUpdatingPointer = true;
            updatePointer();
        }
    });

    // Keep camera-change as a backup
    modelViewer.addEventListener('camera-change', () => {
        if (!isAnimating && !isUpdatingPointer && isModelReady) {
            // console.log('=== Camera changed (no animation) ===', new Date().getTime());
            isUpdatingPointer = true;
            updatePointer();
        }
    });
    
    function updatePointer() {
        if (!isModelReady) {
            // console.log('Model not ready yet, skipping pointer update');
            isUpdatingPointer = false;
                return;
            }
            
        // console.log('=== Starting updatePointer ===', new Date().getTime());
        const currentDialogue = dialogues[currentDialogueIndex];
        
        if (!currentDialogue) {
            // console.log('No dialogue found');
            isUpdatingPointer = false;
                return;
            }
            
        // Extract base character name (remove numbers)
        const baseCharacterName = currentDialogue.character.replace(/\s*\d+$/, '');
        // console.log('Updating pointer for character:', {
        //     original: currentDialogue.character,
        //     base: baseCharacterName
        // });
        
        // Find the hotspot using model-viewer's native syntax
        const hotspot = modelViewer.querySelector(`[slot="hotspot-${baseCharacterName}"]`);
      
      if (!hotspot) {
            // console.log('No hotspot found for character:', baseCharacterName);
            const path = document.getElementById('pointer-path');
            if (path) {
                path.style.display = 'none';
            }
            isUpdatingPointer = false;
        return;
      }
      
      // Get positions
      const bubbleRect = topBubble.getBoundingClientRect();
      const hotspotRect = hotspot.getBoundingClientRect();
        const modelRect = modelViewer.getBoundingClientRect();
        
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
        
        // console.log('Creating path with data:', pathData);
        
        // Get or create path element
        let path = document.getElementById('pointer-path');
        if (!path) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.id = 'pointer-path';
            path.setAttribute('stroke', 'black');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', '5,5');
            path.setAttribute('stroke-linecap', 'round');
            svgContainer.appendChild(path);
        }
        
        path.setAttribute('d', pathData);
        path.style.display = 'block';
        
        isUpdatingPointer = false;
    }

    // Set up navigation button handlers
    if (prevButton && nextButton) {
        prevButton.onclick = function() {
            // console.log('SET 1 - Previous button clicked. Current index:', currentDialogueIndex);
        if (currentDialogueIndex > 0) {
            const newIndex = currentDialogueIndex - 1;
                // console.log('SET 1 - Moving to previous dialogue, new index:', newIndex);
                loadDialogue(newIndex);
            showDialogue(newIndex);
        } else {
                // console.log('SET 1 - Already at first dialogue');
        }
        };

        nextButton.onclick = function() {
            // console.log('SET 1 - Next button clicked. Current index:', currentDialogueIndex);
        if (currentDialogueIndex < dialogues.length - 1) {
            const newIndex = currentDialogueIndex + 1;
                // console.log('SET 1 - Moving to next dialogue, new index:', newIndex);
                loadDialogue(newIndex);
            showDialogue(newIndex);
        } else {
                // console.log('SET 1 - Already at last dialogue');
            }
        };
        }

    // Set up start button handler
    const startButton = document.getElementById('start-button');
    const overlayContainer = document.getElementById('overlay-container');
    
    if (startButton && overlayContainer) {
        startButton.addEventListener('click', () => {
            // console.log('Start button clicked');
            overlayContainer.style.display = 'none';
            showDialogue();
        });
    }
  });

// Initialize Bootstrap dropdowns
$(document).ready(function(){
    $('.dropdown-toggle').dropdown();
});

// ================ HOME PAGE SLIDER ================
function initHomeSlider() {
    const slides = document.querySelectorAll('.input-slide');
    const prevArrows = document.querySelectorAll('.slider-arrow-prev label');
    const nextArrows = document.querySelectorAll('.slider-arrow-next label');
    let currentSlide = 0;
    let slideInterval;

    function goToSlide(index) {
        slides[currentSlide].checked = false;
        currentSlide = index;
        slides[currentSlide].checked = true;
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % slides.length);
    }

    function prevSlide() {
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
    }

    // Handle arrow clicks
    prevArrows.forEach(arrow => {
        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            clearInterval(slideInterval);
            prevSlide();
            startAutoSlide();
        });
    });

    nextArrows.forEach(arrow => {
        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            clearInterval(slideInterval);
            nextSlide();
            startAutoSlide();
        });
    });

    // Handle dot navigation
    slides.forEach((slide, index) => {
        slide.addEventListener('change', () => {
            clearInterval(slideInterval);
            currentSlide = index;
            startAutoSlide();
        });
    });

    function startAutoSlide() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    // Start auto-sliding
    startAutoSlide();
}

// Initialize home slider when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initHomeSlider();
  });

// Make startEpisode function globally available
window.startEpisode = function() {
    // console.log('Start button clicked');
    
    // Find required elements
    const elements = {
        modelViewer: document.querySelector('model-viewer'),
        overlayContainer: document.querySelector('.overlay-container'),
        comicNavigation: document.querySelector('.comic-navigation'),
        prevButton: document.getElementById('prevButton'),
        nextButton: document.getElementById('nextButton'),
        topDialogue: document.getElementById('top-dialogue')
    };
    
    // Hide overlay and show navigation
    if (elements.overlayContainer) {
        elements.overlayContainer.style.display = 'none';
    }
    
    if (elements.comicNavigation) {
        elements.comicNavigation.style.display = 'block';
    }
    
    // Initialize dialogues container
    const dialoguesContainer = document.querySelector('.dialogues-container');
    if (dialoguesContainer) {
        // Get total number of dialogues
        const totalDialogues = dialoguesContainer.querySelectorAll('.dialogue').length;
        // console.log('Total available dialogues:', totalDialogues);
        
        // Initialize empty array with correct size
        dialogues = new Array(totalDialogues);
        
        // Load and show first dialogue
        loadDialogue(0);
        showDialogue(0);
        
        // Set up navigation button handlers (SET 2 - handles actual button clicks)
        if (elements.prevButton && elements.nextButton) {
            elements.prevButton.onclick = function() {
                // console.log('Button clicked - Previous. Current index:', currentDialogueIndex);
                if (currentDialogueIndex > 0) {
                    const newIndex = currentDialogueIndex - 1;
                    // console.log('Moving to previous dialogue, new index:', newIndex);
                    loadDialogue(newIndex);
                    showDialogue(newIndex);
                } else {
                    // console.log('Already at first dialogue');
                }
            };
            
            elements.nextButton.onclick = function() {
                // console.log('Button clicked - Next. Current index:', currentDialogueIndex);
                if (currentDialogueIndex < totalDialogues - 1) {
                    const newIndex = currentDialogueIndex + 1;
                    // console.log('Moving to next dialogue, new index:', newIndex);
                    loadDialogue(newIndex);
                    showDialogue(newIndex);
                } else {
                    // console.log('Already at last dialogue');
                }
            };
        }
    }
};

function loadDialogue(index) {
    const dialoguesContainer = document.querySelector('.dialogues-container');
    if (!dialoguesContainer) return;
    
    const dialogueElement = dialoguesContainer.querySelector(`.dialogue:nth-child(${index + 1})`);
    if (!dialogueElement) return;
    
    try {
        const povData = JSON.parse(dialogueElement.getAttribute('data-pov'));
        dialogues[index] = {
            index: index,
            character: povData.character,
            text: povData.text,
            camera_orbit: povData.camera_orbit,
            camera_target: povData.camera_target,
            field_of_view: povData.field_of_view || '45.0',
            head_x: povData.head_x || 0,
            head_y: povData.head_y || 0,
            head_z: povData.head_z || 0
        };
        // console.log(`Loaded dialogue ${index}:`, dialogues[index]);
        // console.log(`Camera orbit value for dialogue ${index}:`, povData.camera_orbit);
    } catch (error) {
        // console.error('Error parsing POV data for dialogue', index, ':', error);
    }
}

