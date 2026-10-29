/* ==========================================================================
   FlowMelon — WebGL scenes (three.js)
   <div data-gl="flutes">  light hero: reeded-glass refraction over flowing blue light
   <div data-gl="nebula">  dark hero: flowing navy/blue nebula + drifting particles
   <div data-gl="orb">     3D morphing glass orb that follows the cursor
   Optional: data-gl-color="#146ef5" data-gl-accent="#c6f43c"
   ========================================================================== */
import * as THREE from '../vendor/three.module.min.js';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FLUTES_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uScroll;
uniform vec3 uBase; uniform vec3 uBlue; uniform vec3 uDeep;
${NOISE}
float field(vec2 p){
  float t = uTime * 0.12;
  float aspect = uRes.x / uRes.y;
  vec2 q = vec2(p.x * aspect, p.y);
  // sweeping wave band across the lower half
  float wave = 0.36 + 0.10 * sin(p.x * 3.2 + t * 2.0) + 0.05 * snoise(vec3(p.x * 2.0, t, 0.0)) - uScroll * 0.25;
  float band = exp(-pow((p.y - wave) * 9.0, 2.0)) * smoothstep(0.0, 0.45, p.x) * (1.0 - smoothstep(0.75, 1.0, p.x) * 0.6);
  // big glow top-right
  vec2 c1 = vec2((0.86 + 0.04 * sin(t * 1.3)) * aspect, 0.92 + 0.04 * cos(t));
  float g1 = smoothstep(0.62, 0.0, length(q - c1));
  // soft glow left
  vec2 c2 = vec2((0.02 + 0.03 * sin(t * 0.9)) * aspect, 0.42);
  float g2 = smoothstep(0.42, 0.0, length(q - c2)) * 0.75;
  // cursor light
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float g3 = smoothstep(0.32, 0.0, length(q - m)) * 0.55;
  float n = snoise(vec3(q * 1.6, t)) * 0.08;
  return clamp(band * 0.75 + g1 * 1.05 + g2 * 0.8 + g3 + n, 0.0, 1.2);
}
void main(){
  vec2 uv = vUv;
  float ribs = floor(uRes.x / 26.0);
  float fx = fract(uv.x * ribs);
  // each rib refracts the light behind it (lens-like offset + slight vertical stretch)
  float lens = (fx - 0.5);
  vec2 ruv = uv + vec2(lens * 0.035, lens * lens * 0.015);
  float f = field(ruv);
  f = mix(f, field(ruv + vec2(0.005, 0.0)), 0.5);
  // keep a calm, readable zone behind the headline
  float aspect = uRes.x / uRes.y;
  float safe = smoothstep(0.12, 0.62, length((uv - vec2(0.5, 0.55)) * vec2(aspect * 0.55, 1.15)));
  f *= mix(0.28, 1.0, safe);
  vec3 col = mix(uBase, uBlue, smoothstep(0.08, 0.85, f));
  col = mix(col, uDeep, smoothstep(0.72, 1.15, f));
  // glass rib shading: thin bright edge + soft inner shadow
  float edge = smoothstep(0.94, 1.0, fx) * 0.07 + smoothstep(0.06, 0.0, fx) * 0.03;
  float shade = (0.5 - abs(fx - 0.5)) * 0.035;
  col += edge - shade;
  gl_FragColor = vec4(col, 1.0);
}`;

const NEBULA_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uScroll;
uniform vec3 uBase; uniform vec3 uBlue; uniform vec3 uDeep;
${NOISE}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.02; a*=0.5; } return s; }
void main(){
  vec2 uv = vUv; float aspect = uRes.x / uRes.y;
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float t = uTime * 0.05;
  vec2 m = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  q += (m - q) * 0.06 * smoothstep(0.8, 0.0, length(q - m));
  float n = fbm(vec3(q * 1.4, t)) ;
  float n2 = fbm(vec3(q * 2.4 + n, t * 1.6 + 4.0));
  float glow = smoothstep(1.1, 0.0, length(q * vec2(0.8, 1.3) - vec2(0.0, 0.1 + uScroll * 0.3)));
  float v = clamp(n2 * 0.6 + 0.5, 0.0, 1.0) * glow;
  vec3 col = mix(uBase, uDeep, v);
  col = mix(col, uBlue, smoothstep(0.45, 0.95, v) * 0.85);
  col += smoothstep(0.35, 0.0, length(q - m)) * 0.10 * uBlue;
  // subtle scanline grain
  col += (fract(sin(dot(uv * uRes, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

const ORB_VERT = /* glsl */ `
uniform float uTime; uniform float uAmp;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
${NOISE}
void main(){
  vec3 p = position;
  float n = snoise(normal * 1.4 + uTime * 0.35) ;
  float n2 = snoise(normal * 3.2 - uTime * 0.25) * 0.35;
  float d = (n + n2) * uAmp;
  p += normal * d;
  vNoise = d;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;
const ORB_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBlue; uniform vec3 uAccent; uniform vec3 uDeep; uniform float uTime;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
void main(){
  float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
  vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + fres * 0.8 + vNoise * 1.5 + uTime * 0.05));
  vec3 col = mix(uDeep, uBlue, 0.35 + vNoise * 2.0);
  col = mix(col, iri * vec3(0.55, 0.75, 1.0), fres * 0.65);
  col += uAccent * pow(fres, 3.0) * 0.6;
  float spec = pow(max(dot(reflect(-normalize(vec3(0.4, 0.8, 0.6)), normalize(vNormal)), normalize(vView)), 0.0), 24.0);
  col += spec * 0.7;
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h, f) => new THREE.Color(h || f);

export function mount(el, { mouse }) {
  const type = el.dataset.gl;
  const renderer = new THREE.WebGLRenderer({ antialias: type === 'orb', alpha: type === 'orb', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, type === 'orb' ? 2 : 1.5));
  el.appendChild(renderer.domElement);
  // never leave a black canvas behind: on a shader failure fall back to the static image
  let failed = false;
  renderer.debug.onShaderError = () => { renderer.domElement.remove(); el.classList.remove('gl-ready'); failed = true; };
  const scene = new THREE.Scene();
  let camera;
  const uniforms = {
    uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uScroll: { value: 0 },
    uBase: { value: hex(el.dataset.glBase, type === 'nebula' ? '#04031f' : '#f2f5fc') },
    uBlue: { value: hex(el.dataset.glColor, type === 'flutes' ? '#7aa8f5' : '#146ef5') },
    uDeep: { value: hex(el.dataset.glDeep, type === 'nebula' ? '#0b1a66' : '#1665f0') },
    uAccent: { value: hex(el.dataset.glAccent, '#c6f43c') },
    uAmp: { value: 0.22 },
  };
  let orb; let points;
  if (type === 'orb') {
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 6;
    orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 64), new THREE.ShaderMaterial({ vertexShader: ORB_VERT, fragmentShader: ORB_FRAG, uniforms }));
    scene.add(orb);
  } else {
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: type === 'nebula' ? NEBULA_FRAG : FLUTES_FRAG, uniforms, depthWrite: false });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    if (type === 'nebula') {
      const count = 420;
      const pos = new Float32Array(count * 3);
      const spd = new Float32Array(count);
      for (let i = 0; i < count; i++) { pos[i * 3] = Math.random() * 2 - 1; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = 0; spd[i] = 0.2 + Math.random(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
      points = new THREE.Points(g, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms,
        vertexShader: `attribute float aSpeed; uniform float uTime; uniform vec2 uMouse; varying float vA;
          void main(){ vec3 p = position; p.y = mod(p.y + uTime * 0.02 * aSpeed + 1.0, 2.0) - 1.0; p.x += sin(uTime * 0.2 * aSpeed + p.y * 3.0) * 0.01;
          vec2 m = uMouse * 2.0 - 1.0; vec2 d = p.xy - m; p.xy += normalize(d) * 0.06 * smoothstep(0.3, 0.0, length(d));
          vA = 0.25 + 0.75 * fract(aSpeed * 7.13); gl_PointSize = (1.2 + aSpeed * 2.2); gl_Position = vec4(p, 1.0); }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.75, 0.85, 1.0), smoothstep(0.5, 0.0, d) * vA); }`,
      }));
      scene.add(points);
    }
  }

  const resize = () => {
    const w = el.clientWidth || 1; const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
    if (camera.isPerspectiveCamera) { camera.aspect = w / h; camera.updateProjectionMatrix(); orb.scale.setScalar(Math.min(1, (w / h) * 0.9)); }
  };
  resize();
  new ResizeObserver(resize).observe(el);

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' }).observe(el);

  const sm = new THREE.Vector2(0.5, 0.5);
  const clock = new THREE.Clock();
  let rotX = 0; let rotY = 0;
  const tick = () => {
    requestAnimationFrame(tick);
    if (failed || !visible || document.hidden) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    const r = el.getBoundingClientRect();
    const mx = (mouse.x - r.left) / r.width; const my = 1 - (mouse.y - r.top) / r.height;
    sm.x += (mx - sm.x) * 0.05; sm.y += (my - sm.y) * 0.05;
    uniforms.uMouse.value.copy(sm);
    uniforms.uScroll.value = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
    if (orb) {
      rotY += ((sm.x - 0.5) * 1.2 - rotY) * 0.05; rotX += ((0.5 - sm.y) * 0.8 - rotX) * 0.05;
      orb.rotation.set(rotX + t * 0.05, rotY + t * 0.12, 0);
      uniforms.uAmp.value = 0.2 + Math.min(0.25, Math.hypot(sm.x - 0.5, sm.y - 0.5) * 0.3);
    }
    renderer.render(scene, camera);
  };
  tick();
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!failed) el.classList.add('gl-ready'); }));
  el.closest('section') && el.closest('section').classList.add('gl-ready');
}
