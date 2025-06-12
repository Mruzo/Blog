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
            updateHotspots();
            setupEventListeners();
        } else {
            console.log('Waiting for model to load...');
            modelViewer.addEventListener('load', () => {
                console.log('Model loaded, initializing...');
                updateHotspots();
                setupEventListeners();
            });
        }
    }
    
    // ================ EVENT HANDLERS ================
    function startEpisode() {
        console.log('Starting episode...');
        if (coverSection) coverSection.style.display = 'none';
        if (modelSection) modelSection.style.display = 'block';
        isStarted = true;
        updateView();
    }
    
    function setupEventListeners() {
        console.log('Setting up event listeners...');
        
        if (prevButton) {
            prevButton.addEventListener('click', prevDialogue);
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', nextDialogue);
        }
        
        // Listen for camera changes
        modelViewer.addEventListener('camera-change', () => {
            console.log('Camera changed');
            updateButtonStates();
        });
    }
    
    // ================ VIEW UPDATES ================
    function updateView() {
        console.log('Updating view...');
        
        // Update dialogue content
        updateDialogueContent();
        
        // Update camera position
        updateCameraPosition();
        
        // Update button states
        updateButtonStates();
    }
    
    function updateDialogueContent() {
        console.log('Updating dialogue content...');
        
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        const dialogue = dialogues?.[currentDialogueIndex];
        
        if (!dialogue) {
            console.log('No dialogue found');
            return;
        }
        
        const povData = JSON.parse(dialogue.getAttribute('data-pov'));
        console.log('POV data:', povData);
        
        // Update text bubble content
        if (topBubble) {
            topBubble.textContent = povData.text;
        }
        
        // Update dialogue content
        if (topDialogue) {
            topDialogue.textContent = povData.character;
        }
    }
    
    function updateCameraPosition() {
        console.log('Updating camera position...');
        
        const currentScene = sceneElements[currentSceneIndex];
        const dialogues = currentScene?.querySelectorAll('.dialogue');
        const dialogue = dialogues?.[currentDialogueIndex];
        
        if (!dialogue) {
            console.log('No dialogue found');
            return;
        }
        
        const povData = JSON.parse(dialogue.getAttribute('data-pov'));
        console.log('POV data:', povData);
        
        // Set camera orbit and target
        modelViewer.setAttribute('camera-orbit', povData.camera_orbit);
        modelViewer.setAttribute('camera-target', povData.camera_target);
        modelViewer.setAttribute('field-of-view', povData.field_of_view);
        
        // Set rotation if provided
        if (povData.rotation) {
            modelViewer.setAttribute('rotation', povData.rotation);
        }
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
        
        // Add hotspots for each character
        const characters = ['Will', 'Nel', 'Ed', 'Sam'];
        characters.forEach((character, index) => {
            const hotspot = document.createElement('button');
            hotspot.setAttribute('slot', `hotspot-${index}`);
            hotspot.setAttribute('data-character', character);
            hotspot.setAttribute('data-position', `${index * 2 - 3}m 2m ${index * 2 - 3}m`);
            hotspot.setAttribute('class', 'hotspot');
            
            // Add dot element
            const dot = document.createElement('div');
            dot.setAttribute('class', 'dot');
            hotspot.appendChild(dot);
            
            modelViewer.appendChild(hotspot);
            console.log('Added hotspot:', {
                slot: hotspot.getAttribute('slot'),
                character: hotspot.getAttribute('data-character'),
                position: hotspot.getAttribute('data-position')
            });
        });
    }
    
    // Initialize when DOM is loaded
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

