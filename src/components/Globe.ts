import * as THREE from 'three';

export function initGlobe(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 2.5;

  const loader = new THREE.TextureLoader();

  // Earth
  const earthMat = new THREE.MeshPhongMaterial({
    map: loader.load('/textures/earth-blue-marble.jpg'),
    bumpMap: loader.load('/textures/earth-topology.png'),
    bumpScale: 0.04,
    specularMap: loader.load('/textures/earth-water.png'),
    specular: new THREE.Color(0x226699),
    shininess: 15,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat);
  scene.add(earth);

  // Clouds
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 64, 64),
    new THREE.MeshPhongMaterial({
      map: loader.load('/textures/earth-clouds.png'),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  scene.add(clouds);

  // Moon
  const moonTex = loader.load('/textures/moon.jpg');
  const moonMat = new THREE.MeshPhongMaterial({ map: moonTex });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 32), moonMat);
  const moonPivot = new THREE.Object3D();
  moon.position.set(1.4, 0, 0);
  moonPivot.add(moon);
  moonPivot.rotation.x = 0.09;
  scene.add(moonPivot);

  // Atmosphere glow
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.055, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.08 })
  ));

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  // Stars
  const starPos = new Float32Array(1200 * 3).map(() => (Math.random() - 0.5) * 80);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })));

  // Interaction state
  let rotY = 0, rotX = 0, velX = 0, zoom = 2.5;
  let dragging = false, lastX = 0, lastY = 0;

  const onDown = (x: number, y: number) => { dragging = true; lastX = x; lastY = y; velX = 0; };
  const onMove = (x: number, y: number) => {
    if (!dragging) return;
    velX = (x - lastX) * 0.005;
    rotY += velX;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX + (y - lastY) * 0.005));
    lastX = x; lastY = y;
  };
  const onUp = () => { dragging = false; };

  const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
  const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
  const onTouchStart = (e: TouchEvent) => onDown(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX, e.touches[0].clientY);
  const onWheel = (e: WheelEvent) => { zoom = Math.max(1.4, Math.min(5, zoom + e.deltaY * 0.003)); e.preventDefault(); };

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight || w;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    if (!dragging) { velX *= 0.93; velX = Math.max(velX, 0.002); rotY += velX; }
    earth.rotation.set(rotX, rotY, 0);
    clouds.rotation.set(rotX, rotY * 1.008 + performance.now() * 0.00002, 0);
    moonPivot.rotation.y += 0.0008;
    camera.position.z = zoom;
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onUp);
    canvas.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', resize);
    renderer.dispose();
  };
}
