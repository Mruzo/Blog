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
      
      // If this is the immersive comics page, strip header and footer
      if (url.includes('/immersivecomics/')) {
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
    dialogueElements.forEach((element, index) => {
        try {
            const povData = JSON.parse(element.getAttribute('data-pov'));
            // Ensure dialogue_id is included
            const dialogueData = {
                dialogue_id: povData.dialogue_id,
                index: index,
                character: povData.character,
                text: povData.text,
                camera_orbit: povData.camera_orbit,
                camera_target: povData.camera_target,
                field_of_view: povData.field_of_view || '45.0',
                zoom_speed: povData.zoom_speed || 1.0,
                head_x: povData.head_x || 0,
                head_y: povData.head_y || 0,
                head_z: povData.head_z || 0
            };
            dialogues.push(dialogueData);
            // console.log('Added dialogue:', dialogueData);
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
            updatePointer();
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
                // Enable Next button on last dialogue if there's a summary available
                const hasSummary = window.episodeData && window.episodeData.summary && window.episodeData.summary.trim() !== '';
                nextButton.disabled = index === dialogues.length - 1 && !hasSummary;
            }
            
            // Check if this is the last dialogue and show next episode button (but not summary yet)
            if (index === dialogues.length - 1) {
                // Show next episode button on last dialogue, but don't show summary yet
                const nextEpisodeButton = document.getElementById('next-episode-button');
                if (window.episodeData && window.episodeData.hasNextEpisode === 'true' && nextEpisodeButton) {
                    nextEpisodeButton.style.display = 'block';
                }
                // Don't hide summary if we're currently showing it
                if (!isShowingSummary) {
                    hideEpisodeSummary();
                }
            } else {
                hideEpisodeSummary();
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
        if (isShowingSummary) {
            // If showing summary, go back to last dialogue
            isShowingSummary = false;
            hideEpisodeSummary();
            showDialogue(currentDialogueIndex); // Re-show the last dialogue
        } else if (currentDialogueIndex > 0) {
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
                // console.log('SET 1 - At last dialogue - showing episode summary');
                isShowingSummary = true;
                showEpisodeSummary();
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

    // Safety check - if no slides found, don't initialize slider
    if (slides.length === 0) {
        console.log('No slides found, skipping home slider initialization');
        return;
    }

    function goToSlide(index) {
        if (slides[currentSlide]) {
            slides[currentSlide].checked = false;
        }
        currentSlide = index;
        if (slides[currentSlide]) {
            slides[currentSlide].checked = true;
        }
    }

    function nextSlide() {
        if (slides.length > 0) {
            goToSlide((currentSlide + 1) % slides.length);
        }
    }

    function prevSlide() {
        if (slides.length > 0) {
            goToSlide((currentSlide - 1 + slides.length) % slides.length);
        }
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
        if (slides.length > 0) {
            slideInterval = setInterval(nextSlide, 5000);
        }
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
                if (isShowingSummary) {
                    // If showing summary, go back to last dialogue
                    isShowingSummary = false;
                    hideEpisodeSummary();
                    showDialogue(currentDialogueIndex); // Re-show the last dialogue
                } else if (currentDialogueIndex > 0) {
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
                    // console.log('At last dialogue - showing episode summary');
                    isShowingSummary = true;
                    showEpisodeSummary();
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
            dialogue_id: povData.dialogue_id, // Include dialogue_id for saving
            index: index,
            character: povData.character,
            text: povData.text,
            camera_orbit: povData.camera_orbit,
            camera_target: povData.camera_target,
            field_of_view: povData.field_of_view || '45.0',
            zoom_speed: povData.zoom_speed || 1.0, // Include zoom_speed
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

// ================ EDITING FUNCTIONALITY ================
let isEditMode = false;
let currentEditingDialogue = null;
let originalValues = {};
let isShowingSummary = false;

// Initialize editing functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeEditingControls();
});

function initializeEditingControls() {
    const previewModeBtn = document.getElementById('previewModeBtn');
    const editModeBtn = document.getElementById('editModeBtn');
    const editControls = document.getElementById('editControls');
    const editingOverlay = document.getElementById('editingOverlay');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (!previewModeBtn || !editModeBtn) return; // Not on preview page

    // Mode toggle functionality
    previewModeBtn.addEventListener('click', () => {
        setEditMode(false);
    });

    editModeBtn.addEventListener('click', () => {
        setEditMode(true);
    });

    // Save and reset functionality
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCameraChanges);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCameraChanges);
    }

    // Initialize sliders
    initializeSliders();
}

function setEditMode(enabled) {
    isEditMode = enabled;
    const previewModeBtn = document.getElementById('previewModeBtn');
    const editModeBtn = document.getElementById('editModeBtn');
    const editControls = document.getElementById('editControls');
    const editingOverlay = document.getElementById('editingOverlay');

    if (enabled) {
        previewModeBtn.classList.remove('active');
        editModeBtn.classList.add('active');
        editControls.style.display = 'block';
        editingOverlay.style.display = 'block';
        loadCurrentDialogueValues();
    } else {
        previewModeBtn.classList.add('active');
        editModeBtn.classList.remove('active');
        editControls.style.display = 'none';
        editingOverlay.style.display = 'none';
    }
}

function initializeSliders() {
    // Camera Orbit Sliders
    const orbitAzimuth = document.getElementById('orbitAzimuth');
    const orbitPolar = document.getElementById('orbitPolar');
    const orbitRadius = document.getElementById('orbitRadius');
    
    // Camera Target Sliders
    const targetX = document.getElementById('targetX');
    const targetY = document.getElementById('targetY');
    const targetZ = document.getElementById('targetZ');
    
    // Camera Settings Sliders
    const fieldOfView = document.getElementById('fieldOfView');
    const zoomSpeed = document.getElementById('zoomSpeed');

    // Add event listeners for real-time updates
    [orbitAzimuth, orbitPolar, orbitRadius, targetX, targetY, targetZ, fieldOfView, zoomSpeed].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', updateCameraInRealTime);
        }
    });
}

function loadCurrentDialogueValues() {
    if (currentDialogueIndex >= 0 && currentDialogueIndex < dialogues.length) {
        // Get a fresh reference to the current dialogue from the main array
        const dialogueFromArray = dialogues[currentDialogueIndex];
        
        // Create a new object to avoid reference issues
        currentEditingDialogue = {
            dialogue_id: dialogueFromArray.dialogue_id,
            index: dialogueFromArray.index,
            character: dialogueFromArray.character,
            text: dialogueFromArray.text,
            camera_orbit: dialogueFromArray.camera_orbit,
            camera_target: dialogueFromArray.camera_target,
            field_of_view: dialogueFromArray.field_of_view,
            zoom_speed: dialogueFromArray.zoom_speed,
            head_x: dialogueFromArray.head_x,
            head_y: dialogueFromArray.head_y,
            head_z: dialogueFromArray.head_z
        };
        
        // Parse camera orbit
        const orbitMatch = currentEditingDialogue.camera_orbit.match(/(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)m/);
        if (orbitMatch) {
            const azimuth = parseFloat(orbitMatch[1]);
            const polar = parseFloat(orbitMatch[2]);
            const radius = parseFloat(orbitMatch[3]);
            
            setSliderValue('orbitAzimuth', azimuth, -180, 180);
            setSliderValue('orbitPolar', polar, 0, 180);
            setSliderValue('orbitRadius', radius, 1, 10);
        }
        
        // Parse camera target
        const targetMatch = currentEditingDialogue.camera_target.match(/(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m/);
        if (targetMatch) {
            const x = parseFloat(targetMatch[1]);
            const y = parseFloat(targetMatch[2]);
            const z = parseFloat(targetMatch[3]);
            
            setSliderValue('targetX', x, -5, 5);
            setSliderValue('targetY', y, 0, 3);
            setSliderValue('targetZ', z, -5, 5);
        }
        
        // Set other values
        setSliderValue('fieldOfView', currentEditingDialogue.field_of_view, 10, 90);
        setSliderValue('zoomSpeed', currentEditingDialogue.zoom_speed, 0.1, 3);
        
        // Store original values for reset
        originalValues = {
            camera_orbit: currentEditingDialogue.camera_orbit,
            camera_target: currentEditingDialogue.camera_target,
            field_of_view: currentEditingDialogue.field_of_view,
            zoom_speed: currentEditingDialogue.zoom_speed
        };
        
        updateCurrentValuesDisplay();
    }
}

function setSliderValue(sliderId, value, min, max) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(sliderId + 'Value');
    
    if (slider) {
        // Set min/max first, then value to avoid clamping
        slider.min = min;
        slider.max = max;
        slider.value = value;
    }
    
    if (valueDisplay) {
        if (sliderId.includes('Azimuth') || sliderId.includes('Polar') || sliderId.includes('FOV')) {
            valueDisplay.textContent = value + '°';
        } else if (sliderId.includes('Radius') || sliderId.includes('target')) {
            valueDisplay.textContent = value + 'm';
        } else if (sliderId.includes('Speed')) {
            valueDisplay.textContent = value + 'x';
        }
    }
}

function updateCameraInRealTime() {
    if (!isEditMode || !currentEditingDialogue) return;
    
    // Get current slider values
    const azimuth = parseFloat(document.getElementById('orbitAzimuth').value);
    const polar = parseFloat(document.getElementById('orbitPolar').value);
    const radius = parseFloat(document.getElementById('orbitRadius').value);
    
    const targetX = parseFloat(document.getElementById('targetX').value);
    const targetY = parseFloat(document.getElementById('targetY').value);
    const targetZ = parseFloat(document.getElementById('targetZ').value);
    
    const fieldOfView = parseFloat(document.getElementById('fieldOfView').value);
    const zoomSpeed = parseFloat(document.getElementById('zoomSpeed').value);
    
    // Update dialogue object
    currentEditingDialogue.camera_orbit = `${azimuth}deg ${polar}deg ${radius}m`;
    currentEditingDialogue.camera_target = `${targetX}m ${targetY}m ${targetZ}m`;
    currentEditingDialogue.field_of_view = fieldOfView;
    currentEditingDialogue.zoom_speed = zoomSpeed;
    

    
    // Update model-viewer in real-time
    const modelViewer = document.querySelector('model-viewer');
    if (modelViewer && isModelReady) {
        modelViewer.cameraTarget = currentEditingDialogue.camera_target;
        modelViewer.cameraOrbit = currentEditingDialogue.camera_orbit;
        modelViewer.fieldOfView = currentEditingDialogue.field_of_view + "deg";
    }
    
    // Update display values
    updateCurrentValuesDisplay();
}

function updateCurrentValuesDisplay() {
    if (!currentEditingDialogue) return;
    
    const currentOrbit = document.getElementById('currentOrbit');
    const currentTarget = document.getElementById('currentTarget');
    const currentFOV = document.getElementById('currentFOV');
    const currentZoom = document.getElementById('currentZoom');
    
    if (currentOrbit) currentOrbit.textContent = currentEditingDialogue.camera_orbit;
    if (currentTarget) currentTarget.textContent = currentEditingDialogue.camera_target;
    if (currentFOV) currentFOV.textContent = currentEditingDialogue.field_of_view + '°';
    if (currentZoom) currentZoom.textContent = currentEditingDialogue.zoom_speed;
}

function saveCameraChanges() {
    if (!currentEditingDialogue) {
        console.error('No currentEditingDialogue found');
        return;
    }
    
    if (!currentEditingDialogue.dialogue_id) {
        console.error('No dialogue_id found in currentEditingDialogue:', currentEditingDialogue);
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    // Get current slider values to ensure we save the latest state
    const azimuth = parseFloat(document.getElementById('orbitAzimuth').value);
    const polar = parseFloat(document.getElementById('orbitPolar').value);
    const radius = parseFloat(document.getElementById('orbitRadius').value);
    
    const targetX = parseFloat(document.getElementById('targetX').value);
    const targetY = parseFloat(document.getElementById('targetY').value);
    const targetZ = parseFloat(document.getElementById('targetZ').value);
    
    const fieldOfView = parseFloat(document.getElementById('fieldOfView').value);
    const zoomSpeed = parseFloat(document.getElementById('zoomSpeed').value);
    
    // Prepare data for API with current slider values
    const data = {
        camera_orbit: `${azimuth}deg ${polar}deg ${radius}m`,
        camera_target: `${targetX}m ${targetY}m ${targetZ}m`,
        field_of_view: fieldOfView,
        zoom_speed: zoomSpeed
    };
    
    console.log('Saving dialogue_id:', currentEditingDialogue.dialogue_id);
    console.log('Saving data:', data);
    
    // Send AJAX request
    fetch(`/immersivecomics/api/dialogue/${currentEditingDialogue.dialogue_id}/update-camera/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showSaveMessage('success', 'Camera changes saved successfully!');
            
            // Update all state sources consistently
            originalValues = { ...data };
            
            // Update currentEditingDialogue
            currentEditingDialogue.camera_orbit = data.camera_orbit;
            currentEditingDialogue.camera_target = data.camera_target;
            currentEditingDialogue.field_of_view = data.field_of_view;
            currentEditingDialogue.zoom_speed = data.zoom_speed;
            
            // Update dialogues array
            if (currentDialogueIndex >= 0 && currentDialogueIndex < dialogues.length) {
                dialogues[currentDialogueIndex].camera_orbit = data.camera_orbit;
                dialogues[currentDialogueIndex].camera_target = data.camera_target;
                dialogues[currentDialogueIndex].field_of_view = data.field_of_view;
                dialogues[currentDialogueIndex].zoom_speed = data.zoom_speed;
            }
            
            // Update display to reflect saved state
            updateCurrentValuesDisplay();
        } else {
            showSaveMessage('error', 'Error saving changes: ' + result.message);
        }
    })
    .catch(error => {
        console.error('Error saving camera changes:', error);
        showSaveMessage('error', 'Network error while saving changes');
    })
    .finally(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    });
}

function resetCameraChanges() {
    if (!currentEditingDialogue || !originalValues) return;
    
    // Restore original values
    currentEditingDialogue.camera_orbit = originalValues.camera_orbit;
    currentEditingDialogue.camera_target = originalValues.camera_target;
    currentEditingDialogue.field_of_view = originalValues.field_of_view;
    currentEditingDialogue.zoom_speed = originalValues.zoom_speed;
    
    // Reload slider values
    loadCurrentDialogueValues();
    
    // Update model-viewer
    const modelViewer = document.querySelector('model-viewer');
    if (modelViewer && isModelReady) {
        modelViewer.cameraTarget = currentEditingDialogue.camera_target;
        modelViewer.cameraOrbit = currentEditingDialogue.camera_orbit;
        modelViewer.fieldOfView = currentEditingDialogue.field_of_view + "deg";
    }
    
    showSaveMessage('info', 'Camera changes reset to original values');
}

function showSaveMessage(type, message) {
    // Create temporary message display
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show`;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showEpisodeSummary() {
    const topDialogue = document.getElementById('top-dialogue');
    const nextEpisodeButton = document.getElementById('next-episode-button');
    const summaryOverlay = document.getElementById('summary-overlay');
    const modelViewer = document.querySelector('model-viewer');
    const nextButton = document.getElementById('nextButton');
    
    // Disable Next button when showing summary
    if (nextButton) {
        nextButton.disabled = true;
    }
    
    // Show dimming overlay
    if (summaryOverlay) {
        summaryOverlay.style.display = 'block';
    }
    
    // Show episode summary in dialogue bubble if available
    if (window.episodeData && window.episodeData.summary && window.episodeData.summary.trim() !== '') {
        if (topDialogue) {
            topDialogue.innerHTML = window.episodeData.summary;
        }
    }
    
    // Move camera to summary position if available
    if (modelViewer && isModelReady && window.episodeData) {
        let cameraOrbit = window.episodeData.summaryCameraOrbit;
        let fieldOfView = window.episodeData.summaryFieldOfView;
        
        // If no summary camera orbit is set, use a default wide shot
        if (!cameraOrbit || cameraOrbit.trim() === '') {
            cameraOrbit = '0deg 75deg 5m'; // Default wide shot
        }
        
        // If no summary field of view is set, use default
        if (!fieldOfView || fieldOfView === '') {
            fieldOfView = 60.0;
        }
        
        // Parse field of view properly
        const fovValue = parseFloat(fieldOfView);
        if (isNaN(fovValue)) {
            fieldOfView = 60.0;
        } else {
            fieldOfView = fovValue;
        }
        
        // Animate to summary camera position
        const animation = modelViewer.animate({
            cameraOrbit: cameraOrbit
        }, {
            duration: 1000,  // 1 second animation
            easing: 'ease-in-out'
        });
        
        // Set field of view
        modelViewer.fieldOfView = fieldOfView + "deg";
    }
    
    // Show next episode button if available
    if (window.episodeData && window.episodeData.hasNextEpisode === 'true' && nextEpisodeButton) {
        nextEpisodeButton.style.display = 'block';
    }
}

function hideEpisodeSummary() {
    const nextEpisodeButton = document.getElementById('next-episode-button');
    const summaryOverlay = document.getElementById('summary-overlay');
    const topDialogue = document.getElementById('top-dialogue');
    const nextButton = document.getElementById('nextButton');
    
    // Reset summary flag
    isShowingSummary = false;
    
    // Re-enable Next button if we're on the last dialogue and there's a summary
    if (nextButton && currentDialogueIndex === dialogues.length - 1) {
        const hasSummary = window.episodeData && window.episodeData.summary && window.episodeData.summary.trim() !== '';
        nextButton.disabled = !hasSummary;
    }
    
    // Hide dimming overlay
    if (summaryOverlay) {
        summaryOverlay.style.display = 'none';
    }
    
    // Hide next episode button
    if (nextEpisodeButton) {
        nextEpisodeButton.style.display = 'none';
    }
    
    // Clear episode summary from dialogue bubble
    if (topDialogue && window.episodeData && window.episodeData.summary) {
        // Restore the last dialogue text if we're not at the end
        if (currentDialogueIndex < dialogues.length - 1) {
            showDialogue(currentDialogueIndex);
        }
    }
}

// Override the existing showDialogue function to support editing mode
const originalShowDialogue = window.showDialogue || function(){};
window.showDialogue = function(index) {
    // Call original function
    if (typeof originalShowDialogue === 'function') {
        originalShowDialogue(index);
    }
    
    // Update editing controls if in edit mode
    if (isEditMode) {
        loadCurrentDialogueValues();
    }
};

