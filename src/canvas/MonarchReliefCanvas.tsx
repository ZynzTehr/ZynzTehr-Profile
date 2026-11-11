import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "../lib/scrollEngine";

export interface MonarchReliefCanvasProps {
  progressRef?: MutableRefObject<number>;
  sourceImgRef?: RefObject<HTMLImageElement | null>;
  videoActive?: boolean;
  imageSrc?: string;
  className?: string;
}

const RELIEF_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uCoverScale;
  uniform float uHasTexture;

  varying vec2 vImageUv;
  varying vec2 vScreenUv;
  varying float vElevation;

  void main() {
    vScreenUv = uv;
    // Anchor matches CSS object-cover object-[52%_42%] (WebGL bottom-up y = 1.0 - 0.42 = 0.58)
    vec2 anchor = vec2(0.52, 0.58);
    vec2 centered = (uv - anchor) * uCoverScale + anchor;
    vImageUv = clamp(centered, 0.001, 0.999);

    float elevation = 0.0;
    if (uHasTexture > 0.5) {
      vec4 texel = texture2D(uMap, vImageUv);
      float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      float wingWarmth = clamp((texel.r - texel.b) * 1.65, 0.0, 1.0);
      float centerMask = smoothstep(0.42, 0.12, distance(vImageUv, vec2(0.52, 0.56)));
      float paperMask = smoothstep(0.58, 0.86, luma) * smoothstep(0.46, 0.18, distance(vImageUv, vec2(0.49, 0.50)));
      float wingLift = wingWarmth * centerMask * (0.018 + 0.0025 * sin(uTime * 1.15));
      elevation = paperMask * 0.008 + wingLift;
    }

    vElevation = elevation;

    vec3 pos = position;
    pos.z += elevation;
    pos.x += uPointer.x * elevation * 0.28;
    pos.y += uPointer.y * elevation * 0.28;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const RELIEF_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uVideoActive;
  uniform float uHasTexture;

  varying vec2 vImageUv;
  varying vec2 vScreenUv;
  varying float vElevation;

  void main() {
    // Sunbeams enter from the upper-left olive window (uv ~ 0.08, 0.88) toward lower-right (uv ~ 0.92, 0.14)
    float beamCross = (vScreenUv.x * 0.58 + vScreenUv.y * 0.81) * 10.5;
    float alongBeam = vScreenUv.x * 0.81 - vScreenUv.y * 0.58;
    float sway = sin(uTime * 0.26 + alongBeam * 2.6) * 0.38;
    float leafDapple = sin(beamCross + sway) * cos(beamCross * 0.67 - sway * 1.25);
    float rakingSunlight = smoothstep(-0.35, 0.78, leafDapple);

    float pointerDist = distance(vScreenUv, vec2(0.5 + uPointer.x * 0.32, 0.5 + uPointer.y * 0.28));
    float warmSpecular = smoothstep(0.48, 0.0, pointerDist);

    if (uVideoActive > 0.5) {
      vec3 veilColor = mix(vec3(0.98, 0.89, 0.74), vec3(1.0, 0.96, 0.88), rakingSunlight);
      float alpha = 0.045 * rakingSunlight + 0.05 * warmSpecular;
      gl_FragColor = vec4(veilColor, alpha);
      return;
    }

    if (uHasTexture < 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec2 parallaxUv = clamp(vImageUv - uPointer * (0.0024 + vElevation * 0.055), 0.001, 0.999);
    vec4 base = texture2D(uMap, parallaxUv);

    // Subtle morning olive-branch shadow & warm California sunbeam modulation
    float shadowMask = smoothstep(0.12, 0.82, vScreenUv.y) * smoothstep(0.92, 0.14, vScreenUv.x);
    float lightFactor = 1.0 + (rakingSunlight - 0.45) * 0.05 * shadowMask;

    // Chromaticity-masked brass & Monarch-wing specular catch so cotton-rag stays matte
    float warmChroma = clamp((base.r - base.b) * 2.1, 0.0, 1.0);
    float mattePaperGuard = 1.0 - smoothstep(0.76, 0.92, dot(base.rgb, vec3(0.299, 0.587, 0.114)));
    float brassZone = smoothstep(0.36, 0.08, distance(vImageUv, vec2(0.72, 0.34)));
    vec3 sunlitTint = vec3(1.028, 0.996, 0.958);
    vec3 color = base.rgb * mix(vec3(1.0), sunlitTint, rakingSunlight * 0.42) * lightFactor;
    color += vec3(0.98, 0.82, 0.56) * warmSpecular * warmChroma * mattePaperGuard * (0.045 + brassZone * 0.08 + vElevation * 0.8);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const DUST_VERTEX_SHADER = /* glsl */ `
  attribute float aScale;
  attribute float aPhase;

  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float drift = uTime * 0.085 + aPhase;
    pos.y = mod(pos.y + drift * 0.24 + 0.65, 1.3) - 0.65;
    pos.x += sin(drift * 1.4 + aPhase) * 0.035 + uPointer.x * 0.045 * pos.z;
    pos.z += cos(drift * 0.9 + aPhase) * 0.02;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aScale * uPixelRatio * (14.0 / max(0.6, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;

    float edgeFade = smoothstep(0.64, 0.28, abs(pos.y));
    float shimmer = 0.55 + 0.45 * sin(uTime * 0.9 + aPhase * 3.7);
    vAlpha = edgeFade * shimmer;
  }
`;

const DUST_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float softCircle = smoothstep(0.5, 0.06, dist);
    gl_FragColor = vec4(1.0, 0.91, 0.74, softCircle * vAlpha * 0.42);
  }
`;

const IMAGE_ASPECT = 1376 / 768;
const DUST_COUNT = 40;

function computeCoverScale(viewportAspect: number, imageAspect: number): [number, number] {
  if (viewportAspect > imageAspect) {
    return [1, viewportAspect === 0 ? 1 : imageAspect / viewportAspect];
  }
  return [imageAspect === 0 ? 1 : viewportAspect / imageAspect, 1];
}

export function MonarchReliefCanvas({
  progressRef,
  sourceImgRef,
  videoActive = false,
  imageSrc = "/media/hero-monarch.webp",
  className = "",
}: MonarchReliefCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || fallback) return;

    const reducedMotion = prefersReducedMotion();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }

    const gl = renderer.getContext?.();
    if (!gl) {
      renderer.dispose();
      setFallback(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10);
    camera.position.set(0, 0, 2.15);

    const placeholderTexture = new THREE.DataTexture(new Uint8Array([221, 210, 192, 255]), 1, 1);
    const uniforms = {
      uMap: { value: placeholderTexture as THREE.Texture },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uCoverScale: { value: new THREE.Vector2(1, 1) },
      uVideoActive: { value: videoActive ? 1 : 0 },
      uHasTexture: { value: 0 },
    };

    const planeGeometry = new THREE.PlaneGeometry(1, 1, 88, 56);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: RELIEF_VERTEX_SHADER,
      fragmentShader: RELIEF_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: !videoActive,
    });
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(planeMesh);

    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustScales = new Float32Array(DUST_COUNT);
    const dustPhases = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i += 1) {
      const seed = (i + 1) * 1.6180339;
      dustPositions[i * 3] = ((Math.sin(seed * 12.9898) * 43758.5453) % 1) * 1.7 - 0.85;
      dustPositions[i * 3 + 1] = ((Math.sin(seed * 78.233) * 24634.6345) % 1) * 1.2 - 0.6;
      dustPositions[i * 3 + 2] = 0.08 + Math.abs((Math.sin(seed * 39.346) * 14532.12) % 1) * 0.42;
      dustScales[i] = 0.75 + Math.abs((Math.sin(seed * 91.7) * 9531.4) % 1) * 1.45;
      dustPhases[i] = i * 0.47;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("aScale", new THREE.BufferAttribute(dustScales, 1));
    dustGeometry.setAttribute("aPhase", new THREE.BufferAttribute(dustPhases, 1));

    const dustUniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: dpr },
    };

    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: dustUniforms,
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    let disposed = false;
    let rafId = 0;
    let isIntersecting = true;
    let loadedTexture: THREE.Texture | null = null;
    let cleanupImgListeners: (() => void) | null = null;
    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };

    const updateSize = () => {
      if (disposed) return;
      const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
      const height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
      const aspect = width / height;

      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const frustumHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
      const frustumWidth = frustumHeight * aspect;
      planeMesh.scale.set(frustumWidth, frustumHeight, 1);

      const [scaleX, scaleY] = computeCoverScale(aspect, IMAGE_ASPECT);
      uniforms.uCoverScale.value.set(scaleX, scaleY);
    };

    updateSize();

    const renderSingleFrame = (timeSeconds: number) => {
      if (disposed) return;
      uniforms.uTime.value = timeSeconds;
      dustUniforms.uTime.value = timeSeconds;
      uniforms.uPointer.value.set(pointerCurrent.x, pointerCurrent.y);
      dustUniforms.uPointer.value.set(pointerCurrent.x, pointerCurrent.y);
      renderer.render(scene, camera);
    };

    const shouldAnimate = () => {
      if (disposed || reducedMotion || !isIntersecting) return false;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
      const progress = progressRef?.current ?? 0;
      return progress < 0.25;
    };

    const startTime = performance.now();
    const tick = (now: number) => {
      rafId = 0;
      if (!shouldAnimate()) return;

      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.065;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.065;

      const elapsed = (now - startTime) * 0.001;
      renderSingleFrame(elapsed);
      rafId = window.requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (rafId === 0 && shouldAnimate()) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const activateTexture = (tex: THREE.Texture) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      loadedTexture = tex;
      placeholderTexture.dispose();
      uniforms.uMap.value = tex;
      uniforms.uHasTexture.value = 1;
      setReady(true);
      renderSingleFrame(0);
      ensureRunning();
    };

    if (videoActive) {
      setReady(true);
      if (reducedMotion) {
        renderSingleFrame(0);
      } else {
        ensureRunning();
      }
    } else {
      const existingImg = sourceImgRef?.current ?? null;
      if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
        activateTexture(new THREE.Texture(existingImg));
      } else if (existingImg) {
        const onImgLoad = () => {
          if (existingImg.naturalWidth > 0) {
            activateTexture(new THREE.Texture(existingImg));
          }
        };
        const onImgError = () => {
          if (!disposed) setFallback(true);
        };
        existingImg.addEventListener("load", onImgLoad, { once: true });
        existingImg.addEventListener("error", onImgError, { once: true });
        cleanupImgListeners = () => {
          existingImg.removeEventListener("load", onImgLoad);
          existingImg.removeEventListener("error", onImgError);
        };
      } else {
        const loader = new THREE.TextureLoader();
        loader.load(
          imageSrc,
          (tex) => activateTexture(tex),
          undefined,
          () => {
            if (!disposed) setFallback(true);
          },
        );
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pointerTarget.x = (event.clientX / w - 0.5) * 2;
      pointerTarget.y = -(event.clientY / h - 0.5) * 2;
      ensureRunning();
    };

    const handleScroll = () => {
      if (shouldAnimate()) {
        ensureRunning();
      } else if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      setFallback(true);
    };

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting = entry ? entry.isIntersecting : true;
          handleScroll();
        },
        { threshold: 0.02 },
      );
      intersectionObserver.observe(canvas);
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
        renderSingleFrame(reducedMotion ? 0 : (performance.now() - startTime) * 0.001);
      });
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener("resize", updateSize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleScroll);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      disposed = true;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      cleanupImgListeners?.();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleScroll);
      canvas.removeEventListener("webglcontextlost", handleContextLost);

      planeGeometry.dispose();
      planeMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      if (loadedTexture) {
        loadedTexture.dispose();
      } else {
        placeholderTexture.dispose();
      }
      renderer.dispose();
    };
  }, [fallback, imageSrc, progressRef, sourceImgRef, videoActive]);

  if (fallback) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-webgl-canvas="monarch-relief"
      data-webgl-ready={ready ? "true" : "false"}
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
