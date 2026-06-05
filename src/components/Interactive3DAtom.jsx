import { useEffect, useRef, useState } from 'react';

// Rotation matrices helpers
const rotateX = (x, y, z, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
};

const rotateY = (x, y, z, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
};

// 3D Nucleus Particle (single sphere in the center)
const nucleusParticle = { x: 0, y: 0, z: 0, radius: 28 };

// Orbit tilt configuration (single orbit)
const orbitTilt = { rx: 45 * Math.PI / 180, ry: 25 * Math.PI / 180 };

export const Interactive3DAtom = () => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isGrabbed, setIsGrabbed] = useState(false);

  // Animation values using refs to avoid React re-renders on every frame
  const thetaX = useRef(0.2); // Core rotation X
  const thetaY = useRef(0.5); // Core rotation Y
  const electronAngle = useRef(0); // Orbital phase

  // Inertia and mouse dragging refs
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragVelocity = useRef({ x: 0.003, y: 0.001 }); // Initial slow rotation velocity

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI displays
    const resizeCanvas = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.offsetWidth;
      const height = wrapperRef.current.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationFrameId;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) * 0.75; // Orbit radius

      // Safety check: if canvas is not yet laid out, trigger resizeCanvas and skip rendering this frame
      if (width <= 0 || height <= 0 || radius <= 0) {
        resizeCanvas();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);

      // Increment orbital angle for electrons
      // Slow down orbits slightly if grabbed, otherwise standard speed
      const orbitalSpeed = isDragging.current ? 0.015 : 0.04;
      electronAngle.current += orbitalSpeed;

      // Update rotation angles with current velocities (inertia physics)
      if (!isDragging.current) {
        // Friction decay
        dragVelocity.current.x *= 0.97;
        dragVelocity.current.y *= 0.97;

        // Blend velocity back into the default auto-rotation drift
        const targetVelX = 0.0012; // slow vertical drift
        const targetVelY = 0.0035; // slow horizontal drift
        
        dragVelocity.current.x = dragVelocity.current.x * 0.95 + targetVelX * 0.05;
        dragVelocity.current.y = dragVelocity.current.y * 0.95 + targetVelY * 0.05;

        thetaX.current += dragVelocity.current.x;
        thetaY.current += dragVelocity.current.y;
      } else {
        // Drag speed is updated in the event handlers directly
      }

      // We will compile a list of all elements to draw, then sort by depth (Painter's Algorithm)
      const drawables = [];

      // 1. Single central nucleus sphere
      let [nx, ny, nz] = rotateY(nucleusParticle.x, nucleusParticle.y, nucleusParticle.z, thetaY.current);
      [nx, ny, nz] = rotateX(nx, ny, nz, thetaX.current);

      drawables.push({
        type: 'nucleus',
        z: nz,
        x: cx + nx,
        y: cy + ny,
        radius: nucleusParticle.radius,
        key: 'nucleus-single'
      });

      // 2. Single orbit ring (segmented into 64 parts for depth sorting)
      const numSegments = 64;
      const orbitPoints = [];

      for (let i = 0; i <= numSegments; i++) {
        const phi = (i * 2 * Math.PI) / numSegments;
        let x = radius * Math.cos(phi);
        let y = 0;
        let z = radius * Math.sin(phi);

        // Apply orbit tilt
        [x, y, z] = rotateX(x, y, z, orbitTilt.rx);
        [x, y, z] = rotateY(x, y, z, orbitTilt.ry);

        // Apply core rotation
        [x, y, z] = rotateY(x, y, z, thetaY.current);
        [x, y, z] = rotateX(x, y, z, thetaX.current);

        orbitPoints.push({ x: cx + x, y: cy + y, z: z });
      }

      for (let i = 0; i < numSegments; i++) {
        const ptA = orbitPoints[i];
        const ptB = orbitPoints[i + 1];
        const avgZ = (ptA.z + ptB.z) / 2;

        drawables.push({
          type: 'orbit_segment',
          z: avgZ,
          x1: ptA.x,
          y1: ptA.y,
          x2: ptB.x,
          y2: ptB.y,
          key: `orbit-seg-${i}`
        });
      }

      // 3. 2 Electrons revolving on the same single orbit ring
      // Electron 1
      const e1Phi = electronAngle.current;
      let e1X = radius * Math.cos(e1Phi);
      let e1Y = 0;
      let e1Z = radius * Math.sin(e1Phi);
      [e1X, e1Y, e1Z] = rotateX(e1X, e1Y, e1Z, orbitTilt.rx);
      [e1X, e1Y, e1Z] = rotateY(e1X, e1Y, e1Z, orbitTilt.ry);
      [e1X, e1Y, e1Z] = rotateY(e1X, e1Y, e1Z, thetaY.current);
      [e1X, e1Y, e1Z] = rotateX(e1X, e1Y, e1Z, thetaX.current);

      drawables.push({
        type: 'electron',
        z: e1Z,
        x: cx + e1X,
        y: cy + e1Y,
        radius: 7,
        key: 'electron-1'
      });

      // Electron 2 (spaced 180 degrees / Math.PI apart on the same orbit)
      const e2Phi = electronAngle.current + Math.PI;
      let e2X = radius * Math.cos(e2Phi);
      let e2Y = 0;
      let e2Z = radius * Math.sin(e2Phi);
      [e2X, e2Y, e2Z] = rotateX(e2X, e2Y, e2Z, orbitTilt.rx);
      [e2X, e2Y, e2Z] = rotateY(e2X, e2Y, e2Z, orbitTilt.ry);
      [e2X, e2Y, e2Z] = rotateY(e2X, e2Y, e2Z, thetaY.current);
      [e2X, e2Y, e2Z] = rotateX(e2X, e2Y, e2Z, thetaX.current);

      drawables.push({
        type: 'electron',
        z: e2Z,
        x: cx + e2X,
        y: cy + e2Y,
        radius: 7,
        key: 'electron-2'
      });

      // --- DEPTH SORTING (Painter's Algorithm) ---
      drawables.sort((a, b) => a.z - b.z);

      // --- DRAW ALL ELEMENTS BACK-TO-FRONT ---
      drawables.forEach((item) => {
        // Perspective scaling factor based on z-depth
        // z values range roughly from -radius to +radius (-120 to +120)
        const depthFactor = 1 + (item.z / (radius * 1.5)); // ranges roughly from 0.6 to 1.4

        if (item.type === 'orbit_segment') {
          // Draw orbit line segment
          // Base orbit color: yellowish/gold to match electrons, but less bright
          // Opacity also varies with depth to emphasize 3D spacing
          const baseOpacity = 0.22;
          const zOpacity = baseOpacity * (0.6 + (item.z / radius) * 0.4);
          
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.strokeStyle = `rgba(200, 176, 64, ${zOpacity})`;
          ctx.lineWidth = 1.2 * depthFactor;
          ctx.stroke();

        } else if (item.type === 'nucleus') {
          // Draw central Helium nucleus sphere
          const size = item.radius * depthFactor;
          const grad = ctx.createRadialGradient(
            item.x - size * 0.25,
            item.y - size * 0.25,
            size * 0.05,
            item.x,
            item.y,
            size
          );

          // Glowing cyan core matching Helium theme
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#b0f0ff');
          grad.addColorStop(0.6, '#00f2ff'); // var(--accent)
          grad.addColorStop(1, '#005f80');

          ctx.shadowColor = 'rgba(0, 242, 255, 0.5)';
          ctx.shadowBlur = 24 * depthFactor;

          ctx.beginPath();
          ctx.arc(item.x, item.y, size, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.shadowBlur = 0; // reset shadow

        } else if (item.type === 'electron') {
          // Draw 3D electron node
          const size = item.radius * depthFactor;
          
          // Radial glow for the electron
          const grad = ctx.createRadialGradient(
            item.x, item.y, 0,
            item.x, item.y, size * 2.2
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#ffd700'); // bright gold
          grad.addColorStop(0.5, 'rgba(200, 176, 64, 0.7)'); // gold glow
          grad.addColorStop(1, 'rgba(200, 176, 64, 0)');

          ctx.beginPath();
          ctx.arc(item.x, item.y, size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Core point
          ctx.beginPath();
          ctx.arc(item.x, item.y, size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Mouse / Touch Interaction Handlers
  const handleMouseDown = (e) => {
    isDragging.current = true;
    setIsGrabbed(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    // Direct angular rotation based on dragging delta
    // dx rotates around Y-axis, dy rotates around X-axis
    thetaY.current += dx * 0.0075;
    thetaX.current += dy * 0.0075;

    // Track dragging velocity to carry momentum on release
    dragVelocity.current = {
      x: dy * 0.0075,
      y: dx * 0.0075
    };

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    setIsGrabbed(false);
  };

  // Touch equivalents for mobile compatibility
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    setIsGrabbed(true);
    lastMousePos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.current.x;
    const dy = e.touches[0].clientY - lastMousePos.current.y;

    thetaY.current += dx * 0.009;
    thetaX.current += dy * 0.009;

    dragVelocity.current = {
      x: dy * 0.009,
      y: dx * 0.009
    };

    lastMousePos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  return (
    <div
      ref={wrapperRef}
      className={`hero-3d-atom-wrapper ${isHovered ? 'hovered' : ''} ${isGrabbed ? 'grabbed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUpOrLeave}
      style={{
        cursor: isGrabbed ? 'grabbing' : isHovered ? 'grab' : 'default',
        touchAction: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 5
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none' // wrapper captures pointer events
        }}
      />
    </div>
  );
};
export default Interactive3DAtom;
