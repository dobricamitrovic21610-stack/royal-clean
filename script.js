import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('webgl-canvas');
const progressBar = document.querySelector('.scroll-progress-bar');
const nav = document.getElementById('nav');
const panels = gsap.utils.toArray('.panel');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Three.js setup ---
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.5, 8);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(5, 8, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xf11414, 0.8);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x4488ff, 0.5, 20);
fillLight.position.set(0, 3, 4);
scene.add(fillLight);

// --- Carpet (main 3D object) ---
function createCarpetTexture(dirty = true) {
    const size = 256;
    const canvas2d = document.createElement('canvas');
    canvas2d.width = size;
    canvas2d.height = size;
    const ctx = canvas2d.getContext('2d');

    const baseColor = dirty ? [120, 85, 55] : [220, 215, 205];
    ctx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 2 + Math.random() * 6;
        const angle = Math.random() * Math.PI;
        const shade = dirty
            ? 70 + Math.random() * 60
            : 190 + Math.random() * 50;
        ctx.strokeStyle = dirty
            ? `rgba(${shade}, ${shade * 0.7}, ${shade * 0.45}, 0.6)`
            : `rgba(${shade}, ${shade}, ${shade - 10}, 0.4)`;
        ctx.lineWidth = 0.5 + Math.random();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
    }

    if (dirty) {
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 5 + Math.random() * 20;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(40, 25, 15, 0.5)');
            grad.addColorStop(1, 'rgba(40, 25, 15, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
    }

    const tex = new THREE.CanvasTexture(canvas2d);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
}

const dirtyTex = createCarpetTexture(true);
const cleanTex = createCarpetTexture(false);

const carpetGroup = new THREE.Group();
const carpetGeo = new THREE.BoxGeometry(5, 0.15, 3, 32, 1, 16);
const carpetMat = new THREE.MeshStandardMaterial({
    map: dirtyTex,
    roughness: 0.85,
    metalness: 0.05,
});
const carpet = new THREE.Mesh(carpetGeo, carpetMat);
carpet.castShadow = true;
carpet.receiveShadow = true;
carpetGroup.add(carpet);

// Carpet fringe edges
const fringeMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
[-2.55, 2.55].forEach((x) => {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 3.1), fringeMat);
    fringe.position.x = x;
    carpetGroup.add(fringe);
});

scene.add(carpetGroup);

// --- Cleaning machine (simple geometric) ---
const machineGroup = new THREE.Group();
machineGroup.visible = false;

const machineBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2a2a35, metalness: 0.6, roughness: 0.3 })
);
machineBody.position.y = 0.5;
machineGroup.add(machineBody);

const machineTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.9, 16),
    new THREE.MeshStandardMaterial({ color: 0xb40606, metalness: 0.4, roughness: 0.4 })
);
machineTank.position.set(0.5, 1.1, 0);
machineGroup.add(machineTank);

const nozzle = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.15, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.2 })
);
nozzle.position.set(-0.8, 0.3, 0.4);
machineGroup.add(nozzle);

machineGroup.position.set(3, 0, 1);
scene.add(machineGroup);

// --- Bubbles / particles ---
const bubbleCount = prefersReducedMotion ? 80 : 300;
const bubbleGeo = new THREE.BufferGeometry();
const bubblePositions = new Float32Array(bubbleCount * 3);
const bubbleSizes = new Float32Array(bubbleCount);

for (let i = 0; i < bubbleCount; i++) {
    bubblePositions[i * 3] = (Math.random() - 0.5) * 6;
    bubblePositions[i * 3 + 1] = Math.random() * 4;
    bubblePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    bubbleSizes[i] = 0.02 + Math.random() * 0.06;
}

bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
bubbleGeo.setAttribute('size', new THREE.BufferAttribute(bubbleSizes, 1));

const bubbleMat = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.08,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
scene.add(bubbles);

// --- Gallery 3D frames ---
const galleryGroup = new THREE.Group();
galleryGroup.visible = false;
const frameMeshes = [];

const framePositions = [
    [-1.8, 1.2, 0],
    [1.8, 1.2, 0],
    [-1.8, -1.2, 0],
    [1.8, -1.2, 0],
];

const loader = new THREE.TextureLoader();
const placeholderColors = [0xb40606, 0x2a4a6b, 0x4a2a6b, 0x2a6b4a];

framePositions.forEach((pos, i) => {
    const frameGroup = new THREE.Group();

    const frameBorder = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a25, metalness: 0.5, roughness: 0.4 })
    );
    frameGroup.add(frameBorder);

    const imgGeo = new THREE.PlaneGeometry(1.4, 1.0);
    const imgMat = new THREE.MeshStandardMaterial({
        color: placeholderColors[i],
        roughness: 0.6,
        metalness: 0.1,
    });

    const imgNames = ['slika1.jpg', 'slika2.jpg', 'slika3.jpg', 'slika4.jpg'];
    loader.load(
        imgNames[i],
        (tex) => {
            imgMat.map = tex;
            imgMat.color.set(0xffffff);
            imgMat.needsUpdate = true;
        },
        undefined,
        () => {}
    );

    const imgPlane = new THREE.Mesh(imgGeo, imgMat);
    imgPlane.position.z = 0.05;
    frameGroup.add(imgPlane);

    frameGroup.position.set(...pos);
    frameGroup.rotation.y = (i % 2 === 0 ? -1 : 1) * 0.3;
    galleryGroup.add(frameGroup);
    frameMeshes.push(frameGroup);
});

scene.add(galleryGroup);

// --- Contact ring ---
const contactGroup = new THREE.Group();
contactGroup.visible = false;

const ringGeo = new THREE.TorusGeometry(2.5, 0.04, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf11414,
    emissive: 0xb40606,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
contactGroup.add(ring);

const ring2 = ring.clone();
ring2.scale.set(0.7, 0.7, 0.7);
ring2.material = ringMat.clone();
ring2.material.emissiveIntensity = 0.3;
contactGroup.add(ring2);

const starCount = prefersReducedMotion ? 40 : 150;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    const r = 2 + Math.random() * 1.5;
    starPos[i * 3] = Math.cos(angle) * r;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    starPos[i * 3 + 2] = Math.sin(angle) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xf11414, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
);
contactGroup.add(stars);

scene.add(contactGroup);

// --- Floor grid ---
const gridHelper = new THREE.GridHelper(20, 40, 0x1a1a2e, 0x111118);
gridHelper.position.y = -0.5;
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// --- Scroll state ---
const scrollState = {
    progress: 0,
    sceneIndex: 0,
    sceneProgress: 0,
    lookAt: new THREE.Vector3(0, 0, 0),
};

const SCENE_COUNT = 5;

function getSceneFromProgress(p) {
    const idx = Math.min(Math.floor(p * SCENE_COUNT), SCENE_COUNT - 1);
    const local = (p * SCENE_COUNT) - idx;
    return { idx, local: Math.min(local, 1) };
}

function updateScene3D() {
    const { idx, local } = getSceneFromProgress(scrollState.progress);
    scrollState.sceneIndex = idx;
    scrollState.sceneProgress = local;

    const t = local;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Reset visibility
    machineGroup.visible = idx === 1;
    galleryGroup.visible = idx === 3;
    contactGroup.visible = idx === 4;

    // Crossfade between scenes
    const fadeOut = 1 - ease;
    const fadeIn = ease;

    switch (idx) {
        case 0: {
            // Hero: rotating dirty carpet
            carpetGroup.visible = true;
            carpetGroup.rotation.y = scrollState.progress * Math.PI * 2;
            carpetGroup.rotation.x = Math.sin(scrollState.progress * Math.PI) * 0.15;
            carpetGroup.position.set(0, Math.sin(scrollState.progress * Math.PI * 4) * 0.1, 0);
            carpetGroup.scale.setScalar(1);
            carpetMat.map = dirtyTex;
            carpetMat.needsUpdate = true;
            camera.position.lerp(new THREE.Vector3(
                Math.sin(scrollState.progress * Math.PI) * 1.5,
                2.5 + Math.sin(scrollState.progress * Math.PI * 2) * 0.3,
                8 - scrollState.progress * 2
            ), 0.1);
            scrollState.lookAt.set(0, 0, 0);
            bubbleMat.opacity = 0;
            break;
        }
        case 1: {
            // Services: carpet cleaning animation
            carpetGroup.visible = true;
            const cleanAmount = ease;
            carpetGroup.rotation.y = Math.PI * 0.25;
            carpetGroup.rotation.z = 0;
            carpetGroup.position.set(-1.5, 0, 0);
            carpetGroup.scale.setScalar(1);

            carpetMat.map = cleanAmount > 0.5 ? cleanTex : dirtyTex;
            carpetMat.color.lerpColors(
                new THREE.Color(0x8b6914),
                new THREE.Color(0xffffff),
                cleanAmount
            );
            carpetMat.needsUpdate = true;

            machineGroup.position.set(2.5 - ease * 3, 0, 0.5);
            machineGroup.rotation.y = -ease * 0.5;

            bubbleMat.opacity = ease * 0.7;
            const positions = bubbleGeo.attributes.position.array;
            for (let i = 0; i < bubbleCount; i++) {
                positions[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.002;
                positions[i * 3 + 1] += 0.008 + Math.random() * 0.004;
                if (positions[i * 3 + 1] > 4) positions[i * 3 + 1] = 0;
            }
            bubbleGeo.attributes.position.needsUpdate = true;

            camera.position.lerp(new THREE.Vector3(0, 3, 6), 0.08);
            scrollState.lookAt.set(-0.5, 0.5, 0);
            break;
        }
        case 2: {
            // About: carpet floating with cards feel
            carpetGroup.visible = true;
            carpetGroup.rotation.x = -Math.PI / 2 + ease * 0.3;
            carpetGroup.rotation.y = ease * Math.PI;
            carpetGroup.position.set(0, 1.5 + Math.sin(Date.now() * 0.001) * 0.1, -2);
            carpetGroup.scale.setScalar(0.8 + ease * 0.2);
            carpetMat.map = cleanTex;
            carpetMat.color.set(0xffffff);
            carpetMat.needsUpdate = true;

            bubbleMat.opacity = (1 - ease) * 0.3;

            camera.position.lerp(new THREE.Vector3(
                Math.sin(ease * Math.PI) * 3,
                4,
                5
            ), 0.08);
            scrollState.lookAt.set(0, 1, -1);
            break;
        }
        case 3: {
            // Gallery: 3D frames carousel
            carpetGroup.visible = false;
            bubbleMat.opacity = 0;

            galleryGroup.rotation.y = ease * Math.PI * 0.5;
            frameMeshes.forEach((frame, i) => {
                const offset = (i / frameMeshes.length) * Math.PI * 2;
                const angle = ease * Math.PI + offset;
                frame.rotation.y = Math.sin(angle) * 0.4;
                frame.position.z = Math.sin(angle) * 0.5;
                frame.scale.setScalar(0.8 + Math.sin(angle + ease * Math.PI) * 0.2);
            });

            camera.position.lerp(new THREE.Vector3(0, 0.5, 7 - ease), 0.08);
            scrollState.lookAt.set(0, 0, 0);
            break;
        }
        case 4: {
            // Contact: ring portal
            carpetGroup.visible = false;
            bubbleMat.opacity = 0;

            ring.rotation.z = scrollState.progress * Math.PI * 4;
            ring2.rotation.z = -scrollState.progress * Math.PI * 3;
            contactGroup.rotation.y = ease * Math.PI * 2;

            const starArr = starGeo.attributes.position.array;
            for (let i = 0; i < starCount; i++) {
                const angle = (i / starCount) * Math.PI * 2 + Date.now() * 0.0005;
                const r = 2 + Math.sin(angle * 3) * 0.5;
                starArr[i * 3] = Math.cos(angle) * r;
                starArr[i * 3 + 2] = Math.sin(angle) * r;
            }
            starGeo.attributes.position.needsUpdate = true;

            camera.position.lerp(new THREE.Vector3(
                Math.sin(ease * Math.PI * 2) * 0.5,
                2 + ease,
                6 - ease * 2
            ), 0.08);
            scrollState.lookAt.set(0, 0, 0);
            break;
        }
    }

    gridHelper.material.opacity = 0.15 + (1 - Math.abs(idx - 2) / 2) * 0.15;
}

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    if (scrollState.sceneIndex === 0) {
        carpetGroup.rotation.y += 0.003;
    }

    if (scrollState.sceneIndex === 4) {
        ring.rotation.z = elapsed * 0.5;
        ring2.rotation.z = -elapsed * 0.7;
    }

    camera.lookAt(scrollState.lookAt);

    renderer.render(scene, camera);
}

animate();

// --- Lenis smooth scroll ---
let lenis;
if (!prefersReducedMotion) {
    lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
    });

    lenis.on('scroll', ({ scroll, progress }) => {
        scrollState.progress = progress;
        progressBar.style.width = `${progress * 100}%`;
        nav.classList.toggle('scrolled', scroll > 50);
        updateScene3D();
        updateActiveNav();
        updateCardTilts(scroll);
        ScrollTrigger.update();
    });

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
} else {
    window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollState.progress = window.scrollY / max;
        progressBar.style.width = `${scrollState.progress * 100}%`;
        updateScene3D();
    });
}

// --- GSAP scroll animations for content ---
panels.forEach((panel, i) => {
    const content = panel.querySelector('.panel-content');
    if (!content) return;

    if (prefersReducedMotion) {
        gsap.set(content, { opacity: 1, y: 0 });
        return;
    }

    gsap.fromTo(content,
        { opacity: 0, y: 80 },
        {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: panel,
                start: 'top 75%',
                end: 'top 25%',
                scrub: 1,
                toggleActions: 'play none none reverse',
            },
        }
    );

    // Parallax on text per section
    gsap.to(content, {
        y: -40,
        ease: 'none',
        scrollTrigger: {
            trigger: panel,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
        },
    });
});

// Info cards 3D tilt on scroll
function updateCardTilts() {
    if (prefersReducedMotion) return;
    const cards = document.querySelectorAll('.info-card');
    const aboutPanel = document.getElementById('about');
    if (!aboutPanel) return;

    const rect = aboutPanel.getBoundingClientRect();
    const panelCenter = rect.top + rect.height / 2;
    const viewCenter = window.innerHeight / 2;
    const dist = (panelCenter - viewCenter) / window.innerHeight;

    cards.forEach((card, i) => {
        const offset = (i - 1) * 0.3;
        const rotateY = dist * 15 + offset * 10;
        const rotateX = -dist * 8;
        const translateZ = Math.max(0, (1 - Math.abs(dist)) * 40);
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
    });
}

// Gallery frames parallax
document.querySelectorAll('.gallery-frame').forEach((frame, i) => {
    if (prefersReducedMotion) return;
    gsap.to(frame, {
        rotateY: (i % 2 === 0 ? -8 : 8),
        z: 60,
        ease: 'none',
        scrollTrigger: {
            trigger: '#gallery',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 2,
        },
    });
});

// --- Nav ---
function updateActiveNav() {
    const links = document.querySelectorAll('.nav-link');
    const idx = scrollState.sceneIndex;
    links.forEach((link) => {
        const linkIdx = parseInt(link.dataset.index, 10);
        link.classList.toggle('active', linkIdx === idx);
    });
}

document.querySelectorAll('.nav-link, .cta-btn').forEach((el) => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = el.getAttribute('href') || el.dataset.scrollTo;
        const target = document.querySelector(href);
        if (!target) return;

        if (lenis) {
            lenis.scrollTo(target, { offset: 0, duration: 1.8 });
        } else {
            target.scrollIntoView({ behavior: 'smooth' });
        }

        document.getElementById('nav-menu')?.classList.remove('open');
        document.getElementById('nav-toggle')?.classList.remove('open');
    });
});

document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-menu').classList.toggle('open');
    document.getElementById('nav-toggle').classList.toggle('open');
});

// --- Resize ---
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

// --- Image fallbacks ---
document.querySelectorAll('.gallery-frame img').forEach((img, i) => {
    img.addEventListener('error', () => {
        const colors = ['#b40606', '#2a4a6b', '#4a2a6b', '#2a6b4a'];
        img.style.display = 'none';
        img.parentElement.style.background = `linear-gradient(135deg, ${colors[i]}, #1a1a25)`;
    });
});

// Initial state
updateScene3D();
progressBar.style.width = '0%';
