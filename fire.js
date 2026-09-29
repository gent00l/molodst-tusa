// Мультяшный огонь под «О нас»: WebGL-шейдер, шум + постеризация в три цвета (красный / оранжевый / жёлтый).
(function () {
  const canvas = document.getElementById('fireCanvas');
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  const vs = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision mediump float;
    varying vec2 v; uniform float t; uniform vec2 r;
    vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(dot(h2(i), f), dot(h2(i + vec2(1,0)), f - vec2(1,0)), u.x),
                 mix(dot(h2(i + vec2(0,1)), f - vec2(0,1)), dot(h2(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.05 + 17.3; a *= 0.5; } return s; }
    void main(){
      float aspect = r.x / r.y;
      vec2 uv = vec2(v.x * aspect, v.y);
      // языки тянутся вверх: шум едет вниз по времени, растянут по вертикали
      float n = fbm(vec2(uv.x * 2.2, uv.y * 1.6 - t * 0.9));
      float n2 = fbm(vec2(uv.x * 4.5 + 7.0, uv.y * 3.5 - t * 1.6));
      float base = 1.0 - v.y;                       // снизу плотно, кверху пусто
      float h = base * 1.7 + n * 1.5 + n2 * 0.7 - 0.35;
      // дырки внутри пламени, как в cel-shading
      float holes = fbm(vec2(uv.x * 6.0 - 3.0, uv.y * 5.0 - t * 2.2));
      if (holes > 0.34 && v.y > 0.06) h -= 0.75;
      vec3 red = vec3(0.90, 0.20, 0.03), orange = vec3(1.0, 0.55, 0.05), yellow = vec3(1.0, 0.84, 0.18);
      vec3 col; float a = 1.0;
      if (h > 1.55) col = yellow; else if (h > 1.15) col = orange; else if (h > 0.85) col = red; else a = 0.0;
      // плотное жёлтое ядро у самого низа
      if (v.y < 0.05 + n2 * 0.05) { col = yellow; a = 1.0; }
      gl_FragColor = vec4(col, a);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, 't'), uR = gl.getUniformLocation(prog, 'r');

  const resize = () => { const dpr = Math.min(devicePixelRatio, 1.5); canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const start = performance.now();
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    gl.uniform1f(uT, (performance.now() - start) / 1000); gl.uniform2f(uR, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  frame();
})();
