import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/controls/OrbitControls.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/loaders/GLTFLoader.js";

$(document).ready(function(){
    $('.toast').toast('show');
    $('#pictureCarousel').carousel();
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

const cookieAccepted = document.cookie.includes("cookie_accepted");

if (!cookieAccepted) {
    document.getElementById("cookie-notification").style.display = "block";
    console.log('cookie notification displayed');
}

document.getElementById("accept-cookie").addEventListener("click", function () {
    document.cookie = "cookie_accepted=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
    document.getElementById("cookie-notification").style.display = "none";
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


     // Check if WebXR is available, and provide a fallback for iOS devices
     if (navigator.xr) {
        // WebXR is available, continue with the AR button setup
        const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test", "light-estimation"] });
        console.log("found android");
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
                arButton.textContent = "view in AR";
            });
        });
        } else {
            // WebXR not available, display fallback or Quick Look button for iOS
            // const unsupportedMessage = document.createElement('p');
            // unsupportedMessage.textContent = 'AR not supported on this device. Try viewing in 3D.';
            // unsupportedMessage.style.color = '#FFBC00';
            // document.getElementById('ar-button').appendChild(unsupportedMessage);

            // Check if it's iOS to provide a Quick Look fallback for USDZ
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

            // Get the first product slug from the dynamically inserted product URLs
            const firstProductSlug = Object.keys(productUrls)[0];
            const modelUrl = getModelUrl(firstProductSlug);  // This now dynamically gets either USDZ or GLTF

            console.log("found iphone");
            if (isIOS) {
                const quickLookButton = document.createElement('h3');
                // Create an a element to act as the link
                const linkElement = document.createElement('a');

                // Set attributes for the link
                linkElement.setAttribute('rel', 'ar');
                linkElement.setAttribute('href', modelUrl);  // Specify the USDZ file path

                linkElement.innerHTML = "&nbsp;START AR&nbsp;";
                // Append the link to the h3 element
                quickLookButton.appendChild(linkElement);
                quickLookButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'py-2', 'my-2', 'font-weight-bolder', 'd-flex', 'justify-content-center', 'my-0', 'rounded');
                quickLookButton.style.background = '#343a40';
                linkElement.style.color = '#FFBC00';
                document.getElementById('ar-button').appendChild(quickLookButton);
            }
        };

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