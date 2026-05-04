// src/main.js
import * as THREE from 'three';
import { createDoorScene } from './door-scene.js';

const canvas = document.getElementById('door-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050509); // sfondo scuro

// Camera
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  20
);
camera.position.set(0, 0, 6);

// Luci
const ambient = new THREE.AmbientLight(0xfff2e0, 0.9);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(3, 4, 5);
scene.add(dirLight);

// Porta
const { doorRoot, leftPivot, rightPivot } = createDoorScene();
scene.add(doorRoot);

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Test animazione ante in loop
let t = 0;
function animate() {
  requestAnimationFrame(animate);

  t += 0.01;
  // openT da 0 a 1
  const openT = (Math.sin(t) * 0.5 + 0.5);

  const maxAngle = Math.PI / 2 * 0.9; // circa 80°
  leftPivot.rotation.y = -maxAngle * openT;
  rightPivot.rotation.y = +maxAngle * openT;

  renderer.render(scene, camera);
}

animate();
