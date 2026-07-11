import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

const ASSETS = {
    logo: 'assets/logo.png',
    heroBg: 'assets/hero-bg.jpg',
    carpet: 'assets/gallery/3.jpg',
};

const canvas = document.getElementById('webgl-canvas');
const progressBar = document.querySelector('.scroll-progress-bar');
const nav = document.getElementById('nav');
const panels = gsap.utils.toArray('.panel');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08080d, 0.028);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
const cameraTarget = new THREE.Vector3(0, 0.4, 0);
const cameraPosition = new THREE.Vector3(0, 2.8, 9);

const loader = new THREE.TextureLoader();
const textures = {};

function loadTexture(key, url) {
    return new Promise((resolve) => {
        loader.load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                textures[key] = tex;
                resolve(tex);
            },
            undefined,
            () => {
                console.warn(`Texture not loaded: ${url}`);
                resolve(null);
            }
        );
    });
}

await Promise.all([
    loadTexture('heroBg', ASSETS.heroBg),
    loadTexture('carpet', ASSETS.carpet),
    loadTexture('logo', ASSETS.logo),
]);

const fallbackCarpet = new THREE.CanvasTexture(createFallbackCarpet());
fallbackCarpet.colorSpace = THREE.SRGBColorSpace;
fallbackCarpet.wrapS = fallbackCarpet.wrapT = THREE.RepeatWrapping;
fallbackCarpet.repeat.set(2, 1);

function createFallbackCarpet() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(0, 0, size, size);
    return c;
}

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const keyLight = new THREE.DirectionalLight(0xfff2e6, 1.4);
keyLight.position.set(6, 10, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xf11414, 1.1);
rimLight.position.set(-5, 3, -4);
scene.add(rimLight);

const spotLight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 5, 0.4, 1);
spotLight.position.set(0, 8, 2);
scene.add(spotLight);

// Hero backdrop from real photo
const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 48),
    new THREE.MeshBasicMaterial({
        map: textures.heroBg || null,
        color: textures.heroBg ? 0xffffff : 0x12080c,
        side: THREE.BackSide,
        opacity: textures.heroBg ? 0.55 : 0.9,
        transparent: true,
    })
);
scene.add(backdrop);

// Carpet with real texture
const carpetGroup = new THREE.Group();
const carpetMat = new THREE.MeshStandardMaterial({
    map: textures.carpet || fallbackCarpet,
    roughness: 0.82,
    metalness: 0.04,
});
const carpet = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 3.2, 40, 1, 24), carpetMat);
carpetGroup.add(carpet);

const fringeMat = new THREE.MeshStandardMaterial({ color: 0x6e4f2e, roughness: 0.92 });
[-2.65, 2.65].forEach((x) => {
    carpetGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 3.25), fringeMat).translateX(x));
});
scene.add(carpetGroup);

// Cleaning machine
const machineGroup = new THREE.Group();
const machineMat = new THREE.MeshStandardMaterial({ color: 0x232330, metalness: 0.65, roughness: 0.28 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xb40606, metalness: 0.45, roughness: 0.35 });

const machineBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.75), machineMat);
machineBody.position.y = 0.48;
machineGroup.add(machineBody);

const machineTank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.95, 20), redMat);
machineTank.position.set(0.55, 1.15, 0);
machineGroup.add(machineTank);

const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.28), machineMat);
nozzle.position.set(-0.95, 0.28, 0.45);
machineGroup.add(nozzle);

scene.add(machineGroup);

// Foam particles
const foamCount = prefersReducedMotion ? 120 : 420;
const foamGeo = new THREE.BufferGeometry();
const foamPos = new Float32Array(foamCount * 3);
const foamVel = new Float32Array(foamCount * 3);
const foamLife = new Float32Array(foamCount);

for (let i = 0; i < foamCount; i++) resetFoam(i);
function resetFoam(i, origin = new THREE.Vector3(-1.2, 0.35, 0.3)) {
    foamPos[i * 3] = origin.x + (Math.random() - 0.5) * 0.2;
    foamPos[i * 3 + 1] = origin.y + Math.random() * 0.15;
    foamPos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.2;
    foamVel[i * 3] = -0.02 - Math.random() * 0.03;
    foamVel[i * 3 + 1] = 0.01 + Math.random() * 0.025;
    foamVel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    foamLife[i] = Math.random();
}
foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
const foamMat = new THREE.PointsMaterial({
    color: 0xc8ecff,
    size: 0.07,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
const foam = new THREE.Points(foamGeo, foamMat);
scene.add(foam);

// About orbit rings (abstract, no images)
const orbitGroup = new THREE.Group();
for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6 + i * 0.45, 0.025, 12, 80),
        new THREE.MeshStandardMaterial({
            color: 0xf11414,
            emissive: 0x7a0303,
            emissiveIntensity: 0.6,
            metalness: 0.85,
            roughness: 0.15,
            transparent: true,
            opacity: 0.85,
        })
    );
    ring.rotation.x = Math.PI / 2 + i * 0.35;
    ring.rotation.y = i * 1.1;
    orbitGroup.add(ring);
}
scene.add(orbitGroup);

// Gallery 3D — light corridor only (no duplicate photos)
const galleryLightGroup = new THREE.Group();
const beamMat = new THREE.MeshBasicMaterial({
    color: 0xf11414,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
});
for (let i = 0; i < 5; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 8), beamMat.clone());
    beam.position.set((i - 2) * 1.4, 2, -i * 0.8);
    beam.rotation.x = -0.4;
    beam.rotation.y = (i - 2) * 0.18;
    galleryLightGroup.add(beam);
}
const galleryFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({
        color: 0x111118,
        metalness: 0.9,
        roughness: 0.15,
        transparent: true,
        opacity: 0.5,
    })
);
galleryFloor.rotation.x = -Math.PI / 2;
galleryFloor.position.y = -0.55;
galleryLightGroup.add(galleryFloor);
scene.add(galleryLightGroup);

// Contact portal with logo
const contactGroup = new THREE.Group();
const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.045, 20, 120),
    new THREE.MeshStandardMaterial({ color: 0xf11414, emissive: 0xb40606, emissiveIntensity: 0.7, metalness: 0.9, roughness: 0.1 })
);
portalRing.rotation.x = Math.PI / 2;
contactGroup.add(portalRing);

const portalRing2 = portalRing.clone();
portalRing2.scale.setScalar(0.72);
portalRing2.material = portalRing.material.clone();
portalRing2.material.emissiveIntensity = 0.35;
contactGroup.add(portalRing2);

const logoPlane = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 48),
    new THREE.MeshBasicMaterial({
        map: textures.logo || null,
        color: textures.logo ? 0xffffff : 0xf11414,
        transparent: true,
    })
);
logoPlane.position.z = 0.15;
contactGroup.add(logoPlane);
scene.add(contactGroup);

const gridHelper = new THREE.GridHelper(24, 48, 0x2a1020, 0x12121a);
gridHelper.position.y = -0.55;
gridHelper.material.opacity = 0.22;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Camera keyframes per scene
const CAMERAS = [
    { pos: [0, 2.8, 9], look: [0, 0.2, 0] },
    { pos: [1.2, 3.2, 5.5], look: [-0.8, 0.3, 0] },
    { pos: [2.5, 4.2, 4.5], look: [0, 1.2, -1] },
    { pos: [0, 1.8, 8], look: [0, 0.5, -2] },
    { pos: [0, 2.5, 5.5], look: [0, 0.2, 0] },
];

const scrollState = { progress: 0, sceneIndex: 0, sceneProgress: 0, blend: 0 };
const SCENE_COUNT = 5;

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpScene(a, b, t) {
    return a + (b - a) * t;
}

function getSceneFromProgress(p) {
    const scaled = p * SCENE_COUNT;
    const idx = Math.min(Math.floor(scaled), SCENE_COUNT - 1);
    return { idx, local: easeInOutCubic(Math.min(scaled - idx, 1)) };
}

function blendCamera(idx, local) {
    const current = CAMERAS[idx];
    const next = CAMERAS[Math.min(idx + 1, SCENE_COUNT - 1)];
    const t = idx === SCENE_COUNT - 1 ? 0 : local;

    cameraPosition.set(
        lerpScene(current.pos[0], next.pos[0], t * 0.35),
        lerpScene(current.pos[1], next.pos[1], t * 0.35),
        lerpScene(current.pos[2], next.pos[2], t * 0.35)
    );
    cameraTarget.set(
        lerpScene(current.look[0], next.look[0], t * 0.35),
        lerpScene(current.look[1], next.look[1], t * 0.35),
        lerpScene(current.look[2], next.look[2], t * 0.35)
    );
    camera.position.lerp(cameraPosition, 0.12);
}

function updateScene3D(time) {
    const { idx, local } = getSceneFromProgress(scrollState.progress);
    scrollState.sceneIndex = idx;
    scrollState.sceneProgress = local;

    blendCamera(idx, local);

    const show = (group, amount) => { group.visible = amount > 0.02; };

    // Global backdrop
    backdrop.material.opacity = 0.35 + (idx === 0 ? 0.25 * (1 - local) : 0);

    // Scene weights for smooth crossfade
    const weights = [0, 0, 0, 0, 0];
    weights[idx] = 1 - local;
    if (idx < SCENE_COUNT - 1) weights[idx + 1] = local;

    // Hero + carpet base
    const carpetWeight = weights[0] + weights[1] + weights[2];
    carpetGroup.visible = carpetWeight > 0.05;
    carpetMat.color.setRGB(
        lerpScene(0.72, 1, weights[1] + weights[2]),
        lerpScene(0.68, 1, weights[1] + weights[2]),
        lerpScene(0.62, 1, weights[1] + weights[2])
    );

    carpetGroup.rotation.y = scrollState.progress * Math.PI * 1.6 + time * 0.15 * weights[0];
    carpetGroup.rotation.x = -0.12 + weights[2] * (-Math.PI / 2 + 0.35);
    carpetGroup.position.set(
        lerpScene(0, -1.6, weights[1]),
        lerpScene(0, 1.6, weights[2]),
        lerpScene(0, -1.8, weights[2])
    );
    carpetGroup.scale.setScalar(lerpScene(1, 0.85, weights[2]));

    // Services
    show(machineGroup, weights[1]);
    machineGroup.position.set(lerpScene(3.5, 1.2, local * weights[1]), 0, 0.6);
    machineGroup.rotation.y = -0.35 - local * 0.4;
    foamMat.opacity = weights[1] * 0.85;

    if (weights[1] > 0.05) {
        const arr = foamGeo.attributes.position.array;
        for (let i = 0; i < foamCount; i++) {
            arr[i * 3] += foamVel[i * 3];
            arr[i * 3 + 1] += foamVel[i * 3 + 1];
            arr[i * 3 + 2] += foamVel[i * 3 + 2];
            foamLife[i] += 0.02;
            if (foamLife[i] > 1 || arr[i * 3] < -3) resetFoam(i);
        }
        foamGeo.attributes.position.needsUpdate = true;
    }

    // About rings
    show(orbitGroup, weights[2]);
    orbitGroup.rotation.y = time * 0.35;
    orbitGroup.position.copy(carpetGroup.position);
    orbitGroup.children.forEach((ring, i) => {
        ring.rotation.z = time * (0.4 + i * 0.15);
    });

    // Gallery lights only
    show(galleryLightGroup, weights[3]);
    galleryLightGroup.rotation.y = local * 0.6 + time * 0.08;
    galleryLightGroup.children.forEach((child, i) => {
        if (child.material?.opacity !== undefined && i < 5) {
            child.material.opacity = 0.08 + Math.sin(time * 1.5 + i) * 0.05 + weights[3] * 0.1;
        }
    });

    // Contact portal
    show(contactGroup, weights[4]);
    portalRing.rotation.z = time * 0.55;
    portalRing2.rotation.z = -time * 0.75;
    contactGroup.rotation.y = Math.sin(time * 0.25) * 0.15;
    logoPlane.rotation.z = Math.sin(time * 0.4) * 0.05;

    gridHelper.material.opacity = 0.12 + carpetWeight * 0.12;
    spotLight.intensity = 1.5 + weights[1] * 1.2;
}

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    updateScene3D(t);
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
}
animate();

// Lenis + scroll
let lenis;
if (!prefersReducedMotion) {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true });

    lenis.on('scroll', ({ scroll, progress }) => {
        scrollState.progress = progress;
        progressBar.style.width = `${progress * 100}%`;
        nav.classList.toggle('scrolled', scroll > 50);
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
        updateScene3D(0);
    });
}

// Content animations
if (!prefersReducedMotion) {
    panels.forEach((panel) => {
        const items = panel.querySelectorAll('.reveal-item');
        gsap.fromTo(items,
            { opacity: 0, y: 50, rotateX: 8 },
            {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.9,
                stagger: 0.12,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: panel,
                    start: 'top 72%',
                    toggleActions: 'play none none reverse',
                },
            }
        );
    });

    document.querySelectorAll('.gallery-frame').forEach((frame, i) => {
        gsap.fromTo(frame,
            { opacity: 0, scale: 0.85, rotateY: i % 2 ? 12 : -12 },
            {
                opacity: 1,
                scale: 1,
                rotateY: 0,
                duration: 1,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: frame,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                },
            }
        );

        gsap.to(frame, {
            y: -30 * (i % 2 ? 1 : -1),
            ease: 'none',
            scrollTrigger: {
                trigger: '#gallery',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.8,
            },
        });
    });

    gsap.to('.hero-title .title-accent', {
        backgroundPosition: '200% center',
        duration: 4,
        repeat: -1,
        ease: 'none',
    });
}

function updateCardTilts() {
    if (prefersReducedMotion) return;
    const aboutPanel = document.getElementById('about');
    if (!aboutPanel) return;
    const rect = aboutPanel.getBoundingClientRect();
    const dist = ((rect.top + rect.height / 2) - window.innerHeight / 2) / window.innerHeight;

    document.querySelectorAll('.info-card').forEach((card, i) => {
        const offset = (i - 1) * 12;
        card.style.transform = `perspective(900px) rotateX(${-dist * 10}deg) rotateY(${dist * 18 + offset}deg) translateZ(${Math.max(0, 50 - Math.abs(dist) * 40)}px)`;
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
});

updateScene3D(0);
