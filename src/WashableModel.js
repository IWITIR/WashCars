import * as THREE from 'three';
import { Model } from './Model.js';

export class WashableModel extends Model {
  constructor({
    dirtColor = 0x332211,
    dirtRoughness = 0.9,
    dirtScale = 1.002,
    washRadius = 30,
    maskSize = 1024,
    ...modelOptions
  }) {
    super(modelOptions);

    this.dirtColor = dirtColor;
    this.dirtRoughness = dirtRoughness;
    this.dirtScale = dirtScale;
    this.washRadius = washRadius;
    this.maskSize = maskSize;
    this.washTargets = [];
  }

  onModelLoaded() {
    if (!this.model) return;

    const sourceMeshes = [];

    // 모델에서 모든 메시를 수집
    this.model.traverse((child) => {
      if (!child.isMesh || !child.geometry?.attributes?.uv) return;
      if (Array.isArray(child.material)) return;

      sourceMeshes.push(child);
    });

    for (const sourceMesh of sourceMeshes) {
      const overlay = this.createDirtOverlay(sourceMesh);
      if (!overlay) continue;

      sourceMesh.add(overlay.mesh);
      this.washTargets.push(overlay);
    }
  }

  createDirtOverlay(sourceMesh) {
    const canvas = document.createElement('canvas');
    canvas.width = this.maskSize;
    canvas.height = this.maskSize;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = 'white';
    context.fillRect(0, 0, this.maskSize, this.maskSize);

    const maskTexture = new THREE.CanvasTexture(canvas);
    maskTexture.flipY = false;

    const dirtMaterial = new THREE.MeshStandardMaterial({
      color: this.dirtColor,
      roughness: this.dirtRoughness,
      metalness: 0,
      transparent: true,
      alphaMap: maskTexture,
      alphaTest: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.FrontSide,
    });

    const dirtMesh = new THREE.Mesh(sourceMesh.geometry, dirtMaterial);
    dirtMesh.name = `${sourceMesh.name || 'washable'}_dirt`;
    dirtMesh.scale.setScalar(this.dirtScale);
    dirtMesh.renderOrder = (sourceMesh.renderOrder || 0) + 1;
    dirtMesh.raycast = THREE.Mesh.prototype.raycast;

    return {
      sourceMesh,
      mesh: dirtMesh,
      canvas,
      context,
      maskTexture,
    };
  }

  getWashMeshes() {
    return this.washTargets.map((target) => target.mesh);
  }

  wash(hit, radius = this.washRadius) {
    if (!hit?.object || !hit.uv) return;

    const target = this.washTargets.find((item) => item.mesh === hit.object);
    if (!target) return;

    const x = hit.uv.x * this.maskSize;
    const y = hit.uv.y * this.maskSize;

    target.context.beginPath();
    target.context.arc(x, y, radius, 0, Math.PI * 2);
    target.context.fillStyle = 'black';
    target.context.fill();
    target.maskTexture.needsUpdate = true;
  }
}
