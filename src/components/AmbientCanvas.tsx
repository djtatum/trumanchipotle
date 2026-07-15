"use client";

import React, { useEffect, useRef } from "react";

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: MistParticle[] = [];
    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    class MistParticle {
      radius!: number;
      x!: number;
      y!: number;
      vx!: number;
      vy!: number;
      alpha!: number;
      baseColor!: { r: number; g: number; b: number };
      angle!: number;
      angleSpeed!: number;

      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.radius = Math.random() * 180 + 120;
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + this.radius;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = -Math.random() * 0.12 - 0.04; // slow upward drift
        this.alpha = Math.random() * 0.03 + 0.008; // very faint for atmospheric overlap
        this.baseColor =
          Math.random() > 0.5
            ? { r: 143, g: 162, b: 166 }
            : { r: 95, g: 104, b: 112 }; // cool mist colors
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = (Math.random() - 0.5) * 0.004;
      }

      update() {
        this.x += this.vx + Math.sin(this.angle) * 0.08;
        this.y += this.vy;
        this.angle += this.angleSpeed;

        // Recycle particle if it moves off-screen
        if (
          this.y < -this.radius ||
          this.x < -this.radius ||
          this.x > width + this.radius
        ) {
          this.reset();
        }
      }

      draw(c: CanvasRenderingContext2D) {
        const grad = c.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.radius
        );
        grad.addColorStop(
          0,
          `rgba(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b}, ${this.alpha})`
        );
        grad.addColorStop(1, "rgba(5, 5, 5, 0)");

        c.fillStyle = grad;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Generate mist particles
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new MistParticle());
    }

    let animationId: number;
    const animate = () => {
      // Clear with dark base color
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Draw mist particles
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      // Draw cursor flashlight effect
      if (mouse.active) {
        const flashlightGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          220
        );
        flashlightGrad.addColorStop(0, "rgba(143, 162, 166, 0.035)");
        flashlightGrad.addColorStop(0.5, "rgba(143, 162, 166, 0.01)");
        flashlightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = flashlightGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas id="ambient-canvas" ref={canvasRef} />;
}
