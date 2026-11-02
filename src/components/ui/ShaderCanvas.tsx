import { useEffect, useRef } from 'react';

const FRAGMENT = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec3 u_surface;
uniform vec3 u_accent;
uniform vec3 u_ink;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;
  vec2 m = (u_pointer * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.25;
  float wave = sin(p.x * 2.1 + t * 2.0 + sin(p.y * 3.0 - t) * 0.8) * 0.5 + 0.5;
  float glow = 0.35 / (0.35 + dot(p - m, p - m) * 1.6);
  float band = smoothstep(0.10, 0.82, wave * 0.82 + glow * 0.42 - uv.y * 0.22);
  float ribbon = smoothstep(0.38, 0.72, sin(p.x * 1.4 + sin(p.y * 2.1 - t) * 1.8 + t) * 0.5 + 0.5);
  vec3 colour = mix(u_surface, u_accent, band * 0.52 + ribbon * 0.18);
  colour = mix(colour, u_ink, smoothstep(0.82, 1.0, band) * 0.18);
  gl_FragColor = vec4(colour, 1.0);
}`;

function cssColorToRgb(value: string): [number, number, number] {
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const context = probe.getContext('2d');
  if (!context) return [0.96, 0.95, 0.91];
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/** Decorative shader background for the report section, with the CSS gradient as fallback. */
export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
      canvas.style.visibility = 'hidden';
      return;
    }
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}');
    const pixel = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !pixel) {
      canvas.style.visibility = 'hidden';
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      canvas.style.visibility = 'hidden';
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, pixel);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.style.visibility = 'hidden';
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const rootStyle = getComputedStyle(document.documentElement);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_surface'), cssColorToRgb('#ffffff'));
    gl.uniform3fv(gl.getUniformLocation(program, 'u_accent'), cssColorToRgb('#dafa86'));
    gl.uniform3fv(gl.getUniformLocation(program, 'u_ink'), cssColorToRgb('#c8ef61'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let visible = true;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * 0.65));
      canvas.height = Math.max(1, Math.round(rect.height * 0.65));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const render = (time: number) => {
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(program, 'u_pointer'), 0.5, 0.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      render(reducedMotion ? 4 : now / 1000);
      if (!reducedMotion && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const resizeObserver = new ResizeObserver(() => { resize(); render(4); });
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      cancelAnimationFrame(frame);
      if (visible && !document.hidden && !reducedMotion) frame = requestAnimationFrame(loop);
    });
    intersection.observe(canvas);
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && visible && !reducedMotion) frame = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    render(4);
    if (!reducedMotion) frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
    };
  }, []);

  return <canvas ref={canvasRef} className="report-shader-canvas" aria-hidden="true" />;
}
