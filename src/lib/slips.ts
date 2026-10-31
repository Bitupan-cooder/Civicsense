import gsap from 'gsap';

interface Leaf {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  rotX: number;
  vRotX: number;
  rotY: number;
  vRotY: number;
  rotZ: number;
  vRotZ: number;
  swayAmp: number;
  swaySpeed: number;
  phase: number;
  color: string;
  veinColor: string;
  opacity: number;
  scale: number;
}

export class PaperSlipsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private leaves: Leaf[] = [];
  private isRunning: boolean = false;
  private width: number = 0;
  private height: number = 0;
  private tickerFunc: () => void;
  private isOffScreen: boolean = false;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tickerFunc = this.update.bind(this);
    this.resize();
    this.initLeaves();
  }

  public resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width || window.innerWidth || 1400;
    this.height = rect.height || window.innerHeight || 800;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  private initLeaves(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
    const count = isMobile ? 18 : 28;

    // Botanical Civic Palette: Leaf Green, Kiwi, Bright Lime, Warm Cream & Crisp White
    const leafPalettes = [
      { fill: '#1EA854', vein: 'rgba(255, 255, 255, 0.45)' },
      { fill: '#9ABC05', vein: 'rgba(255, 255, 255, 0.45)' },
      { fill: '#B5F800', vein: 'rgba(30, 168, 84, 0.5)' },
      { fill: '#FAF2EB', vein: 'rgba(30, 168, 84, 0.3)' },
      { fill: '#FFFFFF', vein: 'rgba(30, 168, 84, 0.3)' },
      { fill: '#0036FF', vein: 'rgba(181, 248, 0, 0.6)' },
    ];

    this.leaves = [];
    for (let i = 0; i < count; i++) {
      const pal = leafPalettes[Math.floor(Math.random() * leafPalettes.length)];
      const size = 11 + Math.random() * 14;
      this.leaves.push({
        x: Math.random() * (this.width || 1400),
        y: Math.random() * (this.height || 800) - 200,
        w: size * (0.8 + Math.random() * 0.4),
        h: size * (1.4 + Math.random() * 0.5),
        vy: 0.8 + Math.random() * 1.4,
        rotX: Math.random() * Math.PI * 2,
        vRotX: 0.018 + Math.random() * 0.032,
        rotY: Math.random() * Math.PI * 2,
        vRotY: 0.022 + Math.random() * 0.038,
        rotZ: Math.random() * Math.PI * 2,
        vRotZ: (Math.random() - 0.5) * 0.02,
        swayAmp: 16 + Math.random() * 28,
        swaySpeed: 0.016 + Math.random() * 0.022,
        phase: Math.random() * Math.PI * 2,
        color: pal.fill,
        veinColor: pal.vein,
        opacity: 0.55 + Math.random() * 0.35,
        scale: 0.8 + Math.random() * 0.4,
      });
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    gsap.ticker.add(this.tickerFunc);
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    gsap.ticker.remove(this.tickerFunc);
  }

  public setOffScreen(offScreen: boolean): void {
    this.isOffScreen = offScreen;
    if (offScreen) {
      this.pause();
    } else {
      this.start();
    }
  }

  private update(): void {
    if (!this.ctx || this.isOffScreen) return;
    const ctx = this.ctx;
    this.time += 1;

    ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.leaves.length; i++) {
      const l = this.leaves[i];
      l.y += l.vy;
      l.rotX += l.vRotX;
      l.rotY += l.vRotY;
      l.rotZ += l.vRotZ;

      // Wrap around bottom
      if (l.y > this.height + 40) {
        l.y = -40;
        l.x = Math.random() * this.width;
      }

      // Horizontal sway with wind
      const swayX = Math.sin(this.time * l.swaySpeed + l.phase) * l.swayAmp;
      const currentX = l.x + swayX;

      // 3D projection factors
      const cosX = Math.cos(l.rotX);
      const cosY = Math.cos(l.rotY);

      // Draw 3D botanical tumbling leaf
      ctx.save();
      ctx.translate(currentX, l.y);
      ctx.rotate(l.rotZ);
      // True 3D tumbling via X/Y perspective scaling
      ctx.scale(cosX * l.scale, cosY * l.scale);

      ctx.globalAlpha = l.opacity * (0.6 + 0.4 * Math.abs(cosX));
      ctx.fillStyle = l.color;

      // Organic curved leaf shape
      const hw = l.w / 2;
      const hh = l.h / 2;
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.bezierCurveTo(hw * 1.3, -hh * 0.4, hw * 1.3, hh * 0.4, 0, hh);
      ctx.bezierCurveTo(-hw * 1.3, hh * 0.4, -hw * 1.3, -hh * 0.4, 0, -hh);
      ctx.closePath();
      ctx.fill();

      // Delicate center leaf vein
      ctx.beginPath();
      ctx.moveTo(0, -hh * 0.85);
      ctx.lineTo(0, hh * 0.85);
      ctx.strokeStyle = l.veinColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  public destroy(): void {
    this.pause();
    this.leaves = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}

export { PaperSlipsRenderer as FallingLeavesRenderer };
