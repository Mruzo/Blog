import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/controls/OrbitControls.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/loaders/GLTFLoader.js";

$(document).ready(function(){
    console.log('Document is ready');
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
    console.log('cookie accepted');
});

//AR
let camera, scene, renderer
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

    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test", "light-estimation"] });
    setTimeout(() => {
        arButton.textContent = "view in AR";
    }, 4);
    arButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'pb-4', 'mt-4', 'font-weight-bolder',);
    document.getElementById('ar-button').appendChild(arButton);
    arButton.style.background = '#343a40';
    arButton.style.color = '#FFBC00';
    arButton.style.opacity = 1;
    arButton.style.fontSize = "1rem";
    
    // Add an event listener to monitor when the AR session starts
    renderer.xr.addEventListener('sessionstart', (event) => {
        const session = renderer.xr.getSession();

        recordARUsage();

        // Add an event listener for when the AR session ends
        session.addEventListener('end', () => {
            // Reset the button's hover state and styles after AR session ends
            arButton.classList.remove('hover', 'focus', 'active'); // Remove hover, active, and focus classes
            arButton.style.backgroundColor = '#343a40';  // Reset background color if changed
            arButton.style.color = '#FFBC00';  // Reset text color if changed
            arButton.style.opacity = 1;
            // Optionally, change the button text back to its original state
            arButton.textContent = "view in AR";
        });
    });

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

    function onSelect() {

        // Assuming you want to get the first product's GLTF model
        const firstProductSlug = Object.keys(productUrls)[0]; // Get the slug of the first available product
        const gltfUrl = productUrls[firstProductSlug]; // Get the GLTF URL for the first product


        if (reticle.visible &&!modelLoaded) {
            loader.load(
                gltfUrl,
                function (gltf) {
                    model = gltf.scene;
                    model.children[0].position.setFromMatrixPosition(reticle.matrix);
                    model.children[0].position.y -= 0.01; // 1 cm lower than the detected surface
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

         // Function to record AR usage via an AJAX call
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
            // .then(data => {
            //     console.log("Model usage recorded:", data);
            // })
            .catch((error) => {
                console.error("Error recording Model usage:", error);
            });
        }

    }

    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    window.addEventListener("resize", onWindowResize, false);


    // Event listener to clear the model when AR session ends
    renderer.xr.addEventListener('sessionstart', (event) => {
        const session = renderer.xr.getSession();
        
        session.addEventListener('end', () => {
            // Remove the loaded model from the scene if it exists
            if (model) {
                scene.remove(model);
                model = null;  // Clear the reference to the model
                modelLoaded = false;  // Reset the modelLoaded flag
            }

            // Reset the reticle or any other session-specific objects if needed
            reticle.visible = false;
        });
    });
    
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate( timestamp, xrFrame) {

    if (xrFrame) {
    
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        
        if (hitTestSourceRequested === false) {
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

        if (session.lightEstimation) {
            session.lightEstimation.getLightEstimation().then((lightEstimation) => {
                if (lightEstimation) {
                    const light = scene.children.find(child => child instanceof THREE.HemisphereLight);
                    if (light) {
                        const { color } = lightEstimation;
                        light.color.set(color);
                    }
                }
            }).catch((error) => {
                console.error('Light estimation error:', error);
            });
        }
        

    }

    renderer.render(scene, camera);

}

