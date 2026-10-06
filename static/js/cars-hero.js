import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("carHeroCanvas");
const loaderUI = document.getElementById("carHeroLoader");

if (!canvas) {
    throw new Error("3D hero canvas not found.");
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    34,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(4.4, 2.2, 6.8);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 4.2;
controls.maxDistance = 9.5;
controls.minPolarAngle = Math.PI * 0.35;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 0.6, 0);
controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
controls.autoRotateSpeed = 0.55;

scene.add(new THREE.HemisphereLight(0xb9c6d8, 0x080808, 2.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
keyLight.position.set(5, 7, 4);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xd9793f, 18, 12, 2);
rimLight.position.set(-4, 2.8, -2);
scene.add(rimLight);

const frontLight = new THREE.PointLight(0x8aa9ff, 8, 10, 2);
frontLight.position.set(3, 1.5, 4);
scene.add(frontLight);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 64),
    new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.03;
floor.scale.set(1.55, 0.5, 1);
scene.add(floor);

const carRoot = new THREE.Group();
scene.add(carRoot);

function finishLoading() {
    if (loaderUI) {
        loaderUI.classList.add("is-hidden");
    }
}

function buildFallbackCar() {
    const fallback = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.65, 1.65),
        new THREE.MeshStandardMaterial({
            color: 0x191919,
            metalness: 0.9,
            roughness: 0.2
        })
    );

    body.position.y = 0.58;
    fallback.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.62, 1.35),
        new THREE.MeshStandardMaterial({
            color: 0x080b10,
            metalness: 0.7,
            roughness: 0.15,
            transparent: true,
            opacity: 0.94
        })
    );

    cabin.position.set(-0.1, 1.12, 0);
    fallback.add(cabin);

    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x080808,
        metalness: 0.75,
        roughness: 0.28
    });

    [-1.35, 1.35].forEach(function (x) {
        [-0.84, 0.84].forEach(function (z) {
            const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.43, 0.43, 0.26, 32),
                wheelMaterial
            );

            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, 0.43, z);
            fallback.add(wheel);
        });
    });

    return fallback;
}

function frameModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center);

    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 5.4;
    const scale = targetSize / maxDimension;

    model.scale.setScalar(scale);
    model.position.y = 0.2;

    carRoot.add(model);
}

const modelURL =
    "https://sceneview.github.io/models/platforms/CarConcept.glb";

const gltfLoader = new GLTFLoader();

gltfLoader.load(
    modelURL,
    function (gltf) {
        const model = gltf.scene;

        model.traverse(function (object) {
            if (!object.isMesh) {
                return;
            }

            object.castShadow = true;
            object.receiveShadow = true;

            if (object.material) {
                object.material.envMapIntensity = 1.2;
            }
        });

        frameModel(model);
        finishLoading();
    },
    function (progress) {
        if (!loaderUI || !progress.total) {
            return;
        }

        const percent = Math.round(
            (progress.loaded / progress.total) * 100
        );

        const label = loaderUI.querySelector("small");

        if (label) {
            label.textContent =
                "Loading 3D experience " + percent + "%";
        }
    },
    function () {
        console.warn("3D car model could not be loaded. Using fallback.");
        frameModel(buildFallbackCar());
        finishLoading();
    }
);

let pointerX = 0;
let pointerY = 0;

window.addEventListener("pointermove", function (event) {
    pointerX =
        (event.clientX / window.innerWidth - 0.5) * 2;

    pointerY =
        (event.clientY / window.innerHeight - 0.5) * 2;
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    controls.update();

    if (carRoot.children.length) {
        carRoot.rotation.x =
            THREE.MathUtils.lerp(
                carRoot.rotation.x,
                pointerY * -0.025,
                0.035
            );

        if (!controls.autoRotate) {
            carRoot.rotation.y =
                THREE.MathUtils.lerp(
                    carRoot.rotation.y,
                    pointerX * 0.12,
                    0.035
                );
        }

        carRoot.position.y =
            Math.sin(elapsed * 1.2) * 0.035;
    }

    renderer.render(scene, camera);
}

function resize() {
    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 1.8)
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

window.addEventListener("resize", resize);

animate();
