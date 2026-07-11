import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

const ASSETS = { logo: 'assets/logo.png', heroBg: 'assets/hero-bg.jpg' };

const canvas = document.getElementById('webgl-canvas');
const progressBar = document.querySelector('.scroll-progress-bar');
const nav = document.getElementById('nav');
const panels = gsap.utils.toArray('.panel');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

if (!prefersReducedMotion) {
    window.addEventListener('pointermove', (e) => {
        pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06060b, 0.022);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
const cameraTarget = new THREE.Vector3(0, 0.4, 0);
const cameraPosition = new THREE.Vector3(0, 3, 10);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    prefersReducedMotion ? 0.25 : 0.62,
    0.38,
    0.78
);
composer.addPass(bloomPass);

const loader = new THREE.TextureLoader();
const textures = {};

function loadTexture(key, url) {
    return new Promise((resolve) => {
        loader.load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            textures[key] = tex;
            resolve(tex);
        }, undefined, () => resolve(null));
    });
}

await Promise.all([loadTexture('heroBg', ASSETS.heroBg), loadTexture('logo', ASSETS.logo)]);

// --- Procedural carpet textures ---
function createCarpetTexture(dirty = true) {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = dirty ? '#7a5535' : '#e8e4dc';
    ctx.fillRect(0, 0, size, size);
    const count = dirty ? 12000 : 10000;
    for (let i = 0; i < count; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const len = 2 + Math.random() * (dirty ? 8 : 6);
        const angle = Math.random() * Math.PI;
        const shade = dirty ? 90 + Math.random() * 70 : 200 + Math.random() * 40;
        ctx.strokeStyle = dirty
            ? `rgba(${shade},${shade * 0.72},${shade * 0.48},0.55)`
            : `rgba(${shade},${shade},${shade - 8},0.35)`;
        ctx.lineWidth = 0.3 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
    }
    if (dirty) {
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 25;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(35,22,12,0.45)');
            g.addColorStop(1, 'rgba(35,22,12,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const dirtyTex = createCarpetTexture(true);
const cleanTex = createCarpetTexture(false);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.5);
keyLight.position.set(6, 10, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xf11414, 1.2);
rimLight.position.set(-6, 4, -4);
scene.add(rimLight);
const spotLight = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 4.5, 0.35, 1);
spotLight.position.set(0, 9, 3);
scene.add(spotLight);
const gallerySpot = new THREE.SpotLight(0xf11414, 0, 25, Math.PI / 6, 0.5, 1);
gallerySpot.position.set(5, 6, 2);
scene.add(gallerySpot);

// --- Hero backdrop ---
const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(42, 56, 56),
    new THREE.MeshBasicMaterial({
        map: textures.heroBg || null,
        color: textures.heroBg ? 0xffffff : 0x100810,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5,
    })
);
scene.add(backdrop);

// --- Scene groups ---
const heroGroup = new THREE.Group();
const servicesGroup = new THREE.Group();
const aboutGroup = new THREE.Group();
const galleryGroup = new THREE.Group();
const contactGroup = new THREE.Group();
scene.add(heroGroup, servicesGroup, aboutGroup, galleryGroup, contactGroup);

// HERO: carpet roll
const carpetGroup = new THREE.Group();
const carpetMat = new THREE.MeshStandardMaterial({ map: dirtyTex, roughness: 0.8, metalness: 0.05 });
const carpet = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.16, 3.3, 48, 1, 28), carpetMat);
carpetGroup.add(carpet);
const fringeMat = new THREE.MeshStandardMaterial({ color: 0x6e4f2e, roughness: 0.9 });
[-2.75, 2.75].forEach((x) => {
    carpetGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 3.35), fringeMat).translateX(x));
});
const heroGlow = new THREE.PointLight(0xf11414, 0, 12);
heroGlow.position.set(0, 1.5, 2);
heroGroup.add(carpetGroup);
heroGroup.add(heroGlow);

const carpetCleanMat = new THREE.MeshStandardMaterial({ map: dirtyTex, roughness: 0.8, metalness: 0.05 });
const carpetClean = new THREE.Group();
const cleanMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 0.14, 3, 40, 1, 24), carpetCleanMat);
carpetClean.add(cleanMesh);
const cleanOverlay = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.145, 3, 40, 1, 24),
    new THREE.MeshStandardMaterial({ map: cleanTex, roughness: 0.55, metalness: 0.12, transparent: true, opacity: 0 })
);
cleanOverlay.position.y = 0.002;
carpetClean.add(cleanOverlay);
carpetClean.position.set(-1.8, 0, 0);
carpetClean.scale.setScalar(0.95);

// Hero dust particles
const dustCount = prefersReducedMotion ? 60 : 200;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 8;
    dustPos[i * 3 + 1] = Math.random() * 5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ color: 0xffeedd, size: 0.04, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
heroGroup.add(new THREE.Points(dustGeo, dustMat));

// SERVICES: machine + foam
const machineGroup = new THREE.Group();
const machineMat = new THREE.MeshStandardMaterial({ color: 0x232330, metalness: 0.7, roughness: 0.25 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xb40606, metalness: 0.5, roughness: 0.3, emissive: 0x3a0000, emissiveIntensity: 0.15 });
machineGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.78, 0.78), machineMat).translateY(0.5));
machineGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.37, 1, 24), redMat).translateX(0.55).translateY(1.18));
const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.13, 0.3), machineMat);
nozzle.position.set(-1, 0.3, 0.45);
machineGroup.add(nozzle);

const sprayCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.8, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
);
sprayCone.rotation.z = Math.PI / 2;
sprayCone.position.set(-1.8, 0.35, 0.45);
machineGroup.add(sprayCone);
servicesGroup.add(machineGroup);
servicesGroup.add(carpetClean);

const foamCount = prefersReducedMotion ? 100 : 380;
const foamGeo = new THREE.BufferGeometry();
const foamPos = new Float32Array(foamCount * 3);
const foamVel = new Float32Array(foamCount * 3);
const foamLife = new Float32Array(foamCount);
function resetFoam(i) {
    foamPos[i * 3] = -2 + (Math.random() - 0.5) * 0.3;
    foamPos[i * 3 + 1] = 0.3 + Math.random() * 0.2;
    foamPos[i * 3 + 2] = 0.4 + (Math.random() - 0.5) * 0.3;
    foamVel[i * 3] = -0.025 - Math.random() * 0.02;
    foamVel[i * 3 + 1] = 0.012 + Math.random() * 0.02;
    foamVel[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
    foamLife[i] = Math.random();
}
for (let i = 0; i < foamCount; i++) resetFoam(i);
foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
const foamMat = new THREE.PointsMaterial({ color: 0xc8ecff, size: 0.08, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
servicesGroup.add(new THREE.Points(foamGeo, foamMat));

const steamCount = prefersReducedMotion ? 40 : 160;
const steamGeo = new THREE.BufferGeometry();
const steamPos = new Float32Array(steamCount * 3);
const steamVel = new Float32Array(steamCount * 3);
const steamLife = new Float32Array(steamCount);
function resetSteam(i) {
    steamPos[i * 3] = -1.9 + (Math.random() - 0.5) * 0.5;
    steamPos[i * 3 + 1] = 0.35 + Math.random() * 0.15;
    steamPos[i * 3 + 2] = 0.45 + (Math.random() - 0.5) * 0.4;
    steamVel[i * 3] = (Math.random() - 0.5) * 0.008;
    steamVel[i * 3 + 1] = 0.018 + Math.random() * 0.025;
    steamVel[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    steamLife[i] = Math.random();
}
for (let i = 0; i < steamCount; i++) resetSteam(i);
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
const steamMat = new THREE.PointsMaterial({ color: 0xddeeff, size: 0.11, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
servicesGroup.add(new THREE.Points(steamGeo, steamMat));

const sparkleCount = prefersReducedMotion ? 30 : 120;
const sparkleGeo = new THREE.BufferGeometry();
const sparklePos = new Float32Array(sparkleCount * 3);
const sparklePhase = new Float32Array(sparkleCount);
for (let i = 0; i < sparkleCount; i++) {
    sparklePos[i * 3] = -1.8 + (Math.random() - 0.5) * 4.5;
    sparklePos[i * 3 + 1] = 0.2 + Math.random() * 0.25;
    sparklePos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    sparklePhase[i] = Math.random() * Math.PI * 2;
}
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
const sparkleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
servicesGroup.add(new THREE.Points(sparkleGeo, sparkleMat));

// ABOUT: rings + 3 orbs + floating carpet
const orbitRings = new THREE.Group();
for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + i * 0.5, 0.03, 16, 90),
        new THREE.MeshStandardMaterial({ color: 0xf11414, emissive: 0x8a0404, emissiveIntensity: 0.7, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2 + i * 0.4;
    orbitRings.add(ring);
}
aboutGroup.add(orbitRings);

const aboutCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.12, 2.5, 32, 1, 20),
    new THREE.MeshStandardMaterial({ map: cleanTex, roughness: 0.7, metalness: 0.08 })
);
aboutCarpet.position.set(0, 1.8, -1.5);
aboutGroup.add(aboutCarpet);

const orbColors = [0xf11414, 0xff6644, 0xcc2222];
const orbs = [];
for (let i = 0; i < 3; i++) {
    const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 24, 24),
        new THREE.MeshStandardMaterial({ color: orbColors[i], emissive: orbColors[i], emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.2 })
    );
    orbs.push(orb);
    aboutGroup.add(orb);
}

// GALLERY: abstract wireframe exhibition (NO photos)
const wireMat = new THREE.LineBasicMaterial({ color: 0xf11414, transparent: true, opacity: 0.7 });
const galleryFrames3D = [];
const frameLayout = [
    { pos: [4.5, 2, -3], rot: -0.35 },
    { pos: [5.2, 0.3, -4], rot: 0.2 },
    { pos: [4, -1.5, -3.5], rot: -0.15 },
    { pos: [5.5, -2.5, -4.5], rot: 0.4 },
];
frameLayout.forEach(({ pos, rot }) => {
    const g = new THREE.Group();
    const box = new THREE.BoxGeometry(1.5, 1.1, 0.06);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), wireMat));
    const inner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x1a1020, emissive: 0x2a0810, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.6 })
    );
    inner.position.z = 0.04;
    g.add(inner);
    const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.15, 20),
        new THREE.MeshStandardMaterial({ color: 0x181820, metalness: 0.8, roughness: 0.2 })
    );
    pedestal.position.y = -0.75;
    g.add(pedestal);
    g.position.set(...pos);
    g.rotation.y = rot;
    galleryFrames3D.push(g);
    galleryGroup.add(g);
});

const galleryFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x0c0c14, metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.7 })
);
galleryFloor.rotation.x = -Math.PI / 2;
galleryFloor.position.set(4.5, -0.6, -3.5);
galleryGroup.add(galleryFloor);

const helixCount = prefersReducedMotion ? 80 : 250;
const helixGeo = new THREE.BufferGeometry();
const helixPos = new Float32Array(helixCount * 3);
for (let i = 0; i < helixCount; i++) {
    const t = (i / helixCount) * Math.PI * 6;
    helixPos[i * 3] = 4 + Math.cos(t) * 1.2;
    helixPos[i * 3 + 1] = (i / helixCount) * 5 - 2;
    helixPos[i * 3 + 2] = -3 + Math.sin(t) * 1.2;
}
helixGeo.setAttribute('position', new THREE.BufferAttribute(helixPos, 3));
const helixMat = new THREE.PointsMaterial({ color: 0xf11414, size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
galleryGroup.add(new THREE.Points(helixGeo, helixMat));

// CONTACT: portal
const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.05, 24, 140),
    new THREE.MeshStandardMaterial({ color: 0xf11414, emissive: 0xb40606, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.08 })
);
portalRing.rotation.x = Math.PI / 2;
contactGroup.add(portalRing);
const portalRing2 = portalRing.clone();
portalRing2.scale.setScalar(0.7);
portalRing2.material = portalRing.material.clone();
portalRing2.material.emissiveIntensity = 0.35;
contactGroup.add(portalRing2);

const portalCore = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 64),
    new THREE.MeshBasicMaterial({ color: 0xf11414, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
);
portalCore.rotation.x = Math.PI / 2;
contactGroup.add(portalCore);

const portalRing3 = portalRing.clone();
portalRing3.scale.setScalar(1.35);
portalRing3.material = portalRing.material.clone();
portalRing3.material.opacity = 0.35;
portalRing3.material.transparent = true;
contactGroup.add(portalRing3);

const logoPlane = new THREE.Mesh(
    new THREE.CircleGeometry(1, 56),
    new THREE.MeshBasicMaterial({ map: textures.logo || null, color: textures.logo ? 0xffffff : 0xf11414, transparent: true })
);
logoPlane.position.z = 0.2;
contactGroup.add(logoPlane);

const contactParticles = prefersReducedMotion ? 60 : 180;
const cpGeo = new THREE.BufferGeometry();
const cpPos = new Float32Array(contactParticles * 3);
for (let i = 0; i < contactParticles; i++) {
    const a = (i / contactParticles) * Math.PI * 2;
    const r = 2.2 + Math.random() * 0.8;
    cpPos[i * 3] = Math.cos(a) * r;
    cpPos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
    cpPos[i * 3 + 2] = Math.sin(a) * r;
}
cpGeo.setAttribute('position', new THREE.BufferAttribute(cpPos, 3));
const cpMat = new THREE.PointsMaterial({ color: 0xf11414, size: 0.045, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
contactGroup.add(new THREE.Points(cpGeo, cpMat));

const gridHelper = new THREE.GridHelper(28, 56, 0x3a1525, 0x14101a);
gridHelper.position.y = -0.58;
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// --- Scroll math ---
const CAMERAS = [
    { pos: [0, 3.2, 10.5], look: [0, 0.2, 0], fov: 42 },
    { pos: [2, 3.8, 5.5], look: [-1.2, 0.3, 0], fov: 44 },
    { pos: [3.5, 5.2, 4.5], look: [0, 1.4, -1], fov: 48 },
    { pos: [2.5, 2.8, 7], look: [4, 0, -3], fov: 45 },
    { pos: [0, 3, 5.5], look: [0, 0.2, 0], fov: 42 },
];
const SCENE_COUNT = 5;
const scrollState = { progress: 0, sceneIndex: 0 };

function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2; }

function getWeights(p) {
    const scaled = p * SCENE_COUNT;
    const idx = Math.min(Math.floor(scaled), SCENE_COUNT - 1);
    const local = ease(Math.min(scaled - idx, 1));
    const w = [0, 0, 0, 0, 0];
    w[idx] = 1 - local;
    if (idx < SCENE_COUNT - 1) w[idx + 1] = local;
    return { idx, local, w };
}

function setGroupOpacity(group, amount) {
    group.visible = amount > 0.02;
    group.traverse((obj) => {
        if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
                if (m.transparent || m.opacity !== undefined) {
                    m.transparent = true;
                    m.opacity = Math.min(1, amount * (m.userData.baseOpacity ?? 1));
                }
            });
        }
    });
}

// Store base opacities
[heroGroup, servicesGroup, aboutGroup, galleryGroup, contactGroup].forEach((g) => {
    g.traverse((obj) => {
        if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => { m.userData.baseOpacity = m.opacity ?? 1; m.transparent = true; });
        }
    });
});
backdrop.material.userData.baseOpacity = 0.5;

function updateScene3D(time) {
    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;

    const { idx, local, w } = getWeights(scrollState.progress);
    scrollState.sceneIndex = idx;

    // Camera blend
    const cur = CAMERAS[idx];
    const nxt = CAMERAS[Math.min(idx + 1, SCENE_COUNT - 1)];
    const ct = idx === SCENE_COUNT - 1 ? 0 : ease(local);
    const sway = Math.sin(time * 0.35) * 0.1;
    const parallax = 1 - scrollState.progress * 0.35;
    cameraPosition.set(
        lerp(cur.pos[0], nxt.pos[0], ct) + sway + pointer.x * 0.45 * parallax,
        lerp(cur.pos[1], nxt.pos[1], ct) - pointer.y * 0.28 * parallax,
        lerp(cur.pos[2], nxt.pos[2], ct)
    );
    cameraTarget.set(
        lerp(cur.look[0], nxt.look[0], ct) + pointer.x * 0.18 * parallax,
        lerp(cur.look[1], nxt.look[1], ct) + Math.sin(time * 0.4) * 0.04 - pointer.y * 0.1 * parallax,
        lerp(cur.look[2], nxt.look[2], ct)
    );
    camera.position.lerp(cameraPosition, 0.13);
    camera.fov = lerp(cur.fov, nxt.fov, ct);
    camera.updateProjectionMatrix();

    bloomPass.strength = prefersReducedMotion ? 0.25 : 0.45 + w[0] * 0.25 + w[3] * 0.2 + w[4] * 0.35;

    canvas.style.opacity = 1;

    // Backdrop
    backdrop.rotation.y = time * 0.035 + scrollState.progress * 0.4;
    backdrop.material.opacity = (0.25 + w[0] * 0.35) * Math.max(w[0], 0.15);

    // Scene weights
    setGroupOpacity(heroGroup, w[0]);
    setGroupOpacity(servicesGroup, w[1]);
    setGroupOpacity(aboutGroup, w[2]);
    setGroupOpacity(galleryGroup, w[3]);
    setGroupOpacity(contactGroup, w[4]);

    // HERO carpet
    carpetGroup.rotation.y = scrollState.progress * Math.PI * 2.5 + time * 0.3;
    carpetGroup.rotation.x = -0.08 + Math.sin(time * 1.1) * 0.06 + pointer.y * 0.04;
    carpetGroup.rotation.z = Math.sin(time * 0.6) * 0.04 + pointer.x * 0.03;
    carpetGroup.position.y = Math.sin(time * 1.4) * 0.12;
    carpetGroup.scale.setScalar(1 + Math.sin(time * 1.8) * 0.03);
    heroGlow.intensity = 0.6 + w[0] * 2.2 + Math.sin(time * 2.5) * 0.4;
    heroGlow.position.x = Math.sin(time * 0.8) * 0.6;
    dustMat.opacity = 0.3 + w[0] * 0.4;

    // SERVICES
    const mT = ease(w[1]);
    machineGroup.position.set(lerp(4.5, 0.5, mT), Math.sin(time * 2) * 0.04, 0.5);
    machineGroup.rotation.y = lerp(-0.1, -0.85, mT);
    nozzle.rotation.x = Math.sin(time * 6) * 0.07;
    sprayCone.material.opacity = 0.08 + w[1] * 0.15;
    sprayCone.scale.set(1 + Math.sin(time * 8) * 0.08, 1 + w[1] * 0.3, 1 + Math.sin(time * 8) * 0.08);
    carpetCleanMat.map = mT > 0.35 ? cleanTex : dirtyTex;
    carpetClean.rotation.y = 0.3;
    cleanOverlay.material.opacity = THREE.MathUtils.smoothstep(mT, 0.25, 0.85);
    cleanOverlay.scale.x = THREE.MathUtils.lerp(0.05, 1, mT);
    cleanOverlay.position.x = THREE.MathUtils.lerp(-2.4, 0, mT);
    steamMat.opacity = w[1] * 0.55;
    sparkleMat.opacity = Math.max(0, (mT - 0.45) * 1.4) * w[1];

    if (w[1] > 0.05) {
        const arr = foamGeo.attributes.position.array;
        for (let i = 0; i < foamCount; i++) {
            arr[i * 3] += foamVel[i * 3];
            arr[i * 3 + 1] += foamVel[i * 3 + 1];
            arr[i * 3 + 2] += foamVel[i * 3 + 2];
            foamLife[i] += 0.025;
            if (foamLife[i] > 1 || arr[i * 3] < -4) resetFoam(i);
        }
        foamGeo.attributes.position.needsUpdate = true;

        const sArr = steamGeo.attributes.position.array;
        for (let i = 0; i < steamCount; i++) {
            sArr[i * 3] += steamVel[i * 3] + Math.sin(time * 3 + i) * 0.001;
            sArr[i * 3 + 1] += steamVel[i * 3 + 1];
            sArr[i * 3 + 2] += steamVel[i * 3 + 2];
            steamLife[i] += 0.018;
            if (steamLife[i] > 1 || sArr[i * 3 + 1] > 2.5) resetSteam(i);
        }
        steamGeo.attributes.position.needsUpdate = true;

        const spArr = sparkleGeo.attributes.position.array;
        for (let i = 0; i < sparkleCount; i++) {
            spArr[i * 3 + 1] = 0.2 + Math.sin(time * 4 + sparklePhase[i]) * 0.08 + mT * 0.05;
        }
        sparkleGeo.attributes.position.needsUpdate = true;
    }

    // ABOUT
    orbitRings.rotation.y = time * 0.5;
    orbitRings.children.forEach((ring, i) => {
        ring.rotation.z = time * (0.5 + i * 0.2);
        ring.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.05);
    });
    aboutCarpet.rotation.x = -Math.PI / 2 + 0.25;
    aboutCarpet.rotation.z = time * 0.15;
    aboutCarpet.position.y = 1.8 + Math.sin(time * 1.2) * 0.1;
    orbs.forEach((orb, i) => {
        const angle = time * 0.8 + (i / 3) * Math.PI * 2;
        orb.position.set(Math.cos(angle) * 2.2, 1.5 + Math.sin(time + i) * 0.2, Math.sin(angle) * 2.2 - 1);
    });

    // GALLERY — abstract frames on the right, no photos
    const gT = ease(w[3]);
    galleryGroup.rotation.y = time * 0.12 + gT * 0.4;
    gallerySpot.intensity = w[3] * 3;
    galleryFrames3D.forEach((frame, i) => {
        const angle = time * 0.3 + i * 0.8;
        frame.position.y = frameLayout[i].pos[1] + Math.sin(angle) * 0.15;
        frame.rotation.y = frameLayout[i].rot + Math.sin(time * 0.5 + i) * 0.1;
        frame.scale.setScalar(0.8 + gT * 0.25);
        const inner = frame.children[1];
        if (inner?.material?.emissiveIntensity !== undefined) {
            inner.material.emissiveIntensity = 0.35 + Math.sin(time * 2 + i * 1.2) * 0.25 + w[3] * 0.5;
        }
    });
    helixMat.opacity = 0.3 + w[3] * 0.5;

    // CONTACT
    const cT = ease(w[4]);
    portalRing.rotation.z = time * 0.7;
    portalRing2.rotation.z = -time * 0.95;
    portalRing3.rotation.z = time * 0.45;
    portalRing3.scale.setScalar(1.35 + Math.sin(time * 1.8) * 0.06);
    portalCore.material.opacity = 0.05 + cT * 0.18 + Math.sin(time * 3) * 0.04;
    portalCore.scale.setScalar(1 + Math.sin(time * 2.2) * 0.08);
    contactGroup.rotation.y = Math.sin(time * 0.3) * 0.2 + pointer.x * 0.08;
    contactGroup.scale.setScalar(0.8 + cT * 0.25 + Math.sin(time * 1.2) * 0.03);
    logoPlane.rotation.z = Math.sin(time * 0.4) * 0.06;

    const cpArr = cpGeo.attributes.position.array;
    for (let i = 0; i < contactParticles; i++) {
        const a = (i / contactParticles) * Math.PI * 2 + time * 0.4;
        const r = 2.2 + Math.sin(a * 3) * 0.4;
        cpArr[i * 3] = Math.cos(a) * r;
        cpArr[i * 3 + 2] = Math.sin(a) * r;
    }
    cpGeo.attributes.position.needsUpdate = true;

    gridHelper.material.opacity = 0.08 + (w[0] + w[1] + w[2]) * 0.15 + w[3] * 0.1;
    spotLight.intensity = 2 + w[1] * 2;
    rimLight.intensity = 1 + w[0] * 0.8 + w[3] * 0.5;
}

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    updateScene3D(clock.getElapsedTime());
    camera.lookAt(cameraTarget);
    composer.render();
}
animate();

// --- Scroll ---
let lenis;
if (!prefersReducedMotion) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ({ scroll, progress }) => {
        scrollState.progress = progress;
        progressBar.style.width = `${progress * 100}%`;
        nav.classList.toggle('scrolled', scroll > 50);
        document.querySelector('.scroll-hint')?.style.setProperty('opacity', scroll > 80 ? '0' : '1');
        updateActiveNav();
        updateCardTilts();
        ScrollTrigger.update();
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
} else {
    window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollState.progress = window.scrollY / max;
        progressBar.style.width = `${scrollState.progress * 100}%`;
    });
}

if (!prefersReducedMotion) {
    gsap.from('#hero .reveal-item', { opacity: 0, y: 60, duration: 1.1, stagger: 0.15, ease: 'power3.out', delay: 0.2 });

    panels.forEach((panel) => {
        if (panel.id === 'hero' || panel.id === 'gallery') return;
        gsap.fromTo(panel.querySelectorAll('.reveal-item'), { opacity: 0, y: 45, filter: 'blur(6px)' }, {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, stagger: 0.1, ease: 'power2.out',
            scrollTrigger: { trigger: panel, start: 'top 70%', toggleActions: 'play none none none' },
        });
    });

    gsap.from('#gallery .gallery-header .reveal-item', { opacity: 0, y: 35, duration: 0.8, stagger: 0.12, ease: 'power2.out',
        scrollTrigger: { trigger: '#gallery', start: 'top 70%', toggleActions: 'play none none none' } });

    document.querySelectorAll('.gallery-frame').forEach((frame) => {
        gsap.fromTo(frame, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
            scrollTrigger: { trigger: frame, start: 'top 92%', toggleActions: 'play none none none', once: true } });
    });

    gsap.to('.hero-title .title-accent', { backgroundPosition: '200% center', duration: 5, repeat: -1, ease: 'none' });
}

function updateCardTilts() {
    if (prefersReducedMotion) return;
    const about = document.getElementById('about');
    if (!about) return;
    const dist = ((about.getBoundingClientRect().top + about.offsetHeight / 2) - window.innerHeight / 2) / window.innerHeight;
    document.querySelectorAll('.info-card').forEach((card, i) => {
        card.style.transform = `perspective(900px) rotateX(${-dist * 10}deg) rotateY(${dist * 18 + (i - 1) * 12}deg) translateZ(${Math.max(0, 50 - Math.abs(dist) * 40)}px)`;
    });
}

function updateActiveNav() {
    document.querySelectorAll('.nav-link').forEach((link) => {
        link.classList.toggle('active', parseInt(link.dataset.index, 10) === scrollState.sceneIndex);
    });
}

document.querySelectorAll('.nav-link, .cta-btn').forEach((el) => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(el.getAttribute('href') || el.dataset.scrollTo);
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('nav-menu')?.classList.remove('open');
        document.getElementById('nav-toggle')?.classList.remove('open');
    });
});

document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-menu').classList.toggle('open');
    document.getElementById('nav-toggle').classList.toggle('open');
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

updateScene3D(0);
