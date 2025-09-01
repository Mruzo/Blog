import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/controls/OrbitControls.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/loaders/GLTFLoader.js";

$(document).ready(function(){
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
});

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

//AR
let camera, scene, renderer, controls
let canvasContainer;
let reticle, controller;
let hitTestSource = null;
let hitTestSourceRequested = false;

const manager = new THREE.LoadingManager();
const loader = new GLTFLoader(manager).setPath("")
let modelLoaded = false;
let model;

init()

function init() {
    canvasContainer = document.getElementById("canvas");
    const canvas = document.createElement("canvas");
    canvas.style.display = 'none';
    canvasContainer.appendChild(canvas);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Set OrbitControls target to the center
    camera.position.set(0, 1.6, 3);  // Move camera back a bit for better view with OrbitControls

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: canvas,
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.setAnimationLoop(animate);

    // Check if WebXR is available and provide appropriate experience for each platform
    if (navigator.xr) {
        // WebXR is available (Android)
        const arButton = ARButton.createButton(renderer, { 
            requiredFeatures: ["hit-test", "light-estimation"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body }
        });
        console.log("WebXR supported - Android device detected");
        arButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'py-2', 'my-2', 'font-weight-bolder');
        document.getElementById('ar-button').appendChild(arButton);

        arButton.style.background = '#343a40';
        arButton.style.color = '#FFBC00';
        arButton.style.opacity = 1;
        arButton.style.fontSize = "1rem";
        arButton.style.left = '';
        arButton.style.position = 'relative';

        renderer.xr.addEventListener('sessionstart', (event) => {
            const session = renderer.xr.getSession();
            recordARUsage();

            session.addEventListener('end', () => {
                arButton.classList.remove('hover', 'focus', 'active');
                arButton.style.backgroundColor = '#343a40';
                arButton.style.color = '#FFBC00';
                arButton.style.opacity = 1;
                arButton.textContent = "View in AR";
            });
        });
    } else {
        // WebXR not available (iOS) - Use USDZ for iOS AR QuickLook
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            console.log("iOS device detected - Using AR QuickLook");
            const arButton = document.createElement('a');
            arButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'py-2', 'my-2', 'font-weight-bolder');
            arButton.style.background = '#343a40';
            arButton.style.color = '#FFBC00';
            arButton.style.opacity = 1;
            arButton.style.fontSize = "1rem";
            arButton.style.textDecoration = 'none';
            arButton.style.display = 'block';
            arButton.style.textAlign = 'center';
            arButton.rel = 'ar';
            
            // Get the USDZ file URL from the data attribute
            const usdzUrl = document.getElementById('ar-button').dataset.usdzUrl;
            if (usdzUrl) {
                arButton.href = usdzUrl;
                arButton.textContent = "View in AR";
                document.getElementById('ar-button').appendChild(arButton);
            } else {
                console.error("No USDZ file URL provided for iOS AR");
            }
        } else {
            console.log("AR not supported on this device");
            const arButton = document.createElement('button');
            arButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'py-2', 'my-2', 'font-weight-bolder');
            arButton.style.background = '#6c757d';
            arButton.style.color = '#fff';
            arButton.style.opacity = 0.5;
            arButton.style.fontSize = "1rem";
            arButton.disabled = true;
            arButton.textContent = "AR Not Supported";
            document.getElementById('ar-button').appendChild(arButton);
        }
    }

    // Initialize OrbitControls for Android
    if (isAndroid()) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 0.5;
        controls.maxDistance = 5;
        controls.maxPolarAngle = Math.PI / 2;
        // Ensure touch input works
        controls.touchEnabled = true; // Enable touch support
        controls.enableZoom = true;  // Allow zooming in/out
        controls.enableRotate = true;  // Allow rotation

        // Event listener to allow touch interactions with the model
        renderer.domElement.addEventListener('touchmove', (event) => {
            if (model) {
                const touch = event.touches[0];
                // Logic to move the model based on touch
                // Example: updating the model's position based on touch movement
                model.position.x += (touch.pageX - window.innerWidth / 2) * 0.001;
                model.position.y += (touch.pageY - window.innerHeight / 2) * 0.001;
            }
        });
    }

    // Function to record AR usage via an AJAX call
    function recordARUsage() {
        // Perform a POST request to your Django view to track usage
        fetch("/track-ar-usage/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie('csrftoken') // Include CSRF token if using Django
            },
            body: JSON.stringify({
                message: "AR button used"
            })
        })
        .then(response => response.json())
        .catch((error) => {
            console.error("Error recording AR usage:", error);
        });
    }

    // Helper function to get the CSRF token from cookies (for Django)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);
    console.log("controller added");


    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    window.addEventListener("resize", onWindowResize, false);

    renderer.xr.addEventListener('sessionstart', (event) => {
        const session = renderer.xr.getSession();
        session.addEventListener('end', () => {
            if (model) {
                scene.remove(model);
                model = null;
                modelLoaded = false;
            }
            reticle.visible = false;
        });
    });

    function isAndroid() {
        console.log("is android");
        return /Android/i.test(navigator.userAgent);
        
    }


function onSelect() {
    const firstProductSlug = Object.keys(productUrls)[0];
    const modelUrl = getModelUrl(firstProductSlug);

    if (!modelUrl) {
        console.error("Model URL not found");
        return;
    }

    const isUSDZ = modelUrl.endsWith('.usdz');

    if (reticle.visible && !modelLoaded) {
        if (isUSDZ) {
            const anchor = document.createElement('a');
            anchor.setAttribute('rel', 'ar');
            anchor.setAttribute('href', modelUrl);
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            modelLoaded = true;
            recordModelUsage();
        } else {
            loader.load(
                modelUrl,
                function (gltf) {
                    model = gltf.scene;
                    model.children[0].position.setFromMatrixPosition(reticle.matrix);
                    model.children[0].position.y -= 0.01;
                    scene.add(model);
                    modelLoaded = true;
                    recordModelUsage();
                },
                undefined,
                function (error) {
                    console.error(error);
                }
            );
        }
    }

    // Function to record model usage via an AJAX call
    function recordModelUsage() {
        // Perform a POST request to your Django view to track usage
        fetch("/track-model-usage/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie('csrftoken') // Include CSRF token if using Django
            },
            body: JSON.stringify({
                message: "Model loaded"
            })
        })
            .then(response => response.json())
            .catch((error) => {
                console.error("Error recording Model usage:", error);
            });
    }

    window.addEventListener("resize", onWindowResize, false);

    // Event listener to clear the model when AR session ends
    renderer.xr.addEventListener('sessionstart', (event) => {
        const session = renderer.xr.getSession();

        session.addEventListener('end', () => {
            // Remove the loaded model from the scene if it exists
            if (model) {
                scene.remove(model);
                model = null; // Clear the reference to the model
                modelLoaded = false; // Reset the modelLoaded flag
            }

            // Reset the reticle or any other session-specific objects if needed
            reticle.visible = false;
        });
    });


}
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(timestamp, xrFrame) {
    if (xrFrame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
            session.requestReferenceSpace("viewer").then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = xrFrame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }

    // Update OrbitControls for Android
    if (controls) controls.update();

    renderer.render(scene, camera);

}

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

// Initialize smooth content loading immediately when this module loads
console.log('SM.js module loaded, initializing smooth navigation...');
initSmoothNavigation();

// Initialize smooth content loading
initSmoothContentLoading();

// Also try to initialize when DOM is ready (in case this runs before DOM)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM ready, re-initializing smooth navigation...');
        initSmoothNavigation();
        initSmoothContentLoading();
    });
} else {
    console.log('DOM already ready, smooth navigation should be working');
    initSmoothContentLoading();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initSmoothNavigation();
        initSmoothContentLoading();
    });
} else {
    // DOM is already ready
    initSmoothNavigation();
    initSmoothContentLoading();
}

// Also try to initialize after jQuery loads (fallback)
if (window.jQuery) {
    jQuery(document).ready(function() {
        initSmoothNavigation();
        initSmoothContentLoading();
    });
} else {
    // Wait for jQuery to load
    window.addEventListener('load', function() {
        if (window.jQuery) {
            jQuery(document).ready(function() {
                initSmoothNavigation();
                initSmoothContentLoading();
            });
        }
    });
}

// Retry initialization after a delay to catch dynamically loaded content
setTimeout(function() {
    console.log('Retrying smooth navigation initialization...');
    initSmoothNavigation();
    initSmoothContentLoading();
}, 1000);

// Also retry after window load
window.addEventListener('load', function() {
    console.log('Window loaded, retrying smooth navigation initialization...');
    setTimeout(function() {
        initSmoothNavigation();
        initSmoothContentLoading();
    }, 100);
});

// Debug: Check if functions are available globally
window.initSmoothNavigation = initSmoothNavigation;
window.initSmoothContentLoading = initSmoothContentLoading;
console.log('Smooth navigation function available globally:', typeof window.initSmoothNavigation);
console.log('Smooth content loading function available globally:', typeof window.initSmoothContentLoading);

// Export the functions for module usage
export { initSmoothNavigation, initSmoothContentLoading };