import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { formatCountdown, REEL_GEOMETRY, reelLayout, type ReelLayout } from "./reelLayout";

/**
 * Real-time hanging scroll: a cotton-rag sheet stretched between two ebonized
 * rollers with turned brass finials. The clip is printed inside an intaglio
 * plate mark, the sheet breathes in a slow air current with both rolled edges
 * held by the rollers, and raking light from the upper left (the site's
 * sunlight direction) reads the folds. World units are CSS pixels on z = 0.
 */

const PAPER_VERT = /* glsl */ `
uniform float uTime;
uniform float uMotion;
uniform float uWaveScale;
uniform float uTopY;
uniform float uBottomY;
uniform vec2 uPointer;
uniform float uPointerAmt;
varying vec2 vUv;
varying vec3 vNormal;
varying float vWorldY;
varying float vLift;

float sheet(vec2 p) {
  float span = max(uTopY - uBottomY, 1.0);
  float t = clamp((p.y - uBottomY) / span, 0.0, 1.0);
  // Held by both rollers: zero displacement at each rolled edge
  float env = sin(3.14159265 * t);
  float k1 = 6.2831853 / 290.0;
  float k2 = 6.2831853 / 170.0;
  // A slow gallery air current: one travelling fold, a cross ripple, and a breathing billow
  float wave =
    13.0 * sin(k1 * p.x - 1.15 * uTime + 1.9 * t) +
    4.5 * sin(k2 * (0.55 * p.x + 0.83 * p.y) + 0.8 * uTime + 0.6) +
    9.0 * sin(0.52 * uTime + 0.9) * (0.6 + 0.4 * sin(k1 * 0.6 * p.x + 0.35 * uTime));
  vec2 d = (p - uPointer) / 70.0;
  float swell = 7.0 * uPointerAmt * exp(-dot(d, d));
  return env * uWaveScale * (wave * uMotion + swell);
}

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  float z = sheet(world.xy);
  float e = 1.5;
  float dzdx = (sheet(world.xy + vec2(e, 0.0)) - z) / e;
  float dzdy = (sheet(world.xy + vec2(0.0, e)) - z) / e;
  vNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
  vWorldY = world.y;
  vLift = z;
  world.z += z;
  // The deckled sides drift a touch as the sheet breathes
  float span = max(uTopY - uBottomY, 1.0);
  float tt = clamp((world.y - uBottomY) / span, 0.0, 1.0);
  world.x += uMotion * sin(3.14159265 * tt) * 1.8 * sin(0.61 * uTime + world.y * 0.011);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const PAPER_FRAG = /* glsl */ `
uniform sampler2D uGrain;
uniform sampler2D uVideo;
uniform sampler2D uPoster;
uniform sampler2D uCaption;
uniform float uVideoMix;
uniform vec2 uPaperSize;
uniform vec4 uPlate;      // x, y, w, h in px from the paper's top-left
uniform vec4 uCaptionRect;
uniform float uRuleY;
uniform float uProgress;
uniform float uBottomY;
uniform float uOpacity;
uniform vec3 uRag;
uniform vec3 uInk;
uniform vec3 uLightDir;
varying vec2 vUv;
varying vec3 vNormal;
varying float vWorldY;
varying float vLift;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void main() {
  // The part of the sheet still wound on the base roller stays hidden
  if (vWorldY < uBottomY) discard;

  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uPaperSize;

  // Deckled side edges of handmade rag
  float side = step(uPaperSize.x * 0.5, px.x) * 31.0;
  float deckle = 0.8 + 0.9 * noise1(px.y * 0.19 + side) + 0.5 * noise1(px.y * 0.47 + 7.0 + side);
  float edge = min(px.x, uPaperSize.x - px.x);
  float alpha = smoothstep(deckle - 1.3, deckle + 1.2, edge);
  // Handmade edges are thinner and catch a little shadow
  float rim = 1.0 - smoothstep(deckle, deckle + 3.0, edge);
  if (alpha <= 0.0) discard;

  float grain = texture2D(uGrain, px / 192.0).r;
  vec3 color = uRag * mix(0.93, 1.035, grain) * (1.0 - 0.06 * rim);

  // Printed clip inside an intaglio plate mark, edge blended over one screen pixel
  vec2 pp = (px - uPlate.xy) / uPlate.zw;
  vec2 toEdge = min(px - uPlate.xy, uPlate.xy + uPlate.zw - px);
  float plateDist = min(toEdge.x, toEdge.y);
  float plateAA = max(fwidth(plateDist), 1e-3);
  float plateCover = smoothstep(-0.5 * plateAA, 0.5 * plateAA, plateDist);
  if (plateCover > 0.0) {
    // Slight inset hides recording edges (scrollbars, crop seams) in the source clips
    vec2 cp0 = clamp(pp, 0.0, 1.0);
    vec2 tuv = vec2(0.025 + 0.95 * cp0.x, 1.0 - (0.025 + 0.95 * cp0.y));
    vec3 still = texture2D(uPoster, tuv).rgb;
    vec3 film = texture2D(uVideo, tuv).rgb;
    vec3 printed = mix(still, film, uVideoMix) * mix(0.965, 1.02, grain);
    color = mix(color, printed, plateCover);
  }
  vec2 markMin = uPlate.xy - 6.0;
  vec2 markMax = uPlate.xy + uPlate.zw + 6.0;
  vec2 dm = min(px - markMin, markMax - px);
  float inside = step(0.0, min(dm.x, dm.y));
  float band = inside * (1.0 - smoothstep(0.0, 1.1, min(dm.x, dm.y)));
  // Pressed rag: edges facing the upper-left light fall into shadow
  float facing = (px.x - markMin.x < 1.2 || px.y - markMin.y < 1.2) ? -1.0 : 1.0;
  color *= 1.0 + band * (facing < 0.0 ? -0.075 : 0.05);
  float innerBand = inside * smoothstep(0.0, 6.0, min(dm.x, dm.y)) * (1.0 - step(0.0, min(min(pp.x, 1.0 - pp.x), min(pp.y, 1.0 - pp.y))));
  color *= 1.0 - 0.018 * innerBand;

  // Hairline rule that inks in as the reel plays
  float ruleDist = abs(px.y - uRuleY);
  float ruleAA = max(fwidth(px.y), 1e-3);
  float rule = 1.0 - smoothstep(0.5 - ruleAA * 0.5, 0.5 + ruleAA * 0.5, ruleDist);
  float ruleX = (px.x - uPlate.x) / uPlate.z;
  float onRule = step(0.0, ruleX) * step(ruleX, 1.0) * rule;
  float inked = step(ruleX, uProgress);
  color = mix(color, uInk, onRule * mix(0.16, 0.62, inked));

  // Typeset label
  vec2 cp = (px - uCaptionRect.xy) / uCaptionRect.zw;
  if (cp.x >= 0.0 && cp.x <= 1.0 && cp.y >= 0.0 && cp.y <= 1.0) {
    float ink = texture2D(uCaption, vec2(cp.x, 1.0 - cp.y)).a;
    color = mix(color, uInk, ink * 0.92);
  }

  // Raking light reads the folds; rag stays matte
  vec3 n = normalize(vNormal);
  float flat_ = 0.6 + 0.4 * uLightDir.z;
  float diff = (0.6 + 0.4 * max(dot(n, uLightDir), 0.0)) / flat_;
  float shade = mix(1.0, diff, 2.6);
  shade *= 1.0 + 0.003 * vLift;
  vec3 halfway = normalize(uLightDir + vec3(0.0, 0.0, 1.0));
  float sheen = pow(max(dot(n, halfway), 0.0), 40.0) - pow(halfway.z, 40.0);
  color = color * clamp(shade, 0.66, 1.13) + 0.045 * max(sheen, 0.0);

  gl_FragColor = vec4(color, alpha * uOpacity);
}
`;

const SHADOW_VERT = /* glsl */ `
varying vec2 vPx;
uniform vec2 uSize;
void main() {
  vPx = (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SHADOW_FRAG = /* glsl */ `
varying vec2 vPx;
uniform vec2 uSize;
uniform vec2 uRect;
uniform float uBlur;
uniform float uOpacity;
void main() {
  vec2 q = abs(vPx) - uRect * 0.5;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float a = 1.0 - smoothstep(-uBlur * 0.4, uBlur, d);
  gl_FragColor = vec4(0.03, 0.05, 0.04, a * a * uOpacity);
}
`;

/** Shader colours stay in display space, like the sampled textures. */
function srgb(hex: string): THREE.Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}
function easeInCubic(t: number) {
  return t * t * t;
}

/** Turned brass finial profile, in px, revolved around its axis: collar, neck, urn, acorn tip. */
function finialProfile(r: number): THREE.Vector2[] {
  return [
    [0, 0],
    [r + 0.9, 0],
    [r + 1.3, 0.5],
    [r + 1.3, 1.9],
    [r + 0.9, 2.4],
    [r - 0.6, 2.9],
    [r - 0.9, 3.8],
    [r - 0.2, 4.7],
    [r + 1.9, 6.1],
    [r + 3.2, 7.9],
    [r + 3.4, 9.0],
    [r + 2.7, 10.6],
    [r + 1.2, 11.9],
    [r - 1.2, 12.6],
    [r - 2.4, 13.3],
    [1.6, 14.3],
    [0.5, 14.8],
    [0, 14.85],
  ].map(([x, y]) => new THREE.Vector2(x, y));
}

export interface ReelSceneOptions {
  canvas: HTMLCanvasElement;
  /** Element covering only the sheet (not the canvas bleed) that feeds the pointer swell. */
  pointerTarget: HTMLElement;
  video: HTMLVideoElement | null;
  poster: string;
  title: string;
  reduced: boolean;
  onFrameError?: () => void;
}

export class ReelScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 1, 6000);
  private paper: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private topRoller: THREE.Group;
  private bottomRoller: THREE.Group;
  private rollerMaterials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private captionCanvas = document.createElement("canvas");
  private captionTexture: THREE.CanvasTexture;
  private layout: ReelLayout | null = null;
  private frame = 0;
  private startTime = performance.now();
  private reveal = 0;
  private rollerIn = 0;
  private tween: { from: number; to: number; start: number; duration: number; ease: (t: number) => number; done?: () => void } | null = null;
  private videoMix = 0;
  private lastCaption = "";
  private pointer = new THREE.Vector2(-9999, -9999);
  private pointerAmt = 0;
  private pointerInside = false;
  private disposed = false;
  private captionFontsReady = false;

  constructor(private readonly options: ReelSceneOptions) {
    const { canvas } = options;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.035);
    this.scene.environment = envTarget.texture;
    pmrem.dispose();
    this.textures.push(envTarget.texture);

    const key = new THREE.DirectionalLight(0xfff4e2, 1.6);
    key.position.set(-420, 520, 600);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

    const loader = new THREE.TextureLoader();
    const grain = loader.load("/media/paper-grain.webp", () => this.requestRender());
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    const posterTex = loader.load(options.poster, () => this.requestRender());
    posterTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(grain, posterTex);

    let videoTex: THREE.Texture = posterTex;
    if (options.video) {
      const vt = new THREE.VideoTexture(options.video);
      vt.minFilter = THREE.LinearFilter;
      vt.generateMipmaps = false;
      videoTex = vt;
      this.textures.push(vt);
    }

    this.captionTexture = new THREE.CanvasTexture(this.captionCanvas);
    this.captionTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(this.captionTexture);

    const paperMaterial = new THREE.ShaderMaterial({
      vertexShader: PAPER_VERT,
      fragmentShader: PAPER_FRAG,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: options.reduced ? 0 : 1 },
        uWaveScale: { value: 1 },
        uTopY: { value: 0 },
        uBottomY: { value: 0 },
        uPointer: { value: this.pointer },
        uPointerAmt: { value: 0 },
        uGrain: { value: grain },
        uVideo: { value: videoTex },
        uPoster: { value: posterTex },
        uCaption: { value: this.captionTexture },
        uVideoMix: { value: 0 },
        uPaperSize: { value: new THREE.Vector2(1, 1) },
        uPlate: { value: new THREE.Vector4() },
        uCaptionRect: { value: new THREE.Vector4() },
        uRuleY: { value: 0 },
        uProgress: { value: 0 },
        uOpacity: { value: 1 },
        uRag: { value: srgb("#f3ecdf") },
        uInk: { value: srgb("#2a201a") },
        uLightDir: { value: new THREE.Vector3(-0.66, 0.52, 0.54).normalize() },
      },
    });
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 72, 48), paperMaterial);
    this.paper.renderOrder = 1;

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: SHADOW_VERT,
        fragmentShader: SHADOW_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uSize: { value: new THREE.Vector2(1, 1) },
          uRect: { value: new THREE.Vector2(1, 1) },
          uBlur: { value: 22 },
          uOpacity: { value: 0 },
        },
      }),
    );
    this.shadow.renderOrder = 0;

    // Ebonized wood with an oiled, satin face; brass turned and lightly brushed
    const ebony = new THREE.MeshPhysicalMaterial({
      color: 0x080504,
      roughness: 0.58,
      clearcoat: 0.22,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.14,
    });
    const brass = new THREE.MeshPhysicalMaterial({
      color: 0xa8824a,
      metalness: 1,
      roughness: 0.4,
      envMapIntensity: 0.85,
    });
    this.rollerMaterials.push(ebony, brass);
    this.topRoller = this.buildRoller(ebony, brass);
    this.bottomRoller = this.buildRoller(ebony, brass);
    this.topRoller.renderOrder = this.bottomRoller.renderOrder = 2;

    this.scene.add(this.shadow, this.paper, this.topRoller, this.bottomRoller);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        this.captionFontsReady = true;
        this.lastCaption = "";
        this.requestRender();
      });
    } else {
      this.captionFontsReady = true;
    }

    options.pointerTarget.addEventListener("pointermove", this.onPointerMove);
    options.pointerTarget.addEventListener("pointerleave", this.onPointerLeave);
  }

  private buildRoller(ebony: THREE.Material, brass: THREE.Material): THREE.Group {
    const r = REEL_GEOMETRY.rollerRadius;
    const group = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 40, 1), ebony);
    rod.rotation.z = Math.PI / 2;
    rod.name = "rod";
    const finialGeo = new THREE.LatheGeometry(finialProfile(r), 56);
    const left = new THREE.Mesh(finialGeo, brass);
    left.rotation.z = Math.PI / 2;
    left.name = "finial-left";
    const right = new THREE.Mesh(finialGeo, brass);
    right.rotation.z = -Math.PI / 2;
    right.name = "finial-right";
    group.add(rod, left, right);
    return group;
  }

  /** Lay out for the container's CSS size (width drives everything else). */
  setSize(width: number) {
    const layout = reelLayout(width);
    this.layout = layout;
    const { bleed } = REEL_GEOMETRY;
    const cw = layout.width + bleed.x * 2;
    const ch = layout.height + bleed.top + bleed.bottom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(cw, ch, false);

    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = ch / 2 / Math.tan(fovRad / 2);
    this.camera.aspect = cw / ch;
    // Centre the camera on the container box, not the bleed
    this.camera.position.set(0, 0, distance);
    this.camera.near = distance - 400;
    this.camera.far = distance + 400;
    this.camera.updateProjectionMatrix();
    this.originX = -cw / 2 + bleed.x;
    this.originY = ch / 2 - bleed.top;

    const u = this.paper.material.uniforms;
    // Folds are tuned for a ~390 px sheet; narrower sheets get proportionally shallower folds
    u.uWaveScale.value = Math.min(1, Math.max(0.45, layout.paperWidth / 390) ** 1.5);
    u.uPaperSize.value.set(layout.paperWidth, layout.paperHeight);
    u.uPlate.value.set(layout.plate.x, layout.plate.y, layout.plate.w, layout.plate.h);
    u.uCaptionRect.value.set(layout.caption.x, layout.caption.y, layout.caption.w, layout.caption.h);
    u.uRuleY.value = layout.ruleY;
    this.paper.scale.set(layout.paperWidth, layout.paperHeight, 1);

    const rodLength = layout.paperWidth + 4;
    for (const roller of [this.topRoller, this.bottomRoller]) {
      roller.getObjectByName("rod")!.scale.set(1, rodLength, 1);
      roller.getObjectByName("finial-left")!.position.x = -rodLength / 2;
      roller.getObjectByName("finial-right")!.position.x = rodLength / 2;
    }

    const dprCaption = Math.min((window.devicePixelRatio || 1) * 1.5, 3);
    this.captionCanvas.width = Math.round(layout.caption.w * dprCaption);
    this.captionCanvas.height = Math.round(layout.caption.h * dprCaption);
    this.captionScale = dprCaption;
    this.lastCaption = "";
    this.applyReveal();
    this.requestRender();
  }

  private originX = 0;
  private originY = 0;
  private captionScale = 2;

  /** Box coordinates (px from container top-left, y down) to world. */
  private wx(x: number) {
    return this.originX + x;
  }
  private wy(y: number) {
    return this.originY - y;
  }

  private applyReveal() {
    const layout = this.layout;
    if (!layout) return;
    const { rollerRadius: r } = REEL_GEOMETRY;
    const bottomCenterY = layout.height - r;
    const travel = layout.paperHeight;
    const topCenterY = bottomCenterY - travel * this.reveal;
    const cx = this.wx(layout.width / 2);

    this.bottomRoller.position.set(cx, this.wy(bottomCenterY), 0);
    this.topRoller.position.set(cx, this.wy(topCenterY), 0.5);
    const rollerScale = 0.75 + 0.25 * this.rollerIn;
    this.bottomRoller.scale.set(rollerScale, 1, 1);
    this.topRoller.scale.set(rollerScale, 1, 1);
    this.topRoller.visible = this.bottomRoller.visible = this.rollerIn > 0.01;

    // Paper top edge rides the top roller; the rest is wound on the base roller
    this.paper.position.set(cx, this.wy(topCenterY) - layout.paperHeight / 2, 0);
    const u = this.paper.material.uniforms;
    u.uTopY.value = this.wy(topCenterY);
    u.uBottomY.value = this.wy(bottomCenterY);
    u.uOpacity.value = this.options.reduced ? this.reveal : 1;
    this.paper.visible = this.reveal > 0.001;

    const visibleH = travel * this.reveal;
    const s = this.shadow.material.uniforms;
    const pad = 60;
    this.shadow.scale.set(layout.paperWidth + pad * 2, visibleH + pad * 2, 1);
    s.uSize.value.set(layout.paperWidth + pad * 2, visibleH + pad * 2);
    s.uRect.value.set(layout.paperWidth - 6, Math.max(visibleH - 4, 0));
    s.uOpacity.value = 0.42 * Math.min(1, this.reveal * 1.4);
    this.shadow.position.set(cx + 7, this.wy(topCenterY + visibleH / 2) - 13, -20);
  }

  private drawCaption(remaining: string) {
    const layout = this.layout;
    if (!layout || !this.captionFontsReady) return;
    const key = `${remaining}|${layout.caption.w}`;
    if (key === this.lastCaption) return;
    this.lastCaption = key;
    const ctx = this.captionCanvas.getContext("2d");
    if (!ctx) return;
    const s = this.captionScale;
    const w = this.captionCanvas.width;
    const h = this.captionCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.textBaseline = "alphabetic";

    const baseline = Math.round(h * 0.7);
    ctx.font = `600 ${11 * s}px "Jost Variable", "Jost Fallback", system-ui, sans-serif`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${0.14 * 11 * s}px`;
    const clock = remaining;
    const clockWidth = ctx.measureText(clock).width;
    ctx.textAlign = "right";
    ctx.fillText(clock, w, baseline);

    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.font = `italic 400 ${16 * s}px "Newsreader Variable", "Newsreader Fallback", Georgia, serif`;
    let title = this.options.title;
    const maxTitle = w - clockWidth - 18 * s;
    while (title.length > 4 && ctx.measureText(title).width > maxTitle) title = `${title.slice(0, -2)}…`;
    ctx.fillText(title, 0, baseline);
    this.captionTexture.needsUpdate = true;
  }

  /** Compile every program before the first frame (parallel where the driver allows). */
  async prepare(): Promise<void> {
    const meshes = [this.paper, this.shadow, this.topRoller, this.bottomRoller];
    const visibility = meshes.map((object) => object.visible);
    for (const object of meshes) object.visible = true;
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      // Falls back to compiling on first render
    } finally {
      meshes.forEach((object, i) => (object.visible = visibility[i]!));
    }
  }

  open(): Promise<void> {
    return new Promise((resolve) => {
      if (this.options.reduced) {
        this.rollerIn = 1;
        this.animate(0, 1, 160, (t) => t, resolve);
        return;
      }
      this.startRollerIn();
      this.animate(this.reveal, 1, 1050, easeOutQuint, resolve, 110);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      const duration = this.options.reduced ? 120 : 420;
      this.animate(this.reveal, 0, duration, easeInCubic, () => {
        this.rollerIn = 0;
        this.requestRender();
        resolve();
      });
    });
  }

  private rollerTween: { start: number } | null = null;
  private startRollerIn() {
    this.rollerTween = { start: performance.now() };
  }

  private animate(from: number, to: number, duration: number, ease: (t: number) => number, done?: () => void, delay = 0) {
    this.tween = { from, to, start: performance.now() + delay, duration, ease, done };
    this.requestRender();
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.options.pointerTarget.getBoundingClientRect();
    this.pointer.set(this.wx(event.clientX - rect.left), this.wy(event.clientY - rect.top));
    this.pointerInside = true;
    this.requestRender();
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
  };

  private needsLoop() {
    return !this.options.reduced || this.tween !== null;
  }

  requestRender() {
    if (this.disposed || this.frame) return;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed) return;

    if (this.rollerTween) {
      const t = Math.min(1, (now - this.rollerTween.start) / 220);
      this.rollerIn = easeOutQuint(t);
      if (t >= 1) this.rollerTween = null;
    }
    if (this.tween) {
      const t = Math.min(1, Math.max(0, (now - this.tween.start) / this.tween.duration));
      this.reveal = this.tween.from + (this.tween.to - this.tween.from) * this.tween.ease(t);
      if (t >= 1) {
        const done = this.tween.done;
        this.tween = null;
        done?.();
      }
    }

    const u = this.paper.material.uniforms;
    if (!this.options.reduced) u.uTime.value = (now - this.startTime) / 1000;
    this.pointerAmt += ((this.pointerInside ? 1 : 0) - this.pointerAmt) * 0.06;
    u.uPointerAmt.value = this.options.reduced ? 0 : this.pointerAmt;

    const video = this.options.video;
    let remaining = this.options.reduced || !video ? "STILL" : "";
    if (video && !this.options.reduced) {
      const ready = video.readyState >= 2 && !video.paused;
      this.videoMix += ((ready ? 1 : 0) - this.videoMix) * 0.14;
      u.uVideoMix.value = this.videoMix;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      u.uProgress.value = duration > 0 ? video.currentTime / duration : 0;
      remaining = duration > 0 ? formatCountdown(duration - video.currentTime) : "REEL";
    }
    this.drawCaption(remaining);

    this.applyReveal();
    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.options.onFrameError?.();
      return;
    }
    if (this.needsLoop()) this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.options.pointerTarget.removeEventListener("pointermove", this.onPointerMove);
    this.options.pointerTarget.removeEventListener("pointerleave", this.onPointerLeave);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.paper.material.dispose();
    this.shadow.material.dispose();
    for (const material of this.rollerMaterials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
  }
}
