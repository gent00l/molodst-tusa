// 3D-фаер в hero: модель «Flare» (CC-BY-4.0, FrodoUndead / Sketchfab) + огонь из частиц с наконечника.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const host = document.getElementById('hero3d');
if (host && !matchMedia('(prefers-reduced-motion: reduce)').matches) init(host);

function init(host) {
  // телефоны: меньше пикселей и частиц — огонь всё равно мягкий, разницы не видно, а кадр в разы дешевле
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 28, 52); // дальний край модели уходит в темноту фона
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 2, 34);

  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const key = new THREE.DirectionalLight(0xfff1e0, 0.9); key.position.set(-6, 10, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3b1a, 0.7); rim.position.set(8, -4, -6); scene.add(rim);
  const fireLight = new THREE.PointLight(0xff7a1a, 0, 40, 1.4); scene.add(fireLight);

  // группа фаера: наклон и лёгкое покачивание
  const rig = new THREE.Group(); scene.add(rig);
  const tip = new THREE.Object3D(); tip.position.set(0, 8.9, 0); rig.add(tip);

  new GLTFLoader().load('models/flare/scene.gltf', (gltf) => {
    const model = gltf.scene;
    let cap = null;
    model.traverse((o) => {
      if (o.isMesh && o.material.map) { o.material.map.colorSpace = THREE.SRGBColorSpace; o.material.roughness = 0.55; }
      if (o.isMesh && /Material\.001/.test(o.material.name)) cap = o; // наконечник фаера
    });
    model.updateMatrixWorld(true);
    // ось фаера: от центра тела к центру наконечника. Поворачиваем модель так, чтобы наконечник смотрел вверх (+Y).
    const box = new THREE.Box3().setFromObject(model), center = box.getCenter(new THREE.Vector3());
    const capCenter = cap ? new THREE.Box3().setFromObject(cap).getCenter(new THREE.Vector3()) : center.clone().add(new THREE.Vector3(0, 1, 0));
    const axis = capCenter.clone().sub(center).normalize();
    const holder = new THREE.Group();
    holder.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0));
    model.position.sub(center);          // центр модели в начало координат
    holder.add(model);
    holder.updateMatrixWorld(true);      // holder ещё не в rig: бокс получается в локальных координатах rig
    const rotated = new THREE.Box3().setFromObject(holder);
    tip.position.set(0, rotated.max.y, 0); // верх наконечника
    rig.add(holder);
  });
  rig.rotation.z = -0.55; rig.rotation.x = 0.15;

  /* ---------- частицы огня ---------- */
  const N = mobile ? 380 : 700;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), life = new Float32Array(N), seed = new Float32Array(N), sizes = new Float32Array(N);
  const vel = new Float32Array(N * 3), age = new Float32Array(N);
  for (let i = 0; i < N; i++) { age[i] = Math.random() * 1.2; life[i] = 0.7 + Math.random() * 0.9; seed[i] = Math.random(); sizes[i] = 0.6 + Math.random() * 1.6; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 } },
    vertexShader: `
      attribute float aAge, aLife, aSeed, aSize;
      uniform float uScale;
      varying float vT; varying float vSeed;
      void main(){
        vT = clamp(aAge / aLife, 0.0, 1.0); vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float grow = 1.0 + vT * 1.6;
        gl_PointSize = aSize * grow * uScale * (420.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vT; varying float vSeed;
      void main(){
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        // рваный край: чуть «мультяшный» силуэт
        float edge = 0.5 - 0.08 * sin(atan(p.y, p.x) * 5.0 + vSeed * 20.0);
        if (d > edge) discard;
        float soft = smoothstep(edge, edge - 0.25, d);
        vec3 c0 = vec3(1.0, 0.96, 0.55);   // сердцевина
        vec3 c1 = vec3(1.0, 0.55, 0.08);   // оранжевый
        vec3 c2 = vec3(0.85, 0.12, 0.02);  // красный дым
        vec3 col = mix(c0, c1, smoothstep(0.0, 0.45, vT));
        col = mix(col, c2, smoothstep(0.45, 1.0, vT));
        float a = soft * (1.0 - vT * vT) * 0.75;
        gl_FragColor = vec4(col, a);
      }`
  });
  const points = new THREE.Points(geo, mat); scene.add(points);

  /* ---------- фон сцены: угольки и пыль, медленно плывут вверх по всему hero ---------- */
  const AN = mobile ? 120 : 220, aGeo = new THREE.BufferGeometry(), aPos = new Float32Array(AN * 3), aSeed = new Float32Array(AN), aSize = new Float32Array(AN);
  const AREA = { x: 34, y: 22, z: 14 };
  for (let i = 0; i < AN; i++) {
    aPos[i * 3] = (Math.random() - 0.5) * AREA.x; aPos[i * 3 + 1] = (Math.random() - 0.5) * AREA.y; aPos[i * 3 + 2] = (Math.random() - 0.5) * AREA.z - 4;
    aSeed[i] = Math.random(); aSize[i] = 0.12 + Math.random() * 0.45;
  }
  aGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
  aGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  aGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  const aMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      attribute float aSeed, aSize; uniform float uTime, uScale; varying float vA; varying float vSeed;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.35 + aSeed * 40.0) * 0.8;
        p.y += mod(uTime * (0.25 + aSeed * 0.5) + aSeed * 22.0, 22.0) - 11.0 - position.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 90.0)); // мерцание
        vSeed = aSeed;
        gl_PointSize = aSize * uScale * (380.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA; varying float vSeed;
      void main(){
        float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.1, d);
        vec3 ember = vec3(1.0, 0.45, 0.12), dust = vec3(0.9, 0.85, 0.8);
        vec3 col = mix(dust, ember, step(0.6, vSeed));
        gl_FragColor = vec4(col, soft * vA * 0.55);
      }`
  });
  scene.add(new THREE.Points(aGeo, aMat));

  /* ---------- управление курсором: наведение слегка поворачивает, drag крутит с инерцией ---------- */
  const hero = host.closest('.hero') || host;
  const ctl = { tx: 0, ty: 0, vy: 0, vx: 0, drag: false, lx: 0, ly: 0, spinY: 0, spinX: 0 };
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    ctl.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ctl.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (ctl.drag) { ctl.vy = (e.clientX - ctl.lx) * 0.012; ctl.vx = (e.clientY - ctl.ly) * 0.012; ctl.lx = e.clientX; ctl.ly = e.clientY; }
  });
  hero.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; e.preventDefault(); ctl.drag = true; ctl.lx = e.clientX; ctl.ly = e.clientY; hero.classList.add('is-dragging'); });
  const endDrag = () => { ctl.drag = false; hero.classList.remove('is-dragging'); };
  hero.addEventListener('pointerup', endDrag); hero.addEventListener('pointerleave', endDrag); hero.addEventListener('pointercancel', endDrag);

  const tipWorld = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const respawn = (i) => {
    tip.getWorldPosition(tipWorld);
    rig.getWorldDirection(dir); // ось Z; нам нужна ось Y фаера
    up.set(0, 1, 0).applyQuaternion(rig.quaternion);
    const r = Math.random() * 0.35, a = Math.random() * Math.PI * 2;
    pos[i * 3] = tipWorld.x + Math.cos(a) * r; pos[i * 3 + 1] = tipWorld.y; pos[i * 3 + 2] = tipWorld.z + Math.sin(a) * r;
    const spark = Math.random() < 0.18, speed = spark ? 14 + Math.random() * 8 : 7 + Math.random() * 5, spread = spark ? 7 : 2.4;
    vel[i * 3] = up.x * speed + (Math.random() - 0.5) * spread;
    vel[i * 3 + 1] = up.y * speed + (Math.random() - 0.5) * spread;
    vel[i * 3 + 2] = up.z * speed + (Math.random() - 0.5) * spread;
    age[i] = 0; life[i] = spark ? 0.5 + Math.random() * 0.7 : 0.45 + Math.random() * 0.7; sizes[i] = spark ? 0.35 + Math.random() * 0.4 : 1.1 + Math.random() * 2.2;
  };
  for (let i = 0; i < N; i++) { respawn(i); age[i] = Math.random() * life[i]; }

  /* ---------- размер и цикл ---------- */
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // на узких экранах фаер уходит вправо-вниз и уменьшается
    const narrow = w < 760;
    rig.position.set(narrow ? 3.5 : 10.5, narrow ? -8 : 0.5, 0);
    rig.scale.setScalar(narrow ? 0.5 : 0.72);
    mat.uniforms.uScale.value = narrow ? 0.7 : 1; aMat.uniforms.uScale.value = narrow ? 0.7 : 1;
  };
  new ResizeObserver(resize).observe(host); resize();

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    up.set(0, 1, 0).applyQuaternion(rig.quaternion);
    // drag добавляет скорость, дальше она затухает; наведение мягко тянет фаер к курсору
    if (!ctl.drag) { ctl.vy *= 0.94; ctl.vx *= 0.94; }
    ctl.spinY += ctl.vy; ctl.spinX += ctl.vx; ctl.spinX = Math.max(-0.9, Math.min(0.9, ctl.spinX));
    const wantY = ctl.spinY + ctl.tx * 0.35 + Math.sin(t * 0.35) * 0.15;
    const wantX = 0.15 + ctl.spinX + ctl.ty * 0.2;
    rig.rotation.y += (wantY - rig.rotation.y) * 0.08;
    rig.rotation.x += (wantX - rig.rotation.x) * 0.08;
    rig.rotation.z = -0.55 + Math.sin(t * 0.6) * 0.06 - ctl.tx * 0.08;
    aMat.uniforms.uTime.value = t;

    let respawned = false;
    for (let i = 0; i < N; i++) {
      age[i] += dt;
      if (age[i] >= life[i]) { respawn(i); respawned = true; continue; }
      const k = i * 3, wob = Math.sin(t * 9 + seed[i] * 30) * 2.5;
      vel[k] += (wob - vel[k] * 0.9) * dt; vel[k + 2] += (Math.cos(t * 7 + seed[i] * 20) * 2.5 - vel[k + 2] * 0.9) * dt;
      vel[k] += up.x * 6 * dt; vel[k + 1] += (up.y * 6 - 2) * dt; vel[k + 2] += up.z * 6 * dt; // тяга вдоль фаера
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.aAge.needsUpdate = true;
    if (respawned) { geo.attributes.aLife.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; }

    tip.getWorldPosition(fireLight.position); fireLight.position.y += 1.5;
    fireLight.intensity = 140 + Math.sin(t * 17) * 35 + Math.sin(t * 31) * 20;
    renderer.render(scene, camera);
  };
  tick();
}
