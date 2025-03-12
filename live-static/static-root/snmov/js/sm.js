console.log('here');
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';

$(document).ready(function(){
  // Enable Bootstrap dropdown functionality
  $('.dropdown-toggle').dropdown();
  console.log("here");
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


document.addEventListener('DOMContentLoaded', function () {
    const scenes = document.querySelectorAll('.scene');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const modelViewer = document.getElementById('model-viewer');
    const topDialogue = document.getElementById('top-dialogue');
    const bottomDialogue = document.getElementById('bottom-dialogue');
    const topPointer = document.getElementById('top-pointer');
    const bottomPointer = document.getElementById('bottom-pointer');
    let currentSceneIndex = 0;

    function project3DTo2D(headX, headY, headZ) {
        if (!modelViewer) return { x: 0, y: 0 };
    
        // Use model-viewer's built-in function if available
        if (modelViewer.toScreen) {
            const position = modelViewer.toScreen(new THREE.Vector3(headX, headY, headZ));
            return position ? { x: position.x, y: position.y } : { x: 0, y: 0 };
        }
    
        // Fallback method using matrices
        const projectionMatrix = new THREE.Matrix4().fromArray(modelViewer.getCamera().projectionMatrix.elements);
        const viewMatrix = new THREE.Matrix4().fromArray(modelViewer.getCamera().matrixWorldInverse.elements);
    
        const vector4 = new THREE.Vector4(headX, headY, headZ, 1);
        vector4.applyMatrix4(viewMatrix);
        vector4.applyMatrix4(projectionMatrix);
    
        if (vector4.w < 0) return { x: -9999, y: -9999 }; // Off-screen handling
    
        vector4.x /= vector4.w;
        vector4.y /= vector4.w;
    
        const x = (vector4.x + 1) / 2 * modelViewer.offsetWidth;
        const y = (1 - (vector4.y + 1) / 2) * modelViewer.offsetHeight;
    
        return { x, y };
    }
  

    function updatePointer(pointer, headX, headY, headZ) {
        const { x, y } = project3DTo2D(headX, headY, headZ);
    
        // Handle off-screen cases
        if (x === -9999 && y === -9999) {
            pointer.style.display = "none"; // Hide pointer if off-screen
            return;
        } else {
            pointer.style.display = "block"; // Ensure it's visible if within bounds
        }
    
        // Get SVG viewBox dimensions
        const svgViewBox = pointer.viewBox.baseVal;
        const svgWidth = svgViewBox.width;
        const svgHeight = svgViewBox.height;
    
        // Normalize coordinates to SVG space
        const normalizedX = (x / modelViewer.offsetWidth) * svgWidth;
        const normalizedY = (y / modelViewer.offsetHeight) * svgHeight;
    
        // Clamp values to keep pointer within bounds
        const clampedX = Math.max(0, Math.min(svgWidth, normalizedX));
        const clampedY = Math.max(0, Math.min(svgHeight, normalizedY));
    
        // Use requestAnimationFrame to ensure smooth updates
        requestAnimationFrame(() => {
            pointer.querySelectorAll('line').forEach(line => {
                line.setAttribute('x2', clampedX);
                line.setAttribute('y2', clampedY);
            });
        });
    }
  

    // Function to show the current scene
    function showScene(index) {
        scenes.forEach((scene, i) => {
            scene.style.display = i === index ? 'block' : 'none';
        });

        // Enable/disable navigation buttons
        prevButton.disabled = index === 0;
        nextButton.disabled = index === scenes.length - 1;

        // Update the 3D model and pointers for the current scene
        const dialogues = scenes[index].querySelectorAll('.dialogue');
        if (dialogues.length > 0) {
            const pov = JSON.parse(dialogues[0].dataset.pov);
            if (modelViewer && pov) {
                modelViewer.cameraOrbit = pov.camera_orbit;
                modelViewer.cameraTarget = pov.camera_target;
                modelViewer.fieldOfView = pov.field_of_view + "deg";
                modelViewer.zoomSpeed = pov.zoom_speed;
                modelViewer.rotation = pov.rotation;

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
        if (currentSceneIndex < scenes.length - 1) {
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
});

