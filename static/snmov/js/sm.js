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

// Check if the "cookie_accepted" cookie exists
const cookieAccepted = document.cookie.includes("cookie_accepted");

// If the cookie doesn't exist, show the notification
if (!cookieAccepted) {
    document.getElementById("cookie-notification").style.display = "block";
}

// Handle the "Accept" button click event
document.getElementById("accept-cookie").addEventListener("click", function () {
    // Set the "cookie_accepted" cookie to indicate acceptance
    document.cookie = "cookie_accepted=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";

    // Hide the notification
    document.getElementById("cookie-notification").style.display = "none";
});
