import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ColorPoint } from '@/types/color-journey';
import { useTheme } from '@/hooks/use-theme';
interface OKLab3DViewerProps {
  palette: ColorPoint[];
}
export function OKLab3DViewer({ palette }: OKLab3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();
  const [view, setView] = useState({ theta: -Math.PI / 4, phi: Math.PI / 6, zoom: 1.0 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    const draw = () => {
      resizeCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 1.5 * view.zoom;
      // Draw axes
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 50, centerY);
      ctx.lineTo(centerX + 50, centerY);
      ctx.moveTo(centerX, centerY - 50);
      ctx.lineTo(centerX, centerY + 50);
      ctx.stroke();
      if (palette.length === 0) return;
      const points = palette.map(p => {
        const { l, a, b } = p.ok;
        // Simple 3D rotation
        const cosT = Math.cos(view.theta);
        const sinT = Math.sin(view.theta);
        const cosP = Math.cos(view.phi);
        const sinP = Math.sin(view.phi);
        const x1 = a * cosT - b * sinT;
        const y1 = l;
        const z1 = a * sinT + b * cosT;
        const x2 = x1;
        const y2 = y1 * cosP - z1 * sinP;
        return {
          x: centerX + x2 * scale,
          y: centerY - y2 * scale,
          size: 5 + l * 10,
          opacity: 0.5 + l * 0.5,
          color: p.hex,
        };
      });
      // Draw lines
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Draw points
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, 2 * Math.PI);
        ctx.fillStyle = point.color;
        ctx.globalAlpha = point.opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [palette, view, isDark]);
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setView(prev => ({
      ...prev,
      theta: prev.theta - dx * 0.01,
      phi: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.phi - dy * 0.01)),
    }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2.0, prev.zoom - e.deltaY * 0.001)),
    }));
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full aspect-video rounded-lg bg-muted/50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
}