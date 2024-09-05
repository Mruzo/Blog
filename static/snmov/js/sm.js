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
const loader = new GLTFLoader(manager).setPath("/static/snmov/img/")
let modelLoaded = false;

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
    }, 5);
    arButton.classList.add('custom-ar-button', 'mx-auto', 'subtext-btn-sm', 'pb-4', 'mt-4', 'font-weight-bolder',);
    document.getElementById('ar-button').appendChild(arButton);
    arButton.style.background = '#343a40';
    arButton.style.color = '#FFBC00';
    arButton.style.opacity = 1;
    
    
    console.log('ARButton created and appended to the DOM.');

    function onSelect() {
        if (reticle.visible &&!modelLoaded) {
            loader.load(
                "mouse.gltf",
                function (gltf) {
                    gltf.scene.children[0].position.setFromMatrixPosition(reticle.matrix);
                    scene.add(gltf.scene);
                    modelLoaded = true;
                },
                undefined,
                function (error) {
                    console.error(error);
                }
            );
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

