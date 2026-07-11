import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

const ASSETS = {
    logo: 'assets/logo.png',
    heroBg: 'assets/hero-bg.jpg',
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
    loadTexture('logo', ASSETS.logo),
]);

const carpetTex = createCarpetTexture();
carpetTex.colorSpace = THREE.SRGBColorSpace;
carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
carpetTex.repeat.set(3, 2);

function createCarpetTexture() {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a5535';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 3 + Math.random() * 8;
        const angle = Math.random() * Math.PI;
        const shade = 90 + Math.random() * 70;
        ctx.strokeStyle = `rgba(${shade}, ${shade * 0.72}, ${shade * 0.48}, 0.55)`;
        ctx.lineWidth = 0.4 + Math.random();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 8 + Math.random() * 25;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(35, 22, 12, 0.45)');
        g.addColorStop(1, 'rgba(35, 22, 12, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return new THREE.CanvasTexture(c);
}

const cleanCarpetTex = createCleanCarpetTexture();
cleanCarpetTex.colorSpace = THREE.SRGBColorSpace;
cleanCarpetTex.wrapS = cleanCarpetTex.wrapT = THREE.RepeatWrapping;
cleanCarpetTex.repeat.set(3, 2);

function createCleanCarpetTexture() {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 2 + Math.random() * 6;
        const angle = Math.random() * Math.PI;
        const shade = 200 + Math.random() * 40;
        ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade - 8}, 0.35)`;
        ctx.lineWidth = 0.3 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
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
    map: carpetTex,
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

// Gallery section — no 3D visuals (HTML gallery only)
const galleryLightGroup = new THREE.Group();
galleryLightGroup.visible = false;
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
    { pos: [0, 3.2, 10], look: [0, 0.3, 0] },
    { pos: [1.8, 3.6, 5], look: [-1, 0.4, 0] },
    { pos: [3.2, 5, 4], look: [0, 1.5, -1.2] },
    { pos: [0, 2.5, 9], look: [0, 0, 0] },
    { pos: [0, 2.8, 4.8], look: [0, 0.3, 0] },
];

const scrollState = { progress: 0, sceneIndex: 0, sceneProgress: 0, render3D: true };
const SCENE_COUNT = 5;

function lerpScene(a, b, t) {
    return a + (b - a) * t;
}

function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function getSceneFromProgress(p) {
    const scaled = p * SCENE_COUNT;
    const idx = Math.min(Math.floor(scaled), SCENE_COUNT - 1);
    return { idx, local: easeInOutQuart(Math.min(scaled - idx, 1)) };
}

function blendCamera(idx, local, time) {
    const current = CAMERAS[idx];
    const next = CAMERAS[Math.min(idx + 1, SCENE_COUNT - 1)];
    const t = idx === SCENE_COUNT - 1 ? 0 : easeInOutQuart(local);
    const sway = Math.sin(time * 0.4) * 0.12;

    cameraPosition.set(
        lerpScene(current.pos[0], next.pos[0], t) + sway,
        lerpScene(current.pos[1], next.pos[1], t),
        lerpScene(current.pos[2], next.pos[2], t)
    );
    cameraTarget.set(
        lerpScene(current.look[0], next.look[0], t),
        lerpScene(current.look[1], next.look[1], t) + Math.sin(time * 0.5) * 0.05,
        lerpScene(current.look[2], next.look[2], t)
    );
    camera.position.lerp(cameraPosition, 0.14);
    camera.fov = lerpScene(42, 48, weightsBlend(idx, local, 2));
    camera.updateProjectionMatrix();
}

function weightsBlend(idx, local, targetIdx) {
    const w = [0, 0, 0, 0, 0];
    w[idx] = 1 - local;
    if (idx < SCENE_COUNT - 1) w[idx + 1] = local;
    return w[targetIdx] || 0;
}

function setGalleryMode(active, fade = 0) {
    const on = active || fade > 0.02;
    document.body.classList.toggle('gallery-active', on);
    canvas.classList.toggle('is-hidden', on);
    scrollState.render3D = !on;
}

function updateScene3D(time) {
    const { idx, local } = getSceneFromProgress(scrollState.progress);
    scrollState.sceneIndex = idx;
    scrollState.sceneProgress = local;

    const weights = [0, 0, 0, 0, 0];
    weights[idx] = 1 - local;
    if (idx < SCENE_COUNT - 1) weights[idx + 1] = local;

    const galleryActive = weights[3];
    const approachingGallery = weights[2] > 0.1 && weights[3] > 0;
    const exitGallery = weights[3] > 0 && weights[4] > 0;

    // Fade 3D out before gallery, stay off through gallery
    const scene3DFade = Math.max(0, 1 - easeInOutQuart(Math.min(1, galleryActive * 2.2 + approachingGallery * 0.4)));
    canvas.style.opacity = scene3DFade;
    setGalleryMode(galleryActive > 0.2 || (galleryActive > 0.05 && !exitGallery), galleryActive);

    if (!scrollState.render3D) {
        return;
    }

    blendCamera(idx, local, time);

    backdrop.rotation.y = time * 0.04 + scrollState.progress * 0.3;

    // Fade out about scene early when heading to gallery
    const preGalleryFade = 1 - easeInOutQuart(Math.min(1, galleryActive * 3 + weights[2] * approachingGallery * 0.15));

    backdrop.visible = true;
    gridHelper.visible = true;
    backdrop.material.opacity = (0.3 + weights[0] * 0.35) * preGalleryFade;

    const carpetWeight = (weights[0] + weights[1] + weights[2]) * preGalleryFade;
    carpetGroup.visible = carpetWeight > 0.05;

    const cleanBlend = Math.min(1, weights[1] * 1.5 + weights[2]);
    carpetMat.map = cleanBlend > 0.55 ? cleanCarpetTex : carpetTex;
    carpetMat.color.setRGB(
        lerpScene(0.7, 1, cleanBlend),
        lerpScene(0.65, 1, cleanBlend),
        lerpScene(0.58, 1, cleanBlend)
    );

    const heroBoost = weights[0];
    carpetGroup.rotation.y = scrollState.progress * Math.PI * 2.2 + time * 0.32 * heroBoost;
    carpetGroup.rotation.x = -0.1 + Math.sin(time * 1.2) * 0.07 * heroBoost + weights[2] * (-Math.PI / 2 + 0.38);
    carpetGroup.rotation.z = Math.sin(time * 0.75) * 0.06 * heroBoost;
    carpetGroup.position.set(
        lerpScene(0, -1.5, easeInOutQuart(weights[1])),
        lerpScene(Math.sin(time * 1.4) * 0.14, 1.7, easeInOutQuart(weights[2])),
        lerpScene(0, -1.6, easeInOutQuart(weights[2]))
    );
    carpetGroup.scale.setScalar(lerpScene(1 + Math.sin(time * 2) * 0.035, 0.86, easeInOutQuart(weights[2])));

    machineGroup.visible = weights[1] > 0.04;
    const machineT = easeInOutQuart(weights[1]);
    machineGroup.position.set(
        lerpScene(4.2, 0.6, machineT),
        Math.sin(time * 2.5) * 0.04,
        0.5 + Math.sin(time * 1.8) * 0.08
    );
    machineGroup.rotation.y = lerpScene(-0.2, -0.9, machineT);
    nozzle.rotation.x = Math.sin(time * 5) * 0.06;
    foamMat.opacity = weights[1] * 0.9;

    if (weights[1] > 0.05) {
        const arr = foamGeo.attributes.position.array;
        for (let i = 0; i < foamCount; i++) {
            arr[i * 3] += foamVel[i * 3] * 1.4;
            arr[i * 3 + 1] += foamVel[i * 3 + 1] * 1.4;
            arr[i * 3 + 2] += foamVel[i * 3 + 2] * 1.4;
            foamLife[i] += 0.03;
            if (foamLife[i] > 1 || arr[i * 3] < -3.5) resetFoam(i);
        }
        foamGeo.attributes.position.needsUpdate = true;
    }

    orbitGroup.visible = weights[2] > 0.04 && preGalleryFade > 0.1;
    orbitGroup.rotation.y = time * 0.45;
    orbitGroup.position.copy(carpetGroup.position);
    orbitGroup.children.forEach((ring, i) => {
        ring.rotation.z = time * (0.45 + i * 0.18);
        ring.scale.setScalar(1 + Math.sin(time * 1.8 + i * 1.2) * 0.05);
    });

    const contactT = easeInOutQuart(weights[4]);
    contactGroup.visible = contactT > 0.04;
    portalRing.rotation.z = time * 0.65;
    portalRing2.rotation.z = -time * 0.9;
    contactGroup.rotation.y = Math.sin(time * 0.3) * 0.2;
    contactGroup.scale.setScalar(0.85 + contactT * 0.2 + Math.sin(time * 1.2) * 0.03);
    logoPlane.rotation.z = Math.sin(time * 0.45) * 0.06;

    gridHelper.material.opacity = 0.1 + carpetWeight * 0.18;
    spotLight.intensity = 1.8 + weights[1] * 1.8;
    rimLight.intensity = 1.1 + weights[0] * 0.6;
}

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    updateScene3D(t);
    if (scrollState.render3D) {
        camera.lookAt(cameraTarget);
        renderer.render(scene, camera);
    }
}
animate();

// Lenis + scroll
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
        updateScene3D(0);
    });
}

// Content animations
if (!prefersReducedMotion) {
    gsap.from('#hero .reveal-item', {
        opacity: 0,
        y: 60,
        duration: 1.1,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.2,
    });

    panels.forEach((panel) => {
        if (panel.id === 'hero' || panel.id === 'gallery') return;
        const items = panel.querySelectorAll('.reveal-item');
        gsap.fromTo(items,
            { opacity: 0, y: 45, filter: 'blur(6px)' },
            {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.85,
                stagger: 0.1,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: panel,
                    start: 'top 70%',
                    toggleActions: 'play none none none',
                },
            }
        );
    });

    gsap.from('#gallery .gallery-header .reveal-item', {
        opacity: 0,
        y: 35,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
            trigger: '#gallery',
            start: 'top 70%',
            toggleActions: 'play none none none',
        },
    });

    document.querySelectorAll('.gallery-frame').forEach((frame, i) => {
        gsap.fromTo(frame,
            { opacity: 0, y: 30 },
            {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: frame,
                    start: 'top 92%',
                    toggleActions: 'play none none none',
                    once: true,
                },
            }
        );
    });

    gsap.to('.hero-title .title-accent', {
        backgroundPosition: '200% center',
        duration: 5,
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
