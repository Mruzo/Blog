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

    function getCameraPosition() {
        const activeDialogue = document.querySelector('.scene[style*="display: block"] .dialogue'); 
        if (!activeDialogue) {
            console.warn("No active dialogue found in getCameraPosition!");
            return { x: 0, y: 0, z: 5 }; // Default position
        }
    
        const pov = JSON.parse(activeDialogue.dataset.pov);
        if (!pov || typeof pov.camera_orbit !== "string") {
            console.error("Invalid POV data in getCameraPosition:", pov);
            return { x: 0, y: 0, z: 5 }; // Default position
        }
    
        const orbitString = pov.camera_orbit.trim(); // Ensure no extra spaces
        const orbitParts = orbitString.split(" ");
    
        if (orbitParts.length !== 3) {
            console.error("Invalid camera_orbit format:", orbitString);
            return { x: 0, y: 0, z: 5 }; // Default position
        }
    
        // Parse values safely
        const theta = parseFloat(orbitParts[0]) * (Math.PI / 180); // Convert degrees to radians
        const phi = parseFloat(orbitParts[1]) * (Math.PI / 180);
        const radius = parseFloat(orbitParts[2]);
    
        // Validate parsed values
        if (isNaN(theta) || isNaN(phi) || isNaN(radius)) {
            console.error("Invalid cameraOrbit values:", orbitString);
            return { x: 0, y: 0, z: 5 }; // Default position
        }
    
        // Convert spherical coordinates to Cartesian
        return {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.cos(phi),
            z: radius * Math.sin(phi) * Math.sin(theta),
        };
    }
  


    // Function to project 3D coordinates to 2D screen space
    function project3DTo2D(headX, headY, headZ) {
      const activeDialogue = document.querySelector('.scene[style*="display: block"] .dialogue');
      if (!activeDialogue) {
          console.warn("No active dialogue found!");
          return { x: 0, y: 0 };
      }

      const pov = JSON.parse(activeDialogue.dataset.pov);
      console.log("Updated POV:", pov.character);
      console.dir(modelViewer.getBoundingClientRect());
      console.log(pov);

      if (!modelViewer || !pov || !pov.camera_target) return { x: 0, y: 0 };


      console.log("Raw camera_target:", pov.camera_target);


      // Ensure camera_target is an object, if it's a string, parse it
      let targetX, targetY, targetZ;

      if (typeof pov.camera_target === "string") {
          const targetParts = pov.camera_target.split(" "); // Split string into ["0m", "3m", "0m"]
          
          if (targetParts.length === 3) {
              targetX = parseFloat(targetParts[0].replace("m", ""));
              targetY = parseFloat(targetParts[1].replace("m", ""));
              targetZ = parseFloat(targetParts[2].replace("m", ""));
          } else {
              console.error("Invalid camera target format:", pov.camera_target);
              return { x: -9999, y: -9999 };
          }
      } else if (typeof pov.camera_target === "object") {
          targetX = parseFloat(pov.camera_target.x.toString().replace("m", ""));
          targetY = parseFloat(pov.camera_target.y.toString().replace("m", ""));
          targetZ = parseFloat(pov.camera_target.z.toString().replace("m", ""));
      } else {
          console.error("Invalid camera target format:", pov.camera_target);
          return { x: -9999, y: -9999 };
      }

      console.log("Converted camera_target:", targetX, targetY, targetZ);

      if (isNaN(targetX) || isNaN(targetY) || isNaN(targetZ)) {
          console.error("Invalid camera target values:", pov.camera_target);
          return { x: -9999, y: -9999 };
      }

      if (isNaN(pov.field_of_view)) {
          console.error("Invalid field_of_view:", pov.field_of_view);
          return { x: -9999, y: -9999 };
      }

      // Get camera position
      console.log("getCameraPosition result:", getCameraPosition(pov));

      const { x: cameraX, y: cameraY, z: cameraZ } = getCameraPosition(pov);
      console.log(`Camera Position: (${cameraX}, ${cameraY}, ${cameraZ})`);

      if (isNaN(cameraX) || isNaN(cameraY) || isNaN(cameraZ)) {
          console.error("Invalid camera position from getCameraPosition");
          return { x: -9999, y: -9999 };
      }

      console.log("fov type:", typeof pov.field_of_view, "value:", pov.field_of_view);

      // Ensure FOV is a valid number
      let fov = pov.field_of_view.replace(/[^\d.]/g, ""); // Remove non-numeric characters
      fov = parseFloat(fov);

      // Validate FOV before conversion
      if (isNaN(fov) || fov <= 0 || fov >= 180) {
          console.error("Invalid FOV (before conversion):", pov.field_of_view);
          return { x: -9999, y: -9999 };
      }

      // Convert degrees to radians
      fov = fov * (Math.PI / 180);

      // Validate FOV after conversion (if needed)
      if (isNaN(fov)) {
          console.error("Invalid FOV (after conversion):", fov);
          return { x: -9999, y: -9999 };
      }

      console.log("final fov:", fov, typeof fov);


      const rect = modelViewer.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Ensure aspect ratio is valid
      if (width <= 0 || height <= 0) {
        console.error("Invalid viewport dimensions:", width, height);
        return { x: -9999, y: -9999 };
      }

      const aspect = width / height;
      console.log("type of aspect:", aspect, typeof(aspect));
      const near = 0.1;
      const far = 100;
      console.log("near, far:", near, typeof(near), far, typeof(far));
      const projectionMatrix = new THREE.Matrix4();
      // const camera = new THREE.PerspectiveCamera(fov * (180 / Math.PI), aspect, near, far);
      // camera.updateProjectionMatrix();
      // projectionMatrix.copy(camera.projectionMatrix);
      const top = near * Math.tan(fov / 2);
      const bottom = -top;
      const right = top * aspect;
      const left = -right;
      projectionMatrix.makePerspective(left, right, top, bottom, near, far);
      console.log("Projection Matrix:", projectionMatrix);


      // Create view matrix
      console.log("Target Coordinates:", targetX, targetY, targetZ);
      console.log("View Matrix LookAt - Camera Position:", cameraX, cameraY, cameraZ);
      console.log("View Matrix LookAt - Target Position:", targetX, targetY, targetZ);

      const viewMatrix = new THREE.Matrix4();
      viewMatrix.lookAt(
          new THREE.Vector3(cameraX, cameraY, cameraZ), // Camera position
          new THREE.Vector3(targetX, targetY, targetZ), // Target (Fixed parsing issue)
          new THREE.Vector3(0, 1, 0) // Up vector
      );
      console.log("View Matrix:", viewMatrix);

      if (!THREE || !THREE.Matrix4 || !THREE.Matrix4.prototype.makePerspective) {
          console.error("THREE.js not loaded or makePerspective is missing!");
      }
    

      // Apply transformations
      console.log("Head Position:", headX, headY, headZ);

      const vector4 = new THREE.Vector4(headX, headY, headZ, 1);
      vector4.applyMatrix4(viewMatrix);
      vector4.applyMatrix4(projectionMatrix);

      if (vector4.w === 0 || isNaN(vector4.x) || isNaN(vector4.y)) {
          console.warn("Projection failed: vector4 contains NaN or invalid w");
          return { x: -9999, y: -9999 };
      }

      vector4.x /= vector4.w;
      vector4.y /= vector4.w;

      // Convert to pixel coordinates
      const x = ((vector4.x + 1) / 2) * width;
      const y = (1 - (vector4.y + 1) / 2) * height;

      console.log(`3D (${headX}, ${headY}, ${headZ}) -> 2D (${x}, ${y})`);
      console.log("Raw screen coordinates:", { x, y });

      return { x, y };
    }


    // Function to update the pointer position
    function updatePointer(pointer, headX, headY, headZ, pov) {
      const { x, y } = project3DTo2D(headX, headY, headZ, pov);
  
      if (x === -9999 && y === -9999) {
          pointer.style.display = "none"; // Hide pointer if off-screen
          return;
      } else {
          pointer.style.display = "block"; // Ensure it's visible
      }
  
      // Get SVG dimensions
      const svgViewBox = pointer.viewBox.baseVal;
      const svgWidth = svgViewBox.width;
      const svgHeight = svgViewBox.height;
  
      // Normalize coordinates
      // const normalizedX = (x / modelViewer.offsetWidth) * svgWidth;
      // const normalizedY = (y / modelViewer.offsetHeight) * svgHeight;
      const adjustedX = Math.max(0, x); // Prevent negative values
      const normalizedX = (adjustedX / window.innerWidth) * svgWidth;
      const normalizedY = (y / window.innerHeight) * svgHeight;

  
      // Clamp values
      const clampedX = Math.max(0, Math.min(svgWidth, normalizedX));
      const clampedY = Math.max(0, Math.min(svgHeight, normalizedY));
      if (normalizedX !== clampedX || normalizedY !== clampedY) {
          console.warn("Pointer position was clamped!", { normalizedX, normalizedY, clampedX, clampedY });
      }
  
      // Animate update
      requestAnimationFrame(() => {
          pointer.querySelectorAll('line').forEach(line => {
              line.setAttribute('x2', clampedX);
              line.setAttribute('y2', clampedY);
          });
      });
  
      console.log(`Pointer Position -> Screen: (${x}, ${y}), SVG: (${clampedX}, ${clampedY})`);
    }
  
  

    // Function to show the current scene
    function showScene(index) {
      scenes.forEach((scene, i) => {
          scene.style.display = i === index ? 'block' : 'none';
      });
  
      prevButton.disabled = index === 0;
      nextButton.disabled = index === scenes.length - 1;
  
      const dialogues = scenes[index].querySelectorAll('.dialogue');
      if (dialogues.length > 0) {
          try {
              const pov = JSON.parse(dialogues[0].dataset.pov);
              if (modelViewer && pov) {
                  console.log("POV Data:", pov); // Debugging
  
                  modelViewer.cameraOrbit = pov.camera_orbit;
                  
                  // Now directly set cameraTarget
                  if (pov.camera_target) {
                      modelViewer.cameraTarget = `${pov.camera_target.x}m ${pov.camera_target.y}m ${pov.camera_target.z}m`;
                  }
  
                  modelViewer.fieldOfView = pov.field_of_view + "deg";
                  modelViewer.zoomSpeed = pov.zoom_speed;
                  modelViewer.rotation = pov.rotation;
  
                  updatePointer(topPointer, pov.head_x, pov.head_y, pov.head_z);
              }
  
              if (dialogues[0]) {
                  const dialogueContent = dialogues[0].querySelector('.card-text').cloneNode(true);
                  topDialogue.innerHTML = '';
                  topDialogue.appendChild(dialogueContent);
              }
  
              if (dialogues[1]) {
                  const dialogueContent = dialogues[1].querySelector('.card-text').cloneNode(true);
                  bottomDialogue.innerHTML = '';
                  bottomDialogue.appendChild(dialogueContent);
  
                  const povBottom = JSON.parse(dialogues[1].dataset.pov);
                  updatePointer(bottomPointer, povBottom.head_x, povBottom.head_y, povBottom.head_z);
              }
          } catch (e) {
              console.error("Error parsing POV JSON:", e);
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

