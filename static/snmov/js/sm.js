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
    // ================ DOM ELEMENTS ================
    const modelViewer = document.querySelector('model-viewer');
    const topBubble = document.getElementById('top-bubble');
    const topDialogue = document.getElementById('top-dialogue');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const sceneElements = document.querySelectorAll('.scene');
    
    // ================ STATE ================
    let currentSceneIndex = 0;
    let currentDialogueIndex = 0;
    
    // ================ INITIALIZATION ================
    function init() {
      initPointerLine();
      setupEventListeners();
      updateView();
    }
    
    function initPointerLine() {
      if (!document.getElementById('pointer-line')) {
        const line = document.createElement('div');
        line.id = 'pointer-line';
        Object.assign(line.style, {
          position: 'fixed',
          height: '2px',
          backgroundColor: 'black',
          transformOrigin: '0 0',
          zIndex: '9',
          display: 'none',
          pointerEvents: 'none'
        });
        document.body.appendChild(line);
      }
    }
    
    function setupEventListeners() {
      nextButton.addEventListener('click', nextDialogue);
      prevButton.addEventListener('click', prevDialogue);
      modelViewer.addEventListener('load', updateView);
      window.addEventListener('resize', updateView);
    }
    
    // ================ CORE FUNCTIONS ================
    function updateView() {
      updateDialogueContent();
      updateCameraPosition();
      updatePointer();
      updateButtonStates();
    }
    
    function updateDialogueContent() {
      const currentScene = sceneElements[currentSceneIndex];
      const dialogues = currentScene?.querySelectorAll('.dialogue');
      const dialogue = dialogues?.[currentDialogueIndex];
      
      if (!dialogue) return;
      
      const povData = JSON.parse(dialogue.getAttribute('data-pov'));
      topDialogue.innerHTML = `<strong>${povData.character}:</strong> ${dialogue.querySelector('p').textContent}`;
    }
    
    function updateCameraPosition() {
      const currentScene = sceneElements[currentSceneIndex];
      const dialogues = currentScene?.querySelectorAll('.dialogue');
      const dialogue = dialogues?.[currentDialogueIndex];
      
      if (!dialogue) return;
      
      const povData = JSON.parse(dialogue.getAttribute('data-pov'));
      if (povData.camera_orbit) modelViewer.cameraOrbit = povData.camera_orbit;
      if (povData.camera_target) modelViewer.cameraTarget = povData.camera_target;
    }
    
    function updatePointer() {
      const line = document.getElementById('pointer-line');
      const currentScene = sceneElements[currentSceneIndex];
      const dialogues = currentScene?.querySelectorAll('.dialogue');
      const dialogue = dialogues?.[currentDialogueIndex];
      
      if (!dialogue || !line) return;
      
      const povData = JSON.parse(dialogue.getAttribute('data-pov'));
      const hotspot = document.querySelector(`.hotspot[data-character="${povData.character}"]`);
      
      if (!hotspot) {
        line.style.display = 'none';
        return;
      }
      
      // Get positions
      const bubbleRect = topBubble.getBoundingClientRect();
      const hotspotRect = hotspot.getBoundingClientRect();
      
      // Calculate endpoints
      const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
      const bubbleBottomY = bubbleRect.bottom;
      const hotspotCenterX = hotspotRect.left + hotspotRect.width / 2;
      const hotspotCenterY = hotspotRect.top + hotspotRect.height / 2;
      
      // Calculate line geometry
      const length = Math.sqrt(
        Math.pow(hotspotCenterX - bubbleCenterX, 2) + 
        Math.pow(hotspotCenterY - bubbleBottomY, 2)
      );
      const angle = Math.atan2(
        hotspotCenterY - bubbleBottomY,
        hotspotCenterX - bubbleCenterX
      ) * 180 / Math.PI;
      
      // Style the line
      Object.assign(line.style, {
        display: 'block',
        width: `${length}px`,
        transform: `rotate(${angle}deg)`,
        left: `${bubbleCenterX}px`,
        top: `${bubbleBottomY}px`,
        backgroundColor: getComputedStyle(hotspot.querySelector('.dot')).backgroundColor
      });
    }
    
    function updateButtonStates() {
      const currentScene = sceneElements[currentSceneIndex];
      const dialogues = currentScene?.querySelectorAll('.dialogue');
      
      prevButton.disabled = currentDialogueIndex === 0 && currentSceneIndex === 0;
      nextButton.disabled = currentDialogueIndex === dialogues?.length - 1 && 
                          currentSceneIndex === sceneElements.length - 1;
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

