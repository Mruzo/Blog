$('div#navbarSupportedContent li.nav-item').on('click', function(ev) {

    $(this).parent().find('li.active').removeClass('active');
    $(this).addClass('active');

    });

$(document).ready(function(){
   $('.toast').toast('show');
   $('.sidenav').sidenav();
   });

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

var tl = gsap.timeline({
    repeat: -1,
    yoyo: true,
});

tl.fromTo(".l44",
    {opacity: 0.5, duration: 1, ease: "back.out",},
    {opacity: 1, duration: 1, ease: "back.out",})
  .fromTo(".l22",
    {textShadow: "3px 0px #dc2229ff", opacity: 0.5, duration: 0.5, ease: "power4.out",},
    { opacity: 1, duration: 1,  ease: "power4.in",}, "-=0.5")
  .fromTo(".l33",
    {textShadow: "-4px 0px #feb900ff", duration: 2.5, ease:"bounce.out", webkitClipPath: 'inset(40% 0% 40%)',},
    {duration: 1.5,  ease:"bounce.in", scale: "1", webkitClipPath: 'inset(20% 0% 20%)',}, "-=1")
  .fromTo(".land",
    {textShadow: "3px 0px #dc2229ff", duration: 2.5, scale: "1", webkitClipPath: 'inset(25% 0% 25%)',},
    {duration: 1.5, ease:"bounce.out", scale: "1", webkitClipPath: 'inset(70% 0% 30%)',}, "-=1")
  .fromTo(".l33, .land",
    {opacity:0.4,duration: 0.5, ease: "power4.out",},
    {opacity:1,duration: 0.5, ease: "power4.in",},"0");