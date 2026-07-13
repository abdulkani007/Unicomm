import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './Hand3DShowcase.css';

// 21 MediaPipe Landmarks Mapping (3D Positions)
interface LandmarkPositions {
  [key: string]: THREE.Vector3[];
}

// Define joint connections to draw bone cylinders
const BONE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Palm bridge
];

// Helper to create joint positions for each gesture
const createGesturePositions = (): LandmarkPositions => {
  const wrist = new THREE.Vector3(0, -1.2, 0);
  
  // Knuckles (MCP joints)
  const knuckles = [
    new THREE.Vector3(-0.6, -0.4, 0.2), // 1: Thumb MCP
    new THREE.Vector3(-0.4, 0.1, 0),    // 5: Index MCP
    new THREE.Vector3(-0.15, 0.2, 0),   // 9: Middle MCP
    new THREE.Vector3(0.15, 0.15, 0),   // 13: Ring MCP
    new THREE.Vector3(0.4, 0, -0.1)     // 17: Pinky MCP
  ];

  return {
    HELLO: [
      wrist, // 0
      knuckles[0], new THREE.Vector3(-0.9, -0.1, 0.3), new THREE.Vector3(-1.1, 0.1, 0.4), new THREE.Vector3(-1.3, 0.2, 0.5), // Thumb extended
      knuckles[1], new THREE.Vector3(-0.5, 0.5, 0), new THREE.Vector3(-0.5, 0.9, 0), new THREE.Vector3(-0.5, 1.2, 0), // Index straight
      knuckles[2], new THREE.Vector3(-0.18, 0.6, 0), new THREE.Vector3(-0.18, 1.0, 0), new THREE.Vector3(-0.18, 1.3, 0), // Middle straight
      knuckles[3], new THREE.Vector3(0.18, 0.5, 0), new THREE.Vector3(0.18, 0.9, 0), new THREE.Vector3(0.18, 1.2, 0), // Ring straight
      knuckles[4], new THREE.Vector3(0.5, 0.4, -0.1), new THREE.Vector3(0.5, 0.7, -0.1), new THREE.Vector3(0.5, 1.0, -0.1) // Pinky straight
    ],
    THANK_YOU: [
      wrist, // 0
      // Bending forward slightly toward user (z-axis increase)
      knuckles[0], new THREE.Vector3(-0.7, -0.2, 0.5), new THREE.Vector3(-0.8, 0, 0.7), new THREE.Vector3(-0.9, 0.1, 0.8),
      knuckles[1], new THREE.Vector3(-0.4, 0.3, 0.4), new THREE.Vector3(-0.4, 0.5, 0.7), new THREE.Vector3(-0.4, 0.7, 0.9),
      knuckles[2], new THREE.Vector3(-0.15, 0.35, 0.4), new THREE.Vector3(-0.15, 0.6, 0.7), new THREE.Vector3(-0.15, 0.8, 0.9),
      knuckles[3], new THREE.Vector3(0.15, 0.3, 0.4), new THREE.Vector3(0.15, 0.5, 0.7), new THREE.Vector3(0.15, 0.7, 0.9),
      knuckles[4], new THREE.Vector3(0.4, 0.2, 0.3), new THREE.Vector3(0.4, 0.4, 0.6), new THREE.Vector3(0.4, 0.6, 0.8)
    ],
    EAT: [
      wrist, // 0
      // Converging towards a bunched point above palm
      knuckles[0], new THREE.Vector3(-0.3, 0.1, 0.2), new THREE.Vector3(-0.1, 0.3, 0.3), new THREE.Vector3(0, 0.4, 0.4), // Thumb tips to center
      knuckles[1], new THREE.Vector3(-0.2, 0.3, 0.1), new THREE.Vector3(-0.1, 0.4, 0.2), new THREE.Vector3(0, 0.4, 0.4), // Index tips to center
      knuckles[2], new THREE.Vector3(-0.1, 0.35, 0.1), new THREE.Vector3(-0.05, 0.4, 0.2), new THREE.Vector3(0, 0.4, 0.4), // Middle
      knuckles[3], new THREE.Vector3(0.1, 0.3, 0.1), new THREE.Vector3(0.05, 0.4, 0.2), new THREE.Vector3(0, 0.4, 0.4), // Ring
      knuckles[4], new THREE.Vector3(0.2, 0.2, 0.1), new THREE.Vector3(0.1, 0.35, 0.2), new THREE.Vector3(0, 0.4, 0.4) // Pinky
    ],
    HELP: [
      wrist, // 0
      // Thumb up, other fingers tightly closed into a fist
      knuckles[0], new THREE.Vector3(-0.3, -0.1, 0.3), new THREE.Vector3(-0.2, 0.3, 0.4), new THREE.Vector3(-0.2, 0.7, 0.5), // Thumb straight up
      knuckles[1], new THREE.Vector3(-0.3, -0.1, 0.2), new THREE.Vector3(-0.2, -0.15, 0.3), new THREE.Vector3(-0.15, -0.1, 0.2), // Index curled
      knuckles[2], new THREE.Vector3(-0.1, -0.05, 0.2), new THREE.Vector3(-0.05, -0.1, 0.3), new THREE.Vector3(0, -0.05, 0.2), // Middle curled
      knuckles[3], new THREE.Vector3(0.1, -0.1, 0.2), new THREE.Vector3(0.05, -0.15, 0.3), new THREE.Vector3(0, -0.1, 0.2), // Ring curled
      knuckles[4], new THREE.Vector3(0.3, -0.2, 0.2), new THREE.Vector3(0.2, -0.25, 0.3), new THREE.Vector3(0.15, -0.2, 0.2) // Pinky curled
    ],
    LOVE: [
      wrist, // 0
      // Thumb, Index, Pinky extended; Middle and Ring curled
      knuckles[0], new THREE.Vector3(-0.9, -0.1, 0.3), new THREE.Vector3(-1.1, 0.1, 0.4), new THREE.Vector3(-1.3, 0.2, 0.5), // Thumb open
      knuckles[1], new THREE.Vector3(-0.5, 0.5, 0), new THREE.Vector3(-0.5, 0.9, 0), new THREE.Vector3(-0.5, 1.2, 0), // Index open
      knuckles[2], new THREE.Vector3(-0.15, 0, 0.2), new THREE.Vector3(-0.1, -0.1, 0.3), new THREE.Vector3(-0.05, -0.05, 0.2), // Middle curled
      knuckles[3], new THREE.Vector3(0.15, -0.05, 0.2), new THREE.Vector3(0.1, -0.1, 0.3), new THREE.Vector3(0.05, -0.05, 0.2), // Ring curled
      knuckles[4], new THREE.Vector3(0.5, 0.4, -0.1), new THREE.Vector3(0.5, 0.7, -0.1), new THREE.Vector3(0.5, 1.0, -0.1) // Pinky open
    ],
    YES: [
      wrist, // 0
      // Full fist shape
      knuckles[0], new THREE.Vector3(-0.3, -0.2, 0.2), new THREE.Vector3(-0.1, -0.15, 0.3), new THREE.Vector3(0, -0.1, 0.2), // Thumb folded
      knuckles[1], new THREE.Vector3(-0.3, -0.1, 0.2), new THREE.Vector3(-0.2, -0.15, 0.3), new THREE.Vector3(-0.15, -0.1, 0.2), // Index curled
      knuckles[2], new THREE.Vector3(-0.1, -0.05, 0.2), new THREE.Vector3(-0.05, -0.1, 0.3), new THREE.Vector3(0, -0.05, 0.2), // Middle curled
      knuckles[3], new THREE.Vector3(0.1, -0.1, 0.2), new THREE.Vector3(0.05, -0.15, 0.3), new THREE.Vector3(0, -0.1, 0.2), // Ring curled
      knuckles[4], new THREE.Vector3(0.3, -0.2, 0.2), new THREE.Vector3(0.2, -0.25, 0.3), new THREE.Vector3(0.15, -0.2, 0.2) // Pinky curled
    ]
  };
};

const GESTURE_SEQUENCE = ['HELLO', 'THANK_YOU', 'EAT', 'HELP', 'LOVE', 'YES'];
const CONFIDENCES = [99.4, 97.8, 98.6, 99.1, 98.3, 99.2];

export default function Hand3DShowcase() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentGestureIndex, setCurrentGestureIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Use refs for animation variables to prevent tearing/closure capture
  const targetGestureRef = useRef<string>('HELLO');
  const currentPositionsRef = useRef<THREE.Vector3[]>([]);
  const hoverStateRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0.3 }); // starting rotation

  const gestureName = GESTURE_SEQUENCE[currentGestureIndex].replace('_', ' ');
  const confidence = CONFIDENCES[currentGestureIndex];

  useEffect(() => {
    hoverStateRef.current = isHovered;
  }, [isHovered]);

  // Cycle gestures every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentGestureIndex(prev => {
        const nextIndex = (prev + 1) % GESTURE_SEQUENCE.length;
        // Directly update the mutable ref for the animation loop
        targetGestureRef.current = GESTURE_SEQUENCE[nextIndex];
        return nextIndex;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebGL Canvas Mount Hook (Runs only once)
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070709, 0.15);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x60a5fa, 2.5); // Neon blue
    dirLight1.position.set(2, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa78bfa, 2.0); // Purple glow
    dirLight2.position.set(-3, -2, 2);
    scene.add(dirLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x1f2937, 0x111827);
    gridHelper.position.y = -1.6;
    scene.add(gridHelper);

    // Hand Group
    const handGroup = new THREE.Group();
    scene.add(handGroup);

    // Load initial positions
    const gestures = createGesturePositions();
    currentPositionsRef.current = gestures.HELLO.map(v => v.clone());

    // Create Joint Spheres
    const joints: THREE.Mesh[] = [];
    const jointLines: THREE.LineSegments[] = [];

    // Skin Tone Materials matching low-poly flesh color
    const normalJointMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd2c4, // Peach flesh skin color
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x22110c // Warm soft undertone
    });
    
    const hoveredJointMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Glowing blue
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x111111, // Dark wireframe grid lines
      transparent: true,
      opacity: 0.45
    });

    const hoveredLineMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff, // Glowing cyan wireframe
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 21; i++) {
      // Base joints are larger, tips are smaller for realistic hand taper
      let size = 0.08;
      if (i === 0) size = 0.12; // wrist joint
      else if (i === 1 || i === 5 || i === 9 || i === 13 || i === 17) size = 0.10; // knuckles
      else if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) size = 0.075; // tips

      const jointGeom = new THREE.SphereGeometry(size, 10, 10); // Low-poly geometry faces count
      const joint = new THREE.Mesh(jointGeom, normalJointMaterial);
      joint.position.copy(currentPositionsRef.current[i]);
      handGroup.add(joint);
      joints.push(joint);

      // Create low-poly wireframe lines overlay
      const wireframe = new THREE.WireframeGeometry(jointGeom);
      const lines = new THREE.LineSegments(wireframe, lineMaterial);
      joint.add(lines);
      jointLines.push(lines);
    }

    // Create Bones (tapered Cylinder meshes)
    const boneMeshes: THREE.Mesh[] = [];
    const boneLines: THREE.LineSegments[] = [];

    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd2c4, // Peach flesh skin color
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x22110c
    });

    const hoveredBoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x0369a1
    });

    BONE_CONNECTIONS.forEach((conn) => {
      // Determine thickness based on depth in hierarchy for organic finger volume
      const childJoint = conn[1];
      let rBottom = 0.065;
      let rTop = 0.055;

      if (conn[0] === 0) {
        // Wrist links (thickest base)
        rBottom = 0.09;
        rTop = 0.075;
      } else if (childJoint === 4 || childJoint === 8 || childJoint === 12 || childJoint === 16 || childJoint === 20) {
        // Tip links (thinnest tip)
        rBottom = 0.055;
        rTop = 0.045;
      } else if (childJoint === 3 || childJoint === 7 || childJoint === 11 || childJoint === 15 || childJoint === 19) {
        // Distal links
        rBottom = 0.06;
        rTop = 0.05;
      }

      const geom = new THREE.CylinderGeometry(rTop, rBottom, 1, 10); // Low-poly geometry segments count
      const bone = new THREE.Mesh(geom, boneMaterial);
      handGroup.add(bone);
      boneMeshes.push(bone);

      // Create low-poly wireframe lines overlay
      const wireframe = new THREE.WireframeGeometry(geom);
      const lines = new THREE.LineSegments(wireframe, lineMaterial);
      bone.add(lines);
      boneLines.push(lines);
    });

    // Palm mesh removed to prevent boxy artifacts cutting through clenched hand poses

    // Handle Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Read target gesture coordinates
      const targetName = targetGestureRef.current;
      const targetPos = gestures[targetName] || gestures.HELLO;
      const isHover = hoverStateRef.current;

      // Update rotation & scale from drag and idle loop
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.006; // slowly rotate continuously
        handGroup.position.x = Math.cos(time * 0.8) * 0.06; // sway left and right
        handGroup.position.y = Math.sin(time * 1.2) * 0.08; // float up and down
        handGroup.position.z = Math.sin(time * 0.5) * 0.04;
      }
      
      // Real-time camera tracking jitter
      const rotationJitterY = Math.sin(time * 18.0) * 0.008 + (Math.random() - 0.5) * 0.004;
      const rotationJitterX = Math.cos(time * 15.0) * 0.006 + (Math.random() - 0.5) * 0.004;
      
      handGroup.rotation.y = rotationRef.current.y + rotationJitterY;
      handGroup.rotation.x = rotationRef.current.x + rotationJitterX;
      handGroup.rotation.z = 0; // reset default

      // Gesture-specific signature motion cycles
      if (targetName === 'YES') {
        const nod = Math.sin(time * 8) * 0.16;
        handGroup.rotation.x = rotationRef.current.x + nod + rotationJitterX;
      } else if (targetName === 'HELLO') {
        const wave = Math.sin(time * 6) * 0.18;
        handGroup.rotation.z = wave;
      } else if (targetName === 'THANK_YOU') {
        const bow = (Math.sin(time * 3) + 1) * 0.15;
        handGroup.rotation.x = rotationRef.current.x + bow + rotationJitterX;
      }

      // Smoothly interpolate current positions towards target positions
      const lerpSpeed = 0.08;
      for (let i = 0; i < 21; i++) {
        currentPositionsRef.current[i].lerp(targetPos[i], lerpSpeed);
        
        // Add MediaPipe high-frequency coordinate shaking to joints
        const jointJitter = new THREE.Vector3(
          (Math.sin(time * 24 + i) * 0.014) + ((Math.random() - 0.5) * 0.007),
          (Math.cos(time * 26 + i) * 0.014) + ((Math.random() - 0.5) * 0.007),
          (Math.sin(time * 22 - i) * 0.014) + ((Math.random() - 0.5) * 0.007)
        );

        const currentPosWithJitter = currentPositionsRef.current[i].clone().add(jointJitter);
        joints[i].position.copy(currentPosWithJitter);

        // Hover scale and material effect
        if (isHover) {
          joints[i].material = hoveredJointMaterial;
          joints[i].scale.setScalar(1.25);
          jointLines[i].material = hoveredLineMaterial;
        } else {
          joints[i].material = normalJointMaterial;
          joints[i].scale.setScalar(1.0);
          jointLines[i].material = lineMaterial;
        }
      }

      // Update bone positions (place cylinders between current joint positions)
      BONE_CONNECTIONS.forEach((conn, index) => {
        const pA = joints[conn[0]].position;
        const pB = joints[conn[1]].position;
        const bone = boneMeshes[index];

        const direction = new THREE.Vector3().subVectors(pB, pA);
        const length = direction.length();
        
        bone.scale.set(1, length, 1);
        bone.position.copy(pA).addScaledVector(direction, 0.5);

        // Orient cylinder along direction vector
        const up = new THREE.Vector3(0, 1, 0);
        bone.quaternion.setFromUnitVectors(up, direction.clone().normalize());

        // Update bone material on hover
        bone.material = isHover ? hoveredBoneMaterial : boneMaterial;
        boneLines[index].material = isHover ? hoveredLineMaterial : lineMaterial;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      joints.forEach(j => {
        j.geometry.dispose();
        j.children.forEach((c: any) => c.geometry?.dispose());
      });
      normalJointMaterial.dispose();
      hoveredJointMaterial.dispose();
      boneMeshes.forEach(b => {
        b.geometry.dispose();
        b.children.forEach((c: any) => c.geometry?.dispose());
      });
      boneMaterial.dispose();
      hoveredBoneMaterial.dispose();
      lineMaterial.dispose();
      hoveredLineMaterial.dispose();
    };
  }, []); // Run ONLY once on mount!

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.y += deltaX * 0.015;
    rotationRef.current.x += deltaY * 0.015;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div 
      className="hand-showcase-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDraggingRef.current = false;
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 3D Canvas Mounting Point */}
      <div ref={mountRef} className="canvas-container" />

      {/* Holographic Glowing AI Ring Overlays */}
      <div className={`ai-glow-pulse ${isHovered ? 'hovered' : ''}`} />

      {/* Stats Overlay Layout */}
      <div className="hand-stats-overlay">
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Current Sign</span>
            <span className="stat-value text-sky-400 glow-blue">{gestureName}</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Recognition Confidence</span>
            <span className="stat-value">{confidence}%</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">MediaPipe Tracking</span>
            <span className="stat-status">
              <span className="dot dot-active"></span>
              <span className="status-text uppercase text-emerald-500">Active</span>
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Cloud AI</span>
            <span className="stat-status">
              <span className="dot dot-active"></span>
              <span className="status-text uppercase text-emerald-500">Connected</span>
            </span>
          </div>
        </div>
      </div>

      {/* Instruction badge */}
      <div className="drag-instruction font-black tracking-widest text-[9px] uppercase">
        {isHovered ? "Drag mouse to rotate holographic model" : "Hover model to view MediaPipe landmarks"}
      </div>
    </div>
  );
}
