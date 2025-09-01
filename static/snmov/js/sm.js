// ===== SMOOTH NAVIGATION & UX ENHANCEMENTS =====

// Smooth page transitions and enhanced UX
function initSmoothNavigation() {
    console.log('Initializing smooth navigation...');
    
    // Get homepage URL for JavaScript
    var homepage_url = window.location.origin + '/';
    console.log('Homepage URL:', homepage_url);
    
    // Add smooth transitions to all internal links
    var links = document.querySelectorAll('a[href^="/"], a[href^="' + homepage_url + '"]');
    console.log('Found', links.length, 'internal links');
    
    // Debug: Log all found links
    links.forEach(function(link, index) {
        console.log('Link', index + 1, ':', link.href, 'Text:', link.textContent.trim());
    });
    
    links.forEach(function(link, index) {
        // Skip if it's a target="_blank" link
        if (link.getAttribute('target') === '_blank') {
            console.log('Skipping target="_blank" link:', link.href);
            return;
        }
        
        // Check if event listener is already attached
        if (link.hasAttribute('data-smooth-nav-attached')) {
            console.log('Event listener already attached to:', link.href);
            return;
        }
        
        console.log('Attaching event listener to link:', link.href);
        
        link.addEventListener('click', function(e) {
            console.log('=== LINK CLICKED ===');
            var href = this.getAttribute('href');
            console.log('Link clicked:', href);
            console.log('Link element:', this);
            console.log('Event:', e);
            
            // Skip if it's a hash link or external link
            if (href.startsWith('#') || (href.startsWith('http') && !href.startsWith(window.location.origin))) {
                console.log('Skipping link:', href);
                return;
            }
            
            console.log('Processing navigation to:', href);
            
            // Prevent default navigation temporarily
            e.preventDefault();
            console.log('Default navigation prevented');
            
            // Show loading spinner
            var spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.classList.add('show');
                console.log('Loading spinner shown');
            } else {
                console.log('Loading spinner not found');
            }
            
            // Add transition effect
            var pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.classList.add('page-transitioning');
                console.log('Page transition effect added');
            } else {
                console.log('Page content wrapper not found');
            }
            
            // Small delay to show transition, then navigate
            setTimeout(function() {
                console.log('Navigating to:', href);
                window.location.href = href;
            }, 300);
        });
        
        // Mark this link as having an event listener
        link.setAttribute('data-smooth-nav-attached', 'true');
    });
    
    // Remove transition class and hide spinner when page loads
    window.addEventListener('load', function() {
        console.log('Page loaded, cleaning up transitions');
        var pageContent = document.querySelector('.page-content');
        var spinner = document.getElementById('loadingSpinner');
        
        if (pageContent) {
            pageContent.classList.remove('page-transitioning');
        }
        if (spinner) {
            spinner.classList.remove('show');
        }
    });
    
    // Also remove on DOM ready as fallback
    var pageContent = document.querySelector('.page-content');
    var spinner = document.getElementById('loadingSpinner');
    
    if (pageContent) {
        pageContent.classList.remove('page-transitioning');
    }
    if (spinner) {
        spinner.classList.remove('show');
    }
    
    // Add smooth scroll to top when navigating
    if (window.jQuery) {
        jQuery('html, body').animate({
            scrollTop: 0
        }, 300);
    } else {
        // Fallback for non-jQuery
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    console.log('Smooth navigation initialized successfully');
}

// ===== SMOOTH CONTENT LOADING =====
function initSmoothContentLoading() {
    console.log('Initializing smooth content loading...');
    
    // Get all content elements that should animate in
    var contentElements = document.querySelectorAll('.page-content > *:not(.skip-animation)');
    console.log('Found', contentElements.length, 'content elements to animate');
    
    // Add initial hidden state and animation classes
    contentElements.forEach(function(element, index) {
        // Skip if already processed
        if (element.hasAttribute('data-content-animated')) {
            return;
        }
        
        // Add initial hidden state
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        
        // Mark as processed
        element.setAttribute('data-content-animated', 'true');
        
        // Animate in with staggered delay
        setTimeout(function() {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100 + (index * 150)); // Staggered animation: 100ms base + 150ms per element
    });
    
    // Special handling for specific page types
    var currentPath = window.location.pathname;
    
    if (currentPath === '/' || currentPath === '/home') {
        // Homepage specific animations
        animateHomepageContent();
    } else if (currentPath.includes('immersivecomics')) {
        // ICz page specific animations
        animateICzContent();
    } else if (currentPath.includes('product')) {
        // Merch page specific animations
        animateMerchContent();
    }
    
    console.log('Smooth content loading initialized');
}

// Homepage specific content animations
function animateHomepageContent() {
    console.log('Animating homepage content...');
    
    // Animate main heading with special effect
    var mainHeading = document.querySelector('.landtext');
    if (mainHeading) {
        mainHeading.style.opacity = '0';
        mainHeading.style.transform = 'scale(0.8) translateY(50px)';
        mainHeading.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        
        setTimeout(function() {
            mainHeading.style.opacity = '1';
            mainHeading.style.transform = 'scale(1) translateY(0)';
        }, 200);
    }
    
    // Animate about section with slide effect
    var aboutSection = document.querySelector('.row.border-top');
    if (aboutSection) {
        aboutSection.style.opacity = '0';
        aboutSection.style.transform = 'translateX(-50px)';
        aboutSection.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        
        setTimeout(function() {
            aboutSection.style.opacity = '1';
            aboutSection.style.transform = 'translateX(0)';
        }, 400);
    }
}

// ICz page specific content animations
function animateICzContent() {
    console.log('Animating ICz content...');
    
    // Animate comic cards with staggered entrance
    var comicCards = document.querySelectorAll('.card, .comic-item');
    comicCards.forEach(function(card, index) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px) rotateX(10deg)';
        card.style.transition = 'opacity 0.7s ease-out, transform 0.7s ease-out';
        
        setTimeout(function() {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) rotateX(0deg)';
        }, 300 + (index * 200));
    });
}

// Merch page specific content animations
function animateMerchContent() {
    console.log('Animating Merch content...');
    
    // Animate product cards with bounce effect
    var productCards = document.querySelectorAll('.card, .product-item');
    productCards.forEach(function(card, index) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9) translateY(30px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        
        setTimeout(function() {
            card.style.opacity = '1';
            card.style.transform = 'scale(1) translateY(0)';
        }, 200 + (index * 150));
    });
    
    // Animate testimonials with slide effect
    var testimonials = document.querySelectorAll('.testimonial, .testimonial-item');
    testimonials.forEach(function(testimonial, index) {
        testimonial.style.opacity = '0';
        testimonial.style.transform = 'translateX(50px)';
        testimonial.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        
        setTimeout(function() {
            testimonial.style.opacity = '1';
            testimonial.style.transform = 'translateX(0)';
        }, 500 + (index * 300));
    });
}

// jQuery-dependent features
function initializeJQueryFeatures() {
    if (typeof $ === 'undefined') {
        console.log('jQuery not available, skipping jQuery features');
        return;
    }
    
    $('.toast').toast('show');
    
    // Enhanced carousel initialization
    $('.carousel').each(function() {
        $(this).carousel({
            interval: 5000,
            pause: 'hover',
            keyboard: true,
            touch: true
        });
        
        // Add smooth sliding animation
        $(this).on('slide.bs.carousel', function (e) {
            $(this).find('.carousel-item').css({
                'transition-duration': '.6s'
            });
        });
        
        // Pause on hover
        $(this).hover(
            function() {
                $(this).carousel('pause');
            },
            function() {
                $(this).carousel('cycle');
            }
        );
        
        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;
        
        $(this).on('touchstart', function(e) {
            touchStartX = e.originalEvent.touches[0].pageX;
        });
        
        $(this).on('touchend', function(e) {
            touchEndX = e.originalEvent.changedTouches[0].pageX;
            handleSwipe($(this));
        });
        
        function handleSwipe($carousel) {
            const swipeThreshold = 50;
            const swipeDistance = touchEndX - touchStartX;
            
            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0) {
                    $carousel.carousel('prev');
                } else {
                    $carousel.carousel('next');
                }
            }
        }
    });
}

// Initialize jQuery features when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeJQueryFeatures);
} else {
    // DOM is already ready
    initializeJQueryFeatures();
}

// Also try after jQuery loads
if (window.jQuery) {
    jQuery(document).ready(initializeJQueryFeatures);
} else {
    window.addEventListener('load', function() {
        if (window.jQuery) {
            jQuery(document).ready(initializeJQueryFeatures);
        }
    });
}

// Scroll animations
var scroll = window.requestAnimationFrame || function(callback){ window.setTimeout(callback, 1000/60)};

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

// Cookie notification implementation
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}

function getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Check if cookie notification has been shown before
const cookieAccepted = getCookieValue("cookie_accepted") === "true";

if (!cookieAccepted) {
    const notification = document.getElementById("cookie-notification");
    if (notification) {
        notification.style.display = "block";
        console.log('Cookie notification displayed');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const acceptButton = document.getElementById("accept-cookie");
    if (acceptButton) {
        acceptButton.addEventListener("click", function () {
            setCookie("cookie_accepted", "true", 365); // Cookie expires in 1 year
            const notification = document.getElementById("cookie-notification");
            if (notification) {
                notification.style.display = "none";
            }
        });
    }
});

// Make functions available globally immediately
window.initSmoothNavigation = initSmoothNavigation;
window.initSmoothContentLoading = initSmoothContentLoading;

console.log('SM.js loaded, functions made globally available');
console.log('Smooth navigation function available globally:', typeof window.initSmoothNavigation);
console.log('Smooth content loading function available globally:', typeof window.initSmoothContentLoading);