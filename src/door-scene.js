// src/door-scene.js
import * as THREE from 'three';

export function createDoorScene() {
  const doorRoot = new THREE.Group();

  // --- Parametri porta normalizzati ---
  const doorWidth = 2;
  const doorHeight = 3.2;
  const doorThickness = 0.08;
  const frameThickness = 0.12; // spessore cornice
  const leafWidth = (doorWidth - frameThickness * 2) / 2;
  const leafHeight = doorHeight - frameThickness * 2;

  // --- Cornice ---
  const frameGeom = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x8a6642,      // legno caldo
    roughness: 0.4,
    metalness: 0.1,
  });
  const frameMesh = new THREE.Mesh(frameGeom, frameMat);
  frameMesh.name = 'FrameMesh';
  doorRoot.add(frameMesh);

  // --- Ante: geometria base ---
  const leafGeom = new THREE.BoxGeometry(leafWidth, leafHeight, doorThickness * 0.6);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xf3efe6,      // avorio/panna
    roughness: 0.35,
    metalness: 0.0,
  });

  // LEFT PIVOT
  const leftPivot = new THREE.Group();
  leftPivot.position.set(-doorWidth / 2 + frameThickness, 0, 0);
  leftPivot.name = 'LeftPivot';
  doorRoot.add(leftPivot);

  const leftLeaf = new THREE.Mesh(leafGeom, leafMat);
  leftLeaf.position.set(leafWidth / 2, 0, 0); // traslata dentro il pivot
  leftLeaf.name = 'LeftLeafMesh';
  leftPivot.add(leftLeaf);

  // RIGHT PIVOT
  const rightPivot = new THREE.Group();
  rightPivot.position.set(+doorWidth / 2 - frameThickness, 0, 0);
  rightPivot.name = 'RightPivot';
  doorRoot.add(rightPivot);

  const rightLeaf = new THREE.Mesh(leafGeom, leafMat);
  rightLeaf.position.set(-leafWidth / 2, 0, 0); // traslata dentro il pivot
  rightLeaf.name = 'RightLeafMesh';
  rightPivot.add(rightLeaf);

  // --- Finestre di vetro (3 quadrati per anta) ---
  const glassSize = leafWidth * 0.4;
  const glassThickness = doorThickness * 0.2;
  const gapY = glassSize * 1.4;

  const glassGeom = new THREE.BoxGeometry(glassSize, glassSize, glassThickness);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    transmission: 0.7, // vetro
    thickness: 0.2,
    metalness: 0.0,
  });

  const glassOffsetsY = [-gapY, 0, gapY];

  function addGlassToLeaf(leaf, side) {
    glassOffsetsY.forEach((offsetY, index) => {
      const glass = new THREE.Mesh(glassGeom, glassMat);
      glass.position.set(
        0,
        offsetY,
        leaf.geometry.parameters.depth / 2 + glassThickness / 2 + 0.001
      );
      glass.name = `${side}Glass_${index + 1}`;
      leaf.add(glass);
    });
  }

  addGlassToLeaf(leftLeaf, 'Left');
  addGlassToLeaf(rightLeaf, 'Right');

  // --- Luci base ---
  const ambient = new THREE.AmbientLight(0xfff2e0, 0.9);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 4, 5);

  // Il caller aggiungerà luci alla scena principale
  return {
    doorRoot,
    leftPivot,
    rightPivot,
    frameMesh,
  };
}
