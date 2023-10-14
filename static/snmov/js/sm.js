$(document).ready(function(){
   $('.toast').toast('show');
   $('#pictureCarousel').carousel();
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

const cookiesAccepted = localStorage.getItem('cookies-accepted');

// If not accepted, show the notification
if (!cookiesAccepted) {
    const notification = document.getElementById('cookies-notification');
    notification.style.display = 'block';

    // Add event listener for the "Accept" button
    const acceptButton = document.getElementById('accept-cookies');
    acceptButton.addEventListener('click', () => {
        notification.style.display = 'none';

        // Set a flag in local storage to remember the user's choice
        localStorage.setItem('cookies-accepted', 'true');
    });
}