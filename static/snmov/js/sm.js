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

//front page animation
var TextSlider = function(){
  this.container = $('#home-animation-wrapper');
  this.currentSlide = 1;
  this.slidesLength = this.container.find('.slide').length - 1; // To start at 0
  this.content = { text1: '', text2: '', text3: ''};

  this.allowChange = true;

  this.init();
};

TextSlider.prototype = {

  init: function(){
//    console.log('init');

    this.bind();

    this.initSvg();

  },

  bind: function(){
//    console.log('bind');

    var self = this;

    // Bind interval
    var timerDuration = 4000,
        timer = setInterval(function(){
          self.resetSlide();
        }, timerDuration);

    // Bind restart on click with next slide
    this.container.on('click', function(){

      // Do not allow to change slide until last transition is complete
      if(!self.allowChange){ return; }
      self.allowChange = false;
      setTimeout(function(){
        self.allowChange = true;
      }, 3000);

      self.resetSlide();

      clearInterval(timer);
      timer = setInterval(function(){
          self.resetSlide();
        }, timerDuration);


    });


  },

  initSvg: function(){
//    console.log('initSvg');

    this.bubblesRandomColors();
    this.setTexts();
    this.bubblesMovement();

    // Trigger First slide
    this.triggerSlide();
  },

  setTexts: function(){
//    console.log('setTexts');

    var texts = this.container.find('#svg-texts');

    // Get texts
    this.content.text1 = this.container.find('.slide[count="'+this.currentSlide+'"]').attr('data-1');
    this.content.text2 = this.container.find('.slide[count="'+this.currentSlide+'"]').attr('data-2');
    this.content.text3 = this.container.find('.slide[count="'+this.currentSlide+'"]').attr('data-3');

    // UpperCase Texts
    this.content.text1 = this.content.text1.toUpperCase();
    this.content.text2 = this.content.text2.toUpperCase();
    this.content.text3 = this.content.text3.toUpperCase();

    // Append Texts
    texts.find('text:nth-child(1)').html(this.content.text1);
    texts.find('text:nth-child(2)').html(this.content.text2);
    texts.find('text:nth-child(3)').html(this.content.text3);
  },

  bubblesRandomColors: function(){
//    console.log('bubblesRandomColors');

    var bubblesGroup = this.container.find('#bubbles'),
        // colors = ['#03ee93','#ff0700','#ffe700','#5306de'];
        colors = ['#64AD60','#FFBC00','#DC2229','#000', '#OOO']

    bubblesGroup.find('path').each(function(){
      var rand = getRand(0,colors.length);
      TweenMax.set(this, { fill: colors[rand], scale: 0, transformOrigin: 'top left' });
    })
  },

  triggerSlide: function(){
//    console.log('triggerSlide');

    // Container loads invisible, needs this to be shown on the first iteration
    TweenMax.set(this.container, { autoAlpha: 1 });

    var bubbles =  this.container.find('#bubbles path');
    bubbles.each(function(){
      var rotateRand = getRand(-1,1);
      TweenMax.to(this,1.5, { scale: 1.2, rotation: rotateRand, ease: Power2.easeInOut});
    })
  },

  resetSlide: function(){
//    console.log('hideSlide');

    var self = this;

    this.currentSlide++;
    if(this.currentSlide > this.slidesLength){ this.currentSlide = 0; };

    var bubbles = this.container.find('#bubbles path');
    TweenMax.to(bubbles,1.5, { scale: 0, ease: Power2.easeInOut, onComplete: triggerContinue });

    // Workaround gsap onComplete
    function triggerContinue(){
      self.initSvg();
    }
  },

//   // non used function (performance) (remove the 'return' to enable)
//   bubblesMovement: function(){

//     return; // Yup, this one

//     var bubbles = this.container.find('#bubbles path'),
//         count = 500;

//     bubbles.each(function(index){
//       if(index > count ) { return; }
//       $(this).attr('data-rand', getRand(15, 55))
//     });

//     this.container.on('mousemove', function(e){
//       bubbles.each(function(){
//         if(!$(this).attr('data-rand')){ return; };

//         var rand = $(this).attr('data-rand'),
//             cy = e.pageY,window.addEventListener("scroll", function() {
//               var hamburgerButton = document.getElementById("hamburger-button");
//               if (window.scrollY > 0) {
//                 hamburgerButton.style.position = "fixed";
//                 hamburgerButton.style.top = "0";
//               } else {
//                 hamburgerButton.style.position = "absolute";
//                 hamburgerButton.style.top = "initial";
//               }
//             });
//             cx = e.pageX,
//             py = Math.round($(this).offset().top),
//             px = Math.round($(this).offset().left),
//             x = Math.round(-(cx + px) / rand),
//             y = Math.round(-(cy + py) / rand);

//         TweenMax.to($(this), 0.2, { x: x, y: y, transformOrigin: 'center' });
//       });
//     })
//   }
// }

// function getRand(min, max) {
//   min = Math.ceil(min);
//   max = Math.floor(max);
//   return Math.floor(Math.random() * (max - min)) + min;
// }

// window.LLOS = window.LLOS || {};
// if($('#home-animation-wrapper').length){
//   window.LLOS.TextSlider = new TextSlider();
// }

window.addEventListener("scroll", function() {
  var hamburgerButton = document.getElementById("hamburger-button");
  if (window.scrollY > 0) {
    hamburgerButton.style.position = "fixed";
    hamburgerButton.style.top = "0";
  } else {
    hamburgerButton.style.position = "fixed";
    hamburgerButton.style.top = "0";
  }
});
