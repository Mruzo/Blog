// $(document).ready(function(){
//    $('.toast').toast('show');
//    });

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

function loadContent(url, button) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      document.getElementById('content').innerHTML = html;
      // Remove active class from all buttons
      document.querySelectorAll('.neumorphic').forEach(btn => {
        btn.classList.remove('active');
      });
      // Add active class to clicked button
      button.classList.add('active');
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

// function loadform(url, button) {
//   fetch(url)
//     .then(response => response.text())
//     .then(html => {
//       document.getElementById('reachout-content').innerHTML = html;
//       // Remove active class from all buttons
//       document.querySelectorAll('.neumorphic').forEach(btn => {
//         btn.classList.remove('active');
//       });
//       // Add active class to clicked button
//       button.classList.add('active');
//     })
//     .catch(error => {
//       console.error('Error fetching content:', error);
//     });
// }

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




