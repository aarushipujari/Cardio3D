import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  Eye, RotateCcw, Activity, Layers, Sparkles, AlertTriangle, 
  Zap, ZoomIn, Compass, Loader2
} from 'lucide-react';

export default function HeartViewer({ 
  vesselRisks = {}, 
  selectedVessel, 
  onSelectVessel,
  stentedVessels = {},
  onToggleStent,
  pulseRate = 72
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const heartGroupRef = useRef(null);
  const baseHeartMeshRef = useRef(null);
  const vesselsRef = useRef({});
  const particlesRef = useRef([]);
  const stenosisRingsRef = useRef({});
  const stentsRef = useRef({});

  // Viewer state
  const [loadingModel, setLoadingModel] = useState(true);
  const [hoveredVessel, setHoveredVessel] = useState(null);
  const [renderMode, setRenderMode] = useState('textured'); // 'textured', 'translucent', 'solid', 'fluoroscopy'
  const [beatingHeart, setBeatingHeart] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraPreset, setCameraPreset] = useState('anterior');

  // Animation loop refs to avoid React closure staleness
  const beatingHeartRef = useRef(beatingHeart);
  const autoRotateRef = useRef(autoRotate);
  const pulseRateRef = useRef(pulseRate);
  const vesselRisksRef = useRef(vesselRisks);
  const stentedVesselsRef = useRef(stentedVessels);

  useEffect(() => {
    beatingHeartRef.current = beatingHeart;
  }, [beatingHeart]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    pulseRateRef.current = pulseRate;
  }, [pulseRate]);

  useEffect(() => {
    vesselRisksRef.current = vesselRisks;
  }, [vesselRisks]);

  useEffect(() => {
    stentedVesselsRef.current = stentedVessels;
  }, [stentedVessels]);

  const renderModeRef = useRef(renderMode);
  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

  const applyRenderMode = (mat, mode) => {
    if (!mat) return;
    switch (mode) {
      case 'textured':
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.wireframe = false;
        break;
      case 'translucent':
        mat.transparent = true;
        mat.opacity = 0.55;
        mat.wireframe = false;
        break;
      case 'solid':
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.wireframe = false;
        break;
      case 'fluoroscopy':
        mat.transparent = true;
        mat.opacity = 0.35;
        mat.wireframe = false;
        break;
      default:
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.wireframe = false;
        break;
    }
    mat.needsUpdate = true;
  };

  // Convert risk probability to RGB color (light mode friendly)
  const getRiskColor = (vesselKey) => {
    if (stentedVessels[vesselKey]) return new THREE.Color(0x0284c7); // Cobalt/Cyan (Stented)
    const prob = vesselRisks[vesselKey]?.probability ?? 0.2;
    if (prob < 0.35) return new THREE.Color(0x059669); // Crisp medical emerald (<35%)
    if (prob < 0.60) return new THREE.Color(0xd97706); // Warm clinical amber (35%-60%)
    return new THREE.Color(0xdc2626); // High-risk red (>60%)
  };

  const getRiskEmissive = (vesselKey) => {
    if (stentedVessels[vesselKey]) return new THREE.Color(0x0369a1);
    const prob = vesselRisks[vesselKey]?.probability ?? 0.2;
    if (prob < 0.35) return new THREE.Color(0x047857);
    if (prob < 0.60) return new THREE.Color(0xb45309);
    return new THREE.Color(0x991b1b);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf1f5f9); // Clean medical studio light grey
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.02);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // --- 2. Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI * 0.95;
    controls.target.set(0, 0, 0);
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // --- 3. Studio Medical Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(12, 16, 14);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
    fillLight.position.set(-14, -8, -10);
    scene.add(fillLight);

    const backRimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    backRimLight.position.set(0, 10, -14);
    scene.add(backRimLight);

    const rimLight = new THREE.PointLight(0xf43f5e, 1.6, 25);
    rimLight.position.set(0, -6, 6);
    scene.add(rimLight);

    // Platform Base
    const pedestalGeo = new THREE.CylinderGeometry(5.5, 6, 0.2, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
      metalness: 0.05,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -4.8, 0);
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(5.6, 5.72, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -4.68, 0);
    scene.add(ring);

    // --- 4. Load Complete Closed Anatomical 3D Heart (GLTF) ---
    const heartGroup = new THREE.Group();
    scene.add(heartGroup);
    heartGroupRef.current = heartGroup;

    const gltfLoader = new GLTFLoader();

    gltfLoader.load(
      '/models/heart.glb',
      (gltf) => {
        const root = gltf.scene;
        // Scale and center the complete realistic heart
        root.scale.set(2.45, 2.45, 2.45);
        root.position.set(0, 0.2, 0);

        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            baseHeartMeshRef.current = child;
            applyRenderMode(child.material, renderModeRef.current);
          }
        });

        heartGroup.add(root);
        setLoadingModel(false);
      },
      undefined,
      (err) => {
        console.error("Error loading heart.glb:", err);
        setLoadingModel(false);
      }
    );

    // --- 5. Coronary Artery Vasculature Trees (LAD, LCX, RCA) ---
    const vesselCurves = {};
    const vesselMeshes = {};
    const particles = [];
    const stenosisRings = {};
    const stents = {};

    const createVesselBranch = (curvePoints, radius, vesselKey, name, territory, segments = 64) => {
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      vesselCurves[vesselKey] = curve;

      const geo = new THREE.TubeGeometry(curve, segments, radius, 16, false);
      const mat = new THREE.MeshStandardMaterial({
        color: getRiskColor(vesselKey),
        emissive: getRiskEmissive(vesselKey),
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.45,
        depthTest: true,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { id: vesselKey, name, territory, radius };
      heartGroup.add(mesh);
      vesselMeshes[vesselKey] = mesh;

      // Blood flow particles
      const particleCount = 14;
      const pGeo = new THREE.SphereGeometry(radius * 0.72, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.9 
      });

      for (let i = 0; i < particleCount; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        heartGroup.add(pMesh);
        particles.push({
          mesh: pMesh,
          curve,
          vesselKey,
          offset: i / particleCount,
          baseSpeed: 0.18
        });
      }

      return { curve, mesh };
    };

    // A. LAD (Left Anterior Descending)
    // Originates from aortic root bulb, courses down the anterior interventricular sulcus to apex
    const ladPoints = [
      new THREE.Vector3(0.08, 2.1, 1.15),
      new THREE.Vector3(0.12, 1.2, 1.85),
      new THREE.Vector3(0.25, 0.3, 2.15),
      new THREE.Vector3(-0.05, -0.65, 2.22), // Stenosis lesion site
      new THREE.Vector3(-0.35, -1.65, 1.95),
      new THREE.Vector3(-0.55, -2.45, 1.45),
      new THREE.Vector3(-0.75, -3.05, 0.85), // Apex
    ];
    createVesselBranch(
      ladPoints, 
      0.16, 
      'lad', 
      'Left Anterior Descending (LAD)', 
      'Anterior Myocardium & Cardiac Apex'
    );

    // Diagonal branch D1
    const d1Points = [
      new THREE.Vector3(0.2, 0.25, 2.15),
      new THREE.Vector3(-0.65, -0.25, 2.05),
      new THREE.Vector3(-1.45, -0.75, 1.55),
    ];
    const d1Mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(d1Points), 20, 0.09, 10, false),
      vesselMeshes.lad.material
    );
    heartGroup.add(d1Mesh);

    // B. LCX (Left Circumflex)
    // Originates behind pulmonary trunk, curves along left AV groove to posterior wall
    const lcxPoints = [
      new THREE.Vector3(-0.25, 1.95, 0.95),
      new THREE.Vector3(-1.15, 1.55, 1.05),
      new THREE.Vector3(-2.05, 0.85, 0.55),
      new THREE.Vector3(-2.45, -0.05, -0.25), // LCX Stenosis site
      new THREE.Vector3(-2.25, -1.05, -0.85),
      new THREE.Vector3(-1.55, -1.65, -1.25),
    ];
    createVesselBranch(
      lcxPoints, 
      0.15, 
      'lcx', 
      'Left Circumflex (LCX)', 
      'Lateral & Posterior Left Ventricle'
    );

    // Obtuse Marginal OM1
    const om1Points = [
      new THREE.Vector3(-2.15, 0.65, 0.35),
      new THREE.Vector3(-2.35, -0.35, 0.65),
      new THREE.Vector3(-2.15, -1.45, 0.45),
    ];
    const om1Mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(om1Points), 18, 0.08, 10, false),
      vesselMeshes.lcx.material
    );
    heartGroup.add(om1Mesh);

    // C. RCA (Right Coronary Artery)
    // Originates from right aortic sinus, descends along right atrioventricular sulcus
    const rcaPoints = [
      new THREE.Vector3(0.65, 2.05, 0.95),
      new THREE.Vector3(1.65, 1.55, 1.15),
      new THREE.Vector3(2.35, 0.55, 1.05), // Proximal RCA stenosis site
      new THREE.Vector3(2.55, -0.45, 0.75),
      new THREE.Vector3(2.15, -1.45, 0.15),
      new THREE.Vector3(1.15, -2.15, -0.55),
      new THREE.Vector3(0.25, -2.55, -0.85),
    ];
    createVesselBranch(
      rcaPoints, 
      0.16, 
      'rca', 
      'Right Coronary Artery (RCA)', 
      'Right Ventricle & Inferior Wall'
    );

    // Acute Marginal branch
    const amPoints = [
      new THREE.Vector3(2.45, -0.15, 0.95),
      new THREE.Vector3(2.35, -0.95, 1.05),
      new THREE.Vector3(1.75, -1.75, 1.15),
    ];
    const amMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(amPoints), 18, 0.08, 10, false),
      vesselMeshes.rca.material
    );
    heartGroup.add(amMesh);

    // --- 6. Stenosis Indicators & Stents ---
    const lesionPositions = {
      lad: new THREE.Vector3(-0.05, -0.65, 2.22),
      lcx: new THREE.Vector3(-2.45, -0.05, -0.25),
      rca: new THREE.Vector3(2.35, 0.55, 1.05),
    };

    ['lad', 'lcx', 'rca'].forEach((key) => {
      const pos = lesionPositions[key];
      
      const ringGeometry = new THREE.TorusGeometry(0.32, 0.06, 16, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xdc2626, 
        transparent: true, 
        opacity: 0.95 
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.position.copy(pos);
      ringMesh.rotation.x = Math.PI / 4;
      heartGroup.add(ringMesh);
      stenosisRings[key] = ringMesh;

      const stentGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.95, 16, 4, true);
      const stentMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.85,
        roughness: 0.2,
        wireframe: true,
        transparent: true,
        opacity: 0.95,
      });
      const stentMesh = new THREE.Mesh(stentGeo, stentMat);
      stentMesh.position.copy(pos);
      stentMesh.visible = false;
      heartGroup.add(stentMesh);
      stents[key] = stentMesh;
    });

    vesselsRef.current = vesselMeshes;
    particlesRef.current = particles;
    stenosisRingsRef.current = stenosisRings;
    stentsRef.current = stents;

    // --- 7. Raycasting for Vessel Selection ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targetMeshes = Object.values(vesselsRef.current);
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        renderer.domElement.style.cursor = 'pointer';
        setHoveredVessel(hit.userData);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredVessel(null);
      }
    };

    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targetMeshes = Object.values(vesselsRef.current);
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (onSelectVessel && hit.userData?.id) {
          onSelectVessel(hit.userData.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // --- 8. Animation Loop ---
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Authentic physiological lub-dub cardiac rhythm pulsation (Synchronized to patient PR)
      if (beatingHeartRef.current && heartGroupRef.current) {
        const bpm = Math.max(pulseRateRef.current || 72, 40);
        const freq = bpm / 60; // cycles per second
        const cycle = (elapsed * freq) % 1.0;
        
        let pulseFactor = 0;
        if (cycle < 0.16) {
          // S1 Ventricular systole contraction & ejection (lub)
          pulseFactor = 0.055 * Math.sin((cycle / 0.16) * Math.PI);
        } else if (cycle >= 0.20 && cycle < 0.34) {
          // S2 Isovolumetric relaxation rebound snap (dub)
          pulseFactor = 0.032 * Math.sin(((cycle - 0.20) / 0.14) * Math.PI);
        }
        
        const s = 1.0 + pulseFactor;
        heartGroupRef.current.scale.set(s, s * 1.02, s);
      } else if (heartGroupRef.current) {
        heartGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }

      // 360 Turntable auto-rotate via OrbitControls
      controls.autoRotate = autoRotateRef.current;

      // High-risk vessel pulsating glow & plaque ring animation (using reactive refs)
      ['lad', 'lcx', 'rca'].forEach((key) => {
        const mesh = vesselsRef.current[key];
        const ring = stenosisRingsRef.current[key];
        const isStented = stentedVesselsRef.current[key];
        const prob = vesselRisksRef.current[key]?.probability ?? 0;

        if (mesh && mesh.material) {
          if (isStented) {
            mesh.material.emissiveIntensity = 0.45 + 0.2 * Math.sin(elapsed * 3.0);
          } else if (prob >= 0.5) {
            mesh.material.emissiveIntensity = 0.4 + 0.35 * Math.sin(elapsed * 5.0);
          } else {
            mesh.material.emissiveIntensity = 0.25;
          }
        }

        if (ring) {
          if (prob >= 0.5 && !isStented) {
            ring.visible = true;
            ring.scale.setScalar(1.0 + 0.2 * Math.sin(elapsed * 4.0));
          } else {
            ring.visible = false;
          }
        }
      });

      // Animate blood flow particles with hemodynamic slowdown in stenosed lesions
      particlesRef.current.forEach((p) => {
        const isStented = stentedVesselsRef.current[p.vesselKey];
        const prob = vesselRisksRef.current[p.vesselKey]?.probability ?? 0;
        const speedFactor = isStented ? 1.25 : prob >= 0.6 ? 0.35 : 1.0;
        p.offset = (p.offset + p.baseSpeed * speedFactor * 0.015) % 1.0;
        
        const pt = p.curve.getPointAt(p.offset);
        if (pt) p.mesh.position.copy(pt);
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update vessel colors and materials dynamically when predictions change
  useEffect(() => {
    ['lad', 'lcx', 'rca'].forEach((key) => {
      const mesh = vesselsRef.current[key];
      const stent = stentsRef.current[key];
      const isStented = stentedVessels[key];

      if (mesh && mesh.material) {
        mesh.material.color.copy(getRiskColor(key));
        mesh.material.emissive.copy(getRiskEmissive(key));
      }

      if (stent) {
        stent.visible = !!isStented;
      }
    });
  }, [vesselRisks, stentedVessels]);

  // Handle render mode visual changes on base heart
  useEffect(() => {
    if (baseHeartMeshRef.current) {
      applyRenderMode(baseHeartMeshRef.current.material, renderMode);
    }
  }, [renderMode]);

  const setPresetView = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    setAutoRotate(false);
    setCameraPreset(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (view) {
      case 'anterior':
        camera.position.set(0, 1.2, 16);
        break;
      case 'posterior':
        camera.position.set(0, 1.2, -16);
        break;
      case 'lateral_left':
        camera.position.set(-16, 1.0, 3);
        break;
      case 'lateral_right':
        camera.position.set(16, 1.0, 3);
        break;
      case 'superior':
        camera.position.set(0, 17, 2);
        break;
      case 'reset':
      default:
        camera.position.set(0, 1.2, 16);
        if (heartGroupRef.current) heartGroupRef.current.rotation.set(0, 0, 0);
        break;
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="relative w-full h-[540px] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      {/* Top Clinical Header & Control Strip (Normal flow, zero overlap) */}
      <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              3D Coronary Anatomy & Myocardium
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Interactive Vasculature Mapping (LAD, LCX, RCA)
            </span>
          </div>
        </div>

        {/* Viewport Control Bar */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
          <select
            value={renderMode}
            onChange={(e) => setRenderMode(e.target.value)}
            className="bg-white text-slate-700 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none font-medium hover:bg-slate-100 transition-colors"
          >
            <option value="textured">Myocardium: Photorealistic</option>
            <option value="translucent">Myocardium: Translucent</option>
            <option value="fluoroscopy">Mode: Fluoroscopy</option>
          </select>

          {/* Pulse / Heartbeat Toggle Button */}
          <button
            onClick={() => setBeatingHeart(!beatingHeart)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              beatingHeart
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Toggle heartbeat contraction"
          >
            <Activity className="w-3.5 h-3.5 text-rose-600" />
            <span>{beatingHeart ? 'Pulse ON' : 'Pulse OFF'}</span>
          </button>

          {/* Turntable Auto-Rotate Button */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              autoRotate 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Toggle 360 turntable auto-rotation"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{autoRotate ? 'Rotate ON' : 'Rotate OFF'}</span>
          </button>

          {/* Reset Camera Button */}
          <button
            onClick={() => setPresetView('reset')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Reset Camera View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Area */}
      <div className="relative flex-1 w-full overflow-hidden bg-slate-100/70">
        {/* Loading Overlay */}
        {loadingModel && (
          <div className="absolute inset-0 z-30 bg-slate-100/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-700 animate-fadeIn">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading Anatomical Heart Model...</span>
          </div>
        )}

        {/* 3D WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Active Vessel & Stent Intervention HUD (Top-Right, Non-Overlapping) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 text-xs">
            {/* Quick vessel selector buttons */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
              {['lad', 'lcx', 'rca'].map((vKey) => (
                <button
                  key={vKey}
                  onClick={() => onSelectVessel && onSelectVessel(vKey)}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                    (selectedVessel || 'lad') === vKey
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title={`Select ${vKey.toUpperCase()} Artery`}
                >
                  {vKey}
                </button>
              ))}
            </div>

            {/* Vessel Status Indicator */}
            <div className="flex items-center gap-1.5 px-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getRiskColor(selectedVessel || 'lad').getStyle() }}
              />
              <span className="font-semibold text-slate-800 text-[11px]">
                {stentedVessels[selectedVessel || 'lad']
                  ? 'Revascularized'
                  : `${vesselRisks[selectedVessel || 'lad']?.percentage || 0}% Stenosis`}
              </span>
            </div>

            {/* Deploy / Remove Stent Action Button */}
            <button
              onClick={() => onToggleStent && onToggleStent(selectedVessel || 'lad')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                stentedVessels[selectedVessel || 'lad']
                  ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              title={stentedVessels[selectedVessel || 'lad'] ? 'Remove deployed stent' : 'Deploy virtual endovascular stent'}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{stentedVessels[selectedVessel || 'lad'] ? 'Stent Deployed' : 'Deploy Stent'}</span>
            </button>
          </div>
        </div>

        {/* Floating Vessel Hover Card (Cleanly pinned top-left, unobstructed) */}
        {hoveredVessel && (
          <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md pointer-events-none animate-fadeIn flex flex-col gap-1 min-w-[210px]">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: getRiskColor(hoveredVessel.id).getStyle() }} 
                />
                {hoveredVessel.name}
              </span>
              {stentedVessels[hoveredVessel.id] && (
                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200">
                  Stented
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">{hoveredVessel.territory}</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center justify-between">
              <span>Stenosis Probability:</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {stentedVessels[hoveredVessel.id] ? 'Revascularized (0%)' : `${vesselRisks[hoveredVessel.id]?.percentage || 0}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Camera Orientations & Risk Legend Bar (Normal flow, zero overlap) */}
      <div className="px-3.5 py-2 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        {/* Anatomical Camera Orientation Quick-Pills */}
        <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200 text-xs">
          {[
            { id: 'anterior', label: 'Anterior' },
            { id: 'posterior', label: 'Posterior' },
            { id: 'lateral_left', label: 'Left Lat' },
            { id: 'lateral_right', label: 'Right Lat' },
            { id: 'superior', label: 'Aorta' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setPresetView(v.id)}
              className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                cameraPreset === v.id
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* 3D Color Legend */}
        <div className="bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-slate-700 font-medium text-[11px]">&lt;35% Patent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-700 font-medium text-[11px]">35-60% Mod</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-slate-700 font-medium text-[11px]">&ge;60% Stenosis</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-blue-700 font-medium text-[11px]">Stented</span>
          </div>
        </div>
      </div>
    </div>
  );
}
