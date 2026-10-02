/** Original WebGL artwork: a travelling wave through a ribbon of beveled discs.
 * All geometry, materials and movement are generated locally; no video or 3D library. */
type Variant = 'pink' | 'blue'
type Vec3 = [number, number, number]

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform float uAspect;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vPosition = world.xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  float depth = 24.0 - world.z;
  gl_Position = vec4(world.x * 2.4 / uAspect, world.y * 2.4, depth * 1.002 - 0.2, depth);
}`
const fragmentSource = `
precision mediump float;
uniform vec3 uColor;
uniform vec3 uLightColor;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 normal = normalize(vNormal);
  if (!gl_FrontFacing) normal = -normal;
  vec3 light = normalize(vec3(-7.0, 11.0, 16.0) - vPosition);
  vec3 view = normalize(vec3(0.0, 0.0, 24.0) - vPosition);
  vec3 halfVector = normalize(light + view);
  float diffuse = max(dot(normal, light), 0.0);
  float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.8);
  float specular = pow(max(dot(normal, halfVector), 0.0), 38.0);
  float softbox = pow(max(dot(normal, normalize(vec3(0.4, -0.3, 0.85))), 0.0), 12.0);
  float tint = smoothstep(-8.0, 10.0, vPosition.x + vPosition.y * 0.25);
  vec3 material = mix(uColor * 0.82, uLightColor, tint * 0.47);
  vec3 color = material * (0.62 + diffuse * 0.49);
  color += vec3(1.0, 0.86, 0.94) * specular * 0.55;
  color += uLightColor * softbox * 0.22;
  color += uLightColor * max(normal.z, 0.0) * 0.08;
  color += uLightColor * rim * 0.38;
  gl_FragColor = vec4(color, 1.0);
}`

function discGeometry() {
  const vertices: number[] = []
  const segments = 72
  const add = (position: Vec3, normal: Vec3) => vertices.push(...position, ...normal)
  const point = (angle: number, radius: number, z: number): Vec3 => [Math.cos(angle) * radius, Math.sin(angle) * radius, z]
  const normal = (angle: number, z: number): Vec3 => [Math.cos(angle) * Math.sqrt(1 - z * z), Math.sin(angle) * Math.sqrt(1 - z * z), z]
  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < segments; index++) {
      const a = index / segments * Math.PI * 2
      const b = (index + 1) / segments * Math.PI * 2
      const faceNormal: Vec3 = [0, 0, side]
      const face = [point(a, .982, side * .021), point(b, .982, side * .021)]
      add([0, 0, side * .021], faceNormal)
      add(face[side > 0 ? 0 : 1], faceNormal)
      add(face[side > 0 ? 1 : 0], faceNormal)
      const bevel = [point(a, 1, side * .009), point(b, 1, side * .009)]
      const order = side > 0 ? [0, 2, 1, 1, 2, 3] : [1, 2, 0, 3, 2, 1]
      const positions = [face[0], face[1], bevel[0], bevel[1]]
      const normals = [normal(a, side * .9), normal(b, side * .9), normal(a, side * .25), normal(b, side * .25)]
      for (const n of order) add(positions[n], normals[n])
    }
  }
  for (let index = 0; index < segments; index++) {
    const a = index / segments * Math.PI * 2
    const b = (index + 1) / segments * Math.PI * 2
    const positions = [point(a, 1, -.009), point(b, 1, -.009), point(a, 1, .009), point(b, 1, .009)]
    for (const n of [0, 1, 2, 2, 1, 3]) add(positions[n], normal(n % 2 === 0 ? a : b, 0))
  }
  return new Float32Array(vertices)
}

function modelMatrix(x: number, y: number, z: number, rx: number, ry: number, rz: number, scale: number) {
  const sx = Math.sin(rx), cx = Math.cos(rx), sy = Math.sin(ry), cy = Math.cos(ry), sz = Math.sin(rz), cz = Math.cos(rz)
  return new Float32Array([
    cz * cy * scale, sz * cy * scale, -sy * scale, 0,
    (cz * sy * sx - sz * cx) * scale, (sz * sy * sx + cz * cx) * scale, cy * sx * scale, 0,
    (cz * sy * cx + sz * sx) * scale, (sz * sy * cx - cz * sx) * scale, cy * cx * scale, 0,
    x, y, z, 1,
  ])
}

export function createBrandRenderer(canvas: HTMLCanvasElement, variant: Variant) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false })
  if (!gl) return null
  const shaders: WebGLShader[] = []
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Unable to create artwork shader')
    shaders.push(shader)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Unable to compile artwork shader')
    return shader
  }
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  if (!program || !buffer) return null
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link artwork shader')
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    return null
  }
  gl.useProgram(program)
  const geometry = discGeometry()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW)
  for (const [attribute, offset] of [['aPosition', 0], ['aNormal', 12]] as const) {
    const location = gl.getAttribLocation(program, attribute)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset)
  }
  const model = gl.getUniformLocation(program, 'uModel')
  const aspect = gl.getUniformLocation(program, 'uAspect')
  gl.uniform3fv(gl.getUniformLocation(program, 'uColor'), variant === 'pink' ? [1, .15, .55] : [.06, .32, .55])
  gl.uniform3fv(gl.getUniformLocation(program, 'uLightColor'), variant === 'pink' ? [1, .77, .9] : [.65, .87, 1])
  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)

  return {
    render(seconds: number, scroll: number, width: number, height: number) {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.4 : 1.65)
      const renderWidth = Math.round(width * pixelRatio), renderHeight = Math.round(height * pixelRatio)
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth
        canvas.height = renderHeight
        gl.viewport(0, 0, renderWidth, renderHeight)
      }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      const sceneAspect = Math.max(width / height, .7)
      gl.uniform1f(aspect, sceneAspect)
      const phase = seconds / 13.35 * Math.PI * 2
      const mobile = width < 700
      for (let index = 0; index < 25; index++) {
        const position = (index - 12) * 1.65
        const wave = phase + position * .29
        const x = position * (mobile ? .24 : .49) + Math.sin(wave) * 1.4 + (mobile ? 1.0 : 1.8)
        const y = position + Math.cos(wave) * 1.85 + scroll * 1.6
        const z = Math.sin(wave + .65) * 2.3 - Math.abs(position) * .08
        const rotationX = 1.03 + Math.sin(wave + .55) * .68
        const rotationY = .14 + Math.cos(wave) * .23
        const rotationZ = -.38 + Math.cos(phase + position * .16) * .12
        const radius = (mobile ? 4.3 : 5.55) * (1 + Math.sin(phase) * .035)
        gl.uniformMatrix4fv(model, false, modelMatrix(x, y, z, rotationX, rotationY, rotationZ, radius))
        gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 6)
      }
    },
    destroy() {
      shaders.forEach(shader => gl.deleteShader(shader))
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
