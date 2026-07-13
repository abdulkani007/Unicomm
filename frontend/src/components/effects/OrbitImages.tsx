import React, { useEffect, useRef, useState } from 'react';
import './OrbitImages.css';

interface OrbitImagesProps {
  images: string[];
  shape?: 'ellipse' | 'circle';
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
  duration?: number;
  itemSize?: number;
  responsive?: boolean;
  radius?: number;
  direction?: 'normal' | 'reverse';
  fill?: boolean;
  showPath?: boolean;
  paused?: boolean;
}

export const OrbitImages: React.FC<OrbitImagesProps> = ({
  images = [],
  shape = 'ellipse',
  radiusX = 340,
  radiusY = 80,
  rotation = -8,
  duration = 30,
  itemSize = 80,
  responsive = true,
  radius = 160,
  direction = 'normal',
  fill = true,
  showPath = true,
  paused = false,
}) => {
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const angleRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current;
        if (!paused) {
          const speed = 360 / (duration * 1000); // degrees per millisecond
          const directionMultiplier = direction === 'normal' ? 1 : -1;
          angleRef.current = (angleRef.current + speed * deltaTime * directionMultiplier) % 360;
        }
      }
      previousTimeRef.current = time;

      // Calculate positions
      const rx = shape === 'ellipse' ? radiusX : radius;
      const ry = shape === 'ellipse' ? radiusY : radius;
      const n = images.length;
      
      const newPositions = images.map((_, index) => {
        const baseAngle = (360 / n) * index;
        const currentAngle = (baseAngle + angleRef.current) * (Math.PI / 180);
        
        // Ellipse parametric equations
        const x = Math.cos(currentAngle) * rx;
        const y = Math.sin(currentAngle) * ry;
        return { x, y };
      });
      
      setPositions(newPositions);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [images, shape, radiusX, radiusY, radius, duration, direction, paused]);

  const rx = shape === 'ellipse' ? radiusX : radius;
  const ry = shape === 'ellipse' ? radiusY : radius;

  // Render container sizing based on ellipse dimensions
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: shape === 'ellipse' ? `${(ry + itemSize) * 2}px` : `${(radius + itemSize) * 2}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  return (
    <div className="orbit-images-container select-none pointer-events-none" style={containerStyle}>
      {showPath && (
        <svg
          className="orbit-path-svg"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            overflow: 'visible'
          }}
        >
          <ellipse
            cx="50%"
            cy="50%"
            rx={rx}
            ry={ry}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
        </svg>
      )}
      
      {images.map((img, index) => {
        const pos = positions[index] || { x: 0, y: 0 };
        return (
          <div
            key={index}
            className="orbit-image-wrapper cursor-target"
            style={{
              position: 'absolute',
              width: `${itemSize}px`,
              height: `${itemSize}px`,
              left: `calc(50% + ${pos.x}px - ${itemSize / 2}px)`,
              top: `calc(50% + ${pos.y}px - ${itemSize / 2}px)`,
              transform: `rotate(${-rotation}deg)`, // counter-rotate image so it stays upright
              transition: 'border-color 0.3s ease, transform 0.3s ease',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              background: '#09090b',
              pointerEvents: 'auto',
            }}
          >
            <img
              src={img}
              alt={`orbiting-${index}`}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              draggable="false"
            />
          </div>
        );
      })}
    </div>
  );
};

export default OrbitImages;
