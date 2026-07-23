'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import type { Annotation } from '@/lib/prisma'
import { ViewCube, type ViewCubeFace } from './ViewCube'

export type ViewerMode = 'orbit' | 'annotate' | 'measure'
export type MeasureUnit = 'mm' | 'inch'

interface MeasurePoint {
  point: THREE.Vector3
  screenPos: { x: number; y: number }
}

interface SelectedEntity {
  id: string
  type: 'face'
  mesh: THREE.Mesh
  indices: number[]
  area: number
  centroid: THREE.Vector3
  normal: THREE.Vector3
}

interface AnnotationPin {
  id: string
  index: number
  text: string
  author: string
  worldPos: THREE.Vector3
  screenPos: { x: number; y: number }
  visible: boolean
}

interface Props {
  modelUrl: string
  mode: ViewerMode
  unit: MeasureUnit
  bgColor?: string
  showGrid?: boolean
  meshVisibility?: Record<string, boolean>
  selectedMeshes?: string[]
  onMeshSelect?: (uuid: string | null) => void
  onMeshHide?: (uuid: string) => void
  onAnnotationPlace?: (pos: THREE.Vector3, normal: THREE.Vector3) => void
  annotations: Annotation[]
  onAnnotationClick?: (annotation: Annotation) => void
  onMeshListChange?: (meshes: { name: string; uuid: string; visible: boolean }[]) => void
  cameraTargetRef?: React.MutableRefObject<((pos: THREE.Vector3) => void) | null>
}

// Conversion factor: Three.js GLTF uses meters, display in mm
const METERS_TO_MM = 1000
const METERS_TO_INCH = 39.3701

export default function ThreeViewer({
  modelUrl,
  mode,
  unit,
  bgColor = 'gray',
  showGrid = true,
  meshVisibility,
  selectedMeshes = [],
  onMeshSelect,
  onMeshHide,
  onAnnotationPlace,
  annotations = [],
  onAnnotationClick,
  onMeshListChange,
  cameraTargetRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const frameRef = useRef<number>(0)
  const raycasterRef = useRef(new THREE.Raycaster())
  const meshesRef = useRef<THREE.Mesh[]>([])
  const cubeRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const isVPressedRef = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v' && !e.repeat) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        isVPressedRef.current = true
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') isVPressedRef.current = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Mode effectstate
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([])
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([])
  const [measureType, setMeasureType] = useState<'face' | 'point'>('face')
  const highlightsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const pointsGroupRef = useRef<THREE.Group>(new THREE.Group())

  // Annotation pins screen positions
  const [pins, setPins] = useState<AnnotationPin[]>([])

  // Loading
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)

  // ── Init Three.js scene ───────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const container = containerRef.current
    const canvas = canvasRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.01)
    sceneRef.current = scene
    if (typeof window !== 'undefined') {
      ;(window as any).__threeScene = scene
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.001, 1000)
    camera.position.set(2, 1.5, 2)
    cameraRef.current = camera

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = true
    controls.minDistance = 0.01
    controls.maxDistance = 500
    controlsRef.current = controls

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
    dirLight.position.set(5, 10, 7.5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 100
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4)
    fillLight.position.set(-5, 2, -5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3)
    rimLight.position.set(0, -5, 0)
    scene.add(rimLight)

    // Grid
    const grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000)
    grid.material.opacity = 0.1
    grid.material.transparent = true
    scene.add(grid)
    gridRef.current = grid

    // Ambient + Dir Lights group
    scene.add(highlightsGroupRef.current)
    scene.add(pointsGroupRef.current)

    // Load GLTF model
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        scene.add(model)
        modelRef.current = model

        // Center & fit model in view
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)

        model.position.sub(center)

        // Position grid at bottom of model
        const bottom = box.min.y - center.y
        grid.position.y = bottom

        // Fit camera considering both horizontal and vertical FOV (essential for mobile portrait screens)
        const fovRad = (camera.fov * Math.PI) / 180
        const aspect = camera.aspect
        const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect)
        const effectiveFovRad = aspect < 1 ? hFovRad : fovRad
        const fitDistance = (maxDim / 2) / Math.sin(effectiveFovRad / 2)
        const distance = fitDistance * 1.5

        camera.position.set(distance, distance * 0.5, distance)
        camera.near = maxDim * 0.001
        camera.far = maxDim * 100
        camera.updateProjectionMatrix()
        controls.target.set(0, 0, 0)
        controls.maxDistance = maxDim * 20
        controls.update()

        // Collect all meshes
        const meshList: THREE.Mesh[] = []
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            mesh.castShadow = true
            mesh.receiveShadow = true
            meshList.push(mesh)
          }
        })
        meshesRef.current = meshList

        // Report mesh list to parent
        onMeshListChange?.(
          meshList.map((o) => ({
            name: o.name || `Object_${o.uuid.slice(0, 6)}`,
            uuid: o.uuid,
            visible: o.visible,
          })),
        )

        setLoading(false)
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress((progress.loaded / progress.total) * 100)
        }
      },
      (err) => {
        console.error('GLTF load error:', err)
        setLoading(false)
      },
    )

    // Resize observer
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const resizeObs = new ResizeObserver(handleResize)
    resizeObs.observe(container)

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)

      if (cubeRef.current) {
        cubeRef.current.style.transform = `rotateX(${controls.getPolarAngle() - Math.PI/2}rad) rotateY(${-controls.getAzimuthalAngle()}rad)`
      }
    }
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObs.disconnect()
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl])

  // ── Background Color Sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return
    let colorHex = 0xe5e7eb // gray
    if (bgColor === 'white') colorHex = 0xffffff
    if (bgColor === 'black') colorHex = 0x222222
    if (bgColor === 'beige') colorHex = 0xfcf5eb
    
    sceneRef.current.background = new THREE.Color(colorHex)
    
    // Auto-adjust grid color for dark mode
    if (gridRef.current) {
      const isDark = bgColor === 'black'
      if (Array.isArray(gridRef.current.material)) {
        gridRef.current.material.forEach(m => {
          if (m instanceof THREE.Material && 'color' in m) (m as any).color.setHex(isDark ? 0xffffff : 0x000000)
          m.opacity = isDark ? 0.15 : 0.1
        })
      } else {
        if ('color' in gridRef.current.material) (gridRef.current.material as any).color.setHex(isDark ? 0xffffff : 0x000000)
        gridRef.current.material.opacity = isDark ? 0.15 : 0.1
      }
    }
  }, [bgColor])

  // ── Grid Visibility Sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid
    }
  }, [showGrid])

  // ── Mesh Visibility Sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meshVisibility || !modelRef.current) return
    modelRef.current.traverse((child) => {
      if (meshVisibility[child.uuid] !== undefined) {
        child.visible = meshVisibility[child.uuid]
      }
    })
  }, [meshVisibility])

  // ── Selected Meshes Highlight ─────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !modelRef.current) return
    const scene = sceneRef.current
    
    let group = scene.getObjectByName('selectionGroup')
    if (!group) {
      group = new THREE.Group()
      group.name = 'selectionGroup'
      scene.add(group)
    }
    
    // Clear old highlights
    group.clear()

    if (!selectedMeshes || selectedMeshes.length === 0) return
    
    modelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && selectedMeshes.includes(child.uuid)) {
        const mesh = child as THREE.Mesh
        
        // Edges outline
        const edges = new THREE.EdgesGeometry(mesh.geometry)
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, depthTest: false })
        const lines = new THREE.LineSegments(edges, edgeMat)
        lines.matrixAutoUpdate = false
        lines.matrix.copy(mesh.matrixWorld)
        group!.add(lines)
        
        // Transparent blue tint overlay
        const overlayMat = new THREE.MeshBasicMaterial({ 
          color: 0x3b82f6, 
          transparent: true, 
          opacity: 0.3,
          depthTest: false,
          side: THREE.DoubleSide
        })
        const overlay = new THREE.Mesh(mesh.geometry, overlayMat)
        overlay.matrixAutoUpdate = false
        overlay.matrix.copy(mesh.matrixWorld)
        group!.add(overlay)
      }
    })
  }, [selectedMeshes])

  const faceDistances = useMemo(() => {
    if (selectedEntities.length !== 2) return null;
    const f1 = selectedEntities[0];
    const f2 = selectedEntities[1];
    
    if (f1.type !== 'face' || f2.type !== 'face') return null;

    const getVertices = (ent: SelectedEntity) => {
      const posAttr = ent.mesh.geometry.attributes.position;
      const matrix = ent.mesh.matrixWorld;
      const verts: THREE.Vector3[] = [];
      const seen = new Set<string>();
      
      for (const idx of ent.indices) {
        const p = new THREE.Vector3().fromBufferAttribute(posAttr, idx).applyMatrix4(matrix);
        const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          verts.push(p);
        }
      }
      return verts;
    }

    const v1 = getVertices(f1);
    const v2 = getVertices(f2);
    if (v1.length === 0 || v2.length === 0) return null;
    
    let minDistSq = Infinity;
    let maxDistSq = -Infinity;
    let minPair: [THREE.Vector3, THREE.Vector3] | null = null;
    let maxPair: [THREE.Vector3, THREE.Vector3] | null = null;

    const step1 = Math.max(1, Math.floor(v1.length / 500));
    const step2 = Math.max(1, Math.floor(v2.length / 500));

    for (let i = 0; i < v1.length; i += step1) {
      const p1 = v1[i];
      for (let j = 0; j < v2.length; j += step2) {
        const p2 = v2[j];
        const dSq = p1.distanceToSquared(p2);
        if (dSq < minDistSq) { minDistSq = dSq; minPair = [p1, p2]; }
        if (dSq > maxDistSq) { maxDistSq = dSq; maxPair = [p1, p2]; }
      }
    }

    if (!minPair || !maxPair) return null;

    return {
      min: Math.sqrt(minDistSq),
      max: Math.sqrt(maxDistSq),
      minPair,
      maxPair
    }
  }, [selectedEntities])

  // ── Update highlights & pins ──────────────────────────────────────────────
  useEffect(() => {
    const group = highlightsGroupRef.current
    group.clear()

    if (measureType !== 'face') return

    selectedEntities.forEach(ent => {
      if (ent.type === 'face') {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', ent.mesh.geometry.attributes.position)
        geo.setIndex(ent.indices)
        
        const mat = new THREE.MeshBasicMaterial({ 
          color: 0x22c55e, 
          opacity: 0.4, 
          transparent: true, 
          depthTest: true, 
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        })
        const highlight = new THREE.Mesh(geo, mat)
        highlight.applyMatrix4(ent.mesh.matrixWorld)
        group.add(highlight)

        // Sphere at centroid (small and always visible)
        const sphereGeo = new THREE.SphereGeometry(0.0015, 16, 16)
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x16a34a, depthTest: false })
        const sphere = new THREE.Mesh(sphereGeo, sphereMat)
        sphere.renderOrder = 999
        sphere.position.copy(ent.centroid)
        group.add(sphere)
      }
    })

    if (selectedEntities.length === 2) {
      const p1 = selectedEntities[0].centroid
      const p2 = selectedEntities[1].centroid
      
      const w = canvasRef.current?.clientWidth || window.innerWidth
      const h = canvasRef.current?.clientHeight || window.innerHeight

      const geo = new LineGeometry()
      geo.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z])
      const mat = new LineMaterial({ color: 0x16a34a, linewidth: 3, dashed: true, dashSize: 5, gapSize: 5, depthTest: false })
      mat.resolution.set(w, h)
      const line = new Line2(geo, mat)
      line.computeLineDistances()
      line.renderOrder = 999
      group.add(line)

      if (faceDistances) {
        // Min distance line
        const geoMin = new LineGeometry()
        geoMin.setPositions([faceDistances.minPair[0].x, faceDistances.minPair[0].y, faceDistances.minPair[0].z, faceDistances.minPair[1].x, faceDistances.minPair[1].y, faceDistances.minPair[1].z])
        const matMin = new LineMaterial({ color: 0x3b82f6, linewidth: 3, depthTest: false })
        matMin.resolution.set(w, h)
        const lineMin = new Line2(geoMin, matMin)
        lineMin.renderOrder = 999
        group.add(lineMin)

        // Max distance line
        const geoMax = new LineGeometry()
        geoMax.setPositions([faceDistances.maxPair[0].x, faceDistances.maxPair[0].y, faceDistances.maxPair[0].z, faceDistances.maxPair[1].x, faceDistances.maxPair[1].y, faceDistances.maxPair[1].z])
        const matMax = new LineMaterial({ color: 0xef4444, linewidth: 3, depthTest: false })
        matMax.resolution.set(w, h)
        const lineMax = new Line2(geoMax, matMax)
        lineMax.renderOrder = 999
        group.add(lineMax)
      }
    }
  }, [selectedEntities, measureType, faceDistances])

  useEffect(() => {
    const group = pointsGroupRef.current
    group.clear()

    if (measureType !== 'point') return

    measurePoints.forEach(mp => {
      const sphereGeo = new THREE.SphereGeometry(0.0015, 16, 16)
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false })
      const sphere = new THREE.Mesh(sphereGeo, sphereMat)
      sphere.renderOrder = 999
      sphere.position.copy(mp.point)
      group.add(sphere)
    })

    if (measurePoints.length === 2) {
      const p1 = measurePoints[0].point
      const p2 = measurePoints[1].point
      
      const w = canvasRef.current?.clientWidth || window.innerWidth
      const h = canvasRef.current?.clientHeight || window.innerHeight

      const geo = new LineGeometry()
      geo.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z])
      const mat = new LineMaterial({ color: 0xf59e0b, linewidth: 3, depthTest: false })
      mat.resolution.set(w, h)
      const line = new Line2(geo, mat)
      line.renderOrder = 999
      group.add(line)
    }
  }, [measurePoints, measureType])

  // ── Update annotation pin screen positions every frame ────────────────────
  useEffect(() => {
    if (!cameraRef.current || !rendererRef.current) return
    const canvas = canvasRef.current!
    let rafId: number

    const updatePins = () => {
      rafId = requestAnimationFrame(updatePins)
      if (!cameraRef.current) return

      setPins(
        annotations.map((ann) => {
          const worldPos = new THREE.Vector3(ann.posX, ann.posY, ann.posZ)
          const projected = worldPos.clone().project(cameraRef.current!)
          const rect = canvas.getBoundingClientRect()
          const x = ((projected.x + 1) / 2) * rect.width
          const y = ((-projected.y + 1) / 2) * rect.height
          const visible = projected.z < 1
          return {
            id: ann.id,
            index: ann.index,
            text: ann.text,
            author: ann.author,
            worldPos,
            screenPos: { x, y },
            visible,
          }
        }),
      )
    }

    updatePins()
    return () => cancelAnimationFrame(rafId)
  }, [annotations])

  // ── Expose camera target function to parent ───────────────────────────────
  useEffect(() => {
    if (!cameraTargetRef) return
    cameraTargetRef.current = (pos: THREE.Vector3) => {
      if (!controlsRef.current || !cameraRef.current) return
      const controls = controlsRef.current
      const camera = cameraRef.current
      const box = modelRef.current ? new THREE.Box3().setFromObject(modelRef.current) : null
      const maxDim = box ? box.getSize(new THREE.Vector3()).length() : 1

      // Animate camera to look at annotation
      const from = { tx: controls.target.x, ty: controls.target.y, tz: controls.target.z }
      const to = { x: pos.x, y: pos.y, z: pos.z }
      const duration = 800
      const start = performance.now()

      const animateCam = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        controls.target.set(
          from.tx + (to.x - from.tx) * ease,
          from.ty + (to.y - from.ty) * ease,
          from.tz + (to.z - from.tz) * ease,
        )
        controls.update()
        if (t < 1) requestAnimationFrame(animateCam)
      }
      requestAnimationFrame(animateCam)
    }
  }, [cameraTargetRef])

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleFaceClick = useCallback((face: ViewCubeFace) => {
    if (!controlsRef.current || !cameraRef.current || !modelRef.current) return
    const controls = controlsRef.current
    const camera = cameraRef.current

    // Get model center and size
    const box = new THREE.Box3().setFromObject(modelRef.current)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const distance = Math.max(size.x, size.y, size.z) * 2

    const to = new THREE.Vector3()
    switch (face) {
      case 'front': to.set(0, 0, distance); break
      case 'back': to.set(0, 0, -distance); break
      case 'top': to.set(0, distance, 0); break
      case 'bottom': to.set(0, -distance, 0); break
      case 'left': to.set(-distance, 0, 0); break
      case 'right': to.set(distance, 0, 0); break
    }
    to.add(center)

    // Animate camera
    const fromPos = camera.position.clone()
    const duration = 600
    const start = performance.now()

    const animateCam = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      camera.position.lerpVectors(fromPos, to, ease)
      controls.target.copy(center)
      controls.update()
      if (t < 1) requestAnimationFrame(animateCam)
    }
    requestAnimationFrame(animateCam)
  }, [])

  const handleCubeDrag = useCallback((dx: number, dy: number) => {
    if (!controlsRef.current || !cameraRef.current) return
    const controls = controlsRef.current
    const camera = cameraRef.current

    const rotationSpeed = 0.01
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    
    spherical.theta -= dx * rotationSpeed
    spherical.phi -= dy * rotationSpeed
    spherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, spherical.phi))
    
    offset.setFromSpherical(spherical)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  }, [])

  const handleMeasureClick = useCallback(
    (hit: THREE.Intersection) => {
      if (!sceneRef.current || !cameraRef.current) return
      const scene = sceneRef.current

      if (measureType === 'point') {
        const point = hit.point.clone()
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const projected = point.clone().project(cameraRef.current!)
        const screenPos = {
          x: ((projected.x + 1) / 2) * rect.width,
          y: ((-projected.y + 1) / 2) * rect.height,
        }
        
        setMeasurePoints((prev) => prev.length >= 2 ? [{ point, screenPos }] : [...prev, { point, screenPos }])
        return
      }

      const mesh = hit.object as THREE.Mesh
      const geometry = mesh.geometry as THREE.BufferGeometry
      if (!geometry || !hit.face) return

      const positionAttr = geometry.attributes.position
      const indexAttr = geometry.index
      const isIndexed = indexAttr !== null
      const triangleCount = isIndexed ? indexAttr.count / 3 : positionAttr.count / 3

      const N0 = hit.face.normal.clone()
      const P0 = new THREE.Vector3().fromBufferAttribute(positionAttr, hit.face.a)
      const D0 = N0.dot(P0)

      const matchingIndices: number[] = []
      let totalArea = 0
      const faceCentroid = new THREE.Vector3()

      const pA = new THREE.Vector3()
      const pB = new THREE.Vector3()
      const pC = new THREE.Vector3()
      const cb = new THREE.Vector3()
      const ab = new THREE.Vector3()
      const normal = new THREE.Vector3()

      for (let i = 0; i < triangleCount; i++) {
        const a = isIndexed ? indexAttr.getX(i * 3) : i * 3
        const b = isIndexed ? indexAttr.getX(i * 3 + 1) : i * 3 + 1
        const c = isIndexed ? indexAttr.getX(i * 3 + 2) : i * 3 + 2

        pA.fromBufferAttribute(positionAttr, a)
        pB.fromBufferAttribute(positionAttr, b)
        pC.fromBufferAttribute(positionAttr, c)

        cb.subVectors(pC, pB)
        ab.subVectors(pA, pB)
        normal.crossVectors(cb, ab).normalize()

        if (normal.dot(N0) > 0.99) {
          const d = normal.dot(pA)
          if (Math.abs(d - D0) < 1e-3) {
            matchingIndices.push(a, b, c)
            const area = cb.cross(ab).length() / 2
            totalArea += area
            const centroid = new THREE.Vector3().addVectors(pA, pB).add(pC).divideScalar(3)
            faceCentroid.add(centroid.multiplyScalar(area))
          }
        }
      }

      if (totalArea > 0) faceCentroid.divideScalar(totalArea)
      faceCentroid.applyMatrix4(mesh.matrixWorld)
      
      const scale = mesh.getWorldScale(new THREE.Vector3())
      const worldArea = totalArea * scale.x * scale.y

      const newEntity: SelectedEntity = {
        id: Math.random().toString(),
        type: 'face',
        mesh,
        indices: matchingIndices,
        area: worldArea,
        centroid: faceCentroid,
        normal: N0.clone().transformDirection(mesh.matrixWorld).normalize()
      }

      setSelectedEntities(prev => prev.length >= 2 ? [newEntity] : [...prev, newEntity])
    },
    [measureType],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cameraRef.current || !sceneRef.current || meshesRef.current.length === 0) return

      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )

      const raycaster = raycasterRef.current
      raycaster.setFromCamera(ndc, cameraRef.current)
      const hits = raycaster.intersectObjects(meshesRef.current, false)
      
      if (!hits.length) {
        if (mode === 'orbit') onMeshSelect?.(null)
        return
      }

      const hit = hits[0]
      const point = hit.point.clone()
      const normal = hit.face?.normal
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : new THREE.Vector3(0, 1, 0)

      if (mode === 'annotate') {
        onAnnotationPlace?.(point, normal)
      } else if (mode === 'measure') {
        handleMeasureClick(hit)
      } else if (mode === 'orbit') {
        if (isVPressedRef.current) {
          onMeshHide?.(hit.object.uuid)
        } else {
          onMeshSelect?.(hit.object.uuid)
        }
      }
    },
    [mode, onAnnotationPlace, handleMeasureClick, onMeshSelect, onMeshHide],
  )

  const measureDistance =
    measurePoints.length === 2
      ? measurePoints[0].point.distanceTo(measurePoints[1].point)
      : null

  const measureMidScreen =
    measurePoints.length === 2
      ? {
          x: (measurePoints[0].screenPos.x + measurePoints[1].screenPos.x) / 2,
          y: (measurePoints[0].screenPos.y + measurePoints[1].screenPos.y) / 2,
        }
      : null

  const displayDistance = (d: number) => {
    if (unit === 'mm') return `${(d * METERS_TO_MM).toFixed(2)} mm`
    return `${(d * METERS_TO_INCH).toFixed(3)} in`
  }

  const displayArea = (a: number) => {
    if (unit === 'mm') return `${(a * METERS_TO_MM * METERS_TO_MM).toFixed(1)} mm²`
    return `${(a * METERS_TO_INCH * METERS_TO_INCH).toFixed(2)} in²`
  }

  const cursorStyle =
    mode === 'annotate' ? 'cursor-crosshair' : mode === 'measure' ? 'cursor-cell' : ''

    const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null)

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerDownRef.current) return
      const dx = Math.abs(e.clientX - pointerDownRef.current.x)
      const dy = Math.abs(e.clientY - pointerDownRef.current.y)
      const dt = Date.now() - pointerDownRef.current.time
      
      // If moved less than 5 pixels, it's a click, not a drag
      if (dx < 5 && dy < 5 && dt < 500) {
        handleClick(e as any)
      }
      pointerDownRef.current = null
    }

  return (
    <div ref={containerRef} className="relative w-full h-full select-none">
      {/* Canvas */}
      <canvas
        id="viewer-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={cursorStyle}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-50 z-20">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mb-5" />
          <p className="text-sm text-dark-700 font-medium">Loading model...</p>
          <div className="mt-4 w-48 h-1.5 rounded-full bg-surface-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-xs text-dark-500 mt-2">{Math.round(loadProgress)}%</p>
        </div>
      )}

      {/* Annotation pins overlay */}
      {pins.map((pin) => (
        <button
          key={pin.id}
          className="annotation-pin"
          style={{ left: pin.screenPos.x, top: pin.screenPos.y, opacity: pin.visible ? 1 : 0 }}
          onClick={(e) => {
            e.stopPropagation()
            const ann = annotations.find((a) => a.id === pin.id)
            if (ann) onAnnotationClick?.(ann)
          }}
          title={`${pin.author}: ${pin.text}`}
        >
          <div className="w-7 h-7 rounded-full bg-brand-500 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform">
            {pin.index}
          </div>
        </button>
      ))}

      {/* Point Measure label */}
      {measureType === 'point' && measureDistance !== null && measureMidScreen && (
        <div
          className="absolute pointer-events-none z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-surface-200 text-brand-600 font-bold text-sm"
          style={{
            left: measureMidScreen.x,
            top: measureMidScreen.y - 20,
            transform: 'translateX(-50%)',
          }}
        >
          {displayDistance(measureDistance)}
        </div>
      )}

      {/* Advanced Measure Overlay */}
      {mode === 'measure' && measureType === 'face' && selectedEntities.length > 0 && (
        <div className="absolute bottom-6 left-4 right-4 md:bottom-auto md:left-auto md:top-6 md:right-6 bg-white/95 backdrop-blur-xl border border-surface-200/60 shadow-2xl rounded-2xl p-4 sm:p-5 md:min-w-[280px] animate-fade-in-up z-20">
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <h3 className="font-bold text-dark-900 text-[13px] uppercase tracking-wider">Measurement details</h3>
            <button 
              onClick={() => setSelectedEntities([])} 
              className="text-[11px] font-semibold text-brand-600 hover:text-white bg-brand-50 hover:bg-brand-500 transition-all px-2.5 py-1.5 rounded-lg"
            >
              Reset
            </button>
          </div>
          
          <div className="space-y-1 text-sm">
            {selectedEntities.map((ent, i) => (
              <div key={ent.id} className="flex justify-between items-center py-2 border-b border-surface-100">
                <span className="text-dark-500 font-medium">Face {i + 1}</span>
                <span className="font-bold text-dark-900">{displayArea(ent.area)}</span>
              </div>
            ))}

            {selectedEntities.length === 2 && (
              <div className="pt-2 space-y-1">
                {/* Entraxe */}
                <div className="flex justify-between items-center py-1.5 hover:bg-surface-50 px-2 -mx-2 rounded-lg transition-colors">
                  <span className="text-dark-600 font-medium flex items-center gap-2">
                    <div className="w-3 h-0.5 border-t-2 border-dashed border-green-500"></div> 
                    Center distance
                  </span>
                  <span className="font-bold text-dark-900">{displayDistance(selectedEntities[0].centroid.distanceTo(selectedEntities[1].centroid))}</span>
                </div>
                
                {/* Parallélisme check */}
                {Math.abs(selectedEntities[0].normal.dot(selectedEntities[1].normal)) > 0.99 && (
                  <div className="flex justify-between items-center py-1.5 hover:bg-surface-50 px-2 -mx-2 rounded-lg transition-colors">
                    <span className="text-dark-600 font-medium flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-dark-300"></div> 
                      Planar distance
                    </span>
                    <span className="font-bold text-dark-900">
                      {displayDistance(Math.abs(selectedEntities[0].normal.dot(selectedEntities[1].centroid.clone().sub(selectedEntities[0].centroid))))}
                    </span>
                  </div>
                )}

                {faceDistances && (
                  <>
                    <div className="flex justify-between items-center py-1.5 hover:bg-surface-50 px-2 -mx-2 rounded-lg transition-colors">
                      <span className="text-dark-600 font-medium flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-blue-500 rounded-full"></div> 
                        Dist. Min
                      </span>
                      <span className="font-bold text-dark-900">{displayDistance(faceDistances.min)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1.5 hover:bg-surface-50 px-2 -mx-2 rounded-lg transition-colors">
                      <span className="text-dark-600 font-medium flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-red-500 rounded-full"></div> 
                        Dist. Max
                      </span>
                      <span className="font-bold text-dark-900">{displayDistance(faceDistances.max)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode indicator */}
      {mode !== 'orbit' && (
        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-surface-200 text-xs font-medium text-brand-600 animate-fade-in z-20 flex items-center gap-2">
          {mode === 'annotate' ? (
            <span className="px-3">📍 Click on the model to leave a comment</span>
          ) : (
            <div className="flex bg-surface-100 p-0.5 rounded-full items-center">
              <button 
                onClick={() => { setMeasureType('face'); setMeasurePoints([]) }}
                className={`px-3 py-1.5 rounded-full transition-all ${measureType === 'face' ? 'bg-white shadow-sm text-brand-600' : 'text-dark-500 hover:text-dark-900'}`}
              >
                Face to face
              </button>
              <button 
                onClick={() => { setMeasureType('point'); setSelectedEntities([]) }}
                className={`px-3 py-1.5 rounded-full transition-all ${measureType === 'point' ? 'bg-white shadow-sm text-brand-600' : 'text-dark-500 hover:text-dark-900'}`}
              >
                Point to point
              </button>
              {measureType === 'point' && measurePoints.length > 0 && (
                <>
                  <div className="w-px h-4 bg-surface-300 mx-1"></div>
                  <button 
                    onClick={() => setMeasurePoints([])} 
                    className="px-3 py-1.5 rounded-full text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-all"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}



      {/* View Cube */}
      <ViewCube onFaceClick={handleFaceClick} onDrag={handleCubeDrag} cubeRef={cubeRef} />
    </div>
  )
}

// Collect all Object3Ds with a name (for mesh hierarchy panel)
function collectObjects(root: THREE.Object3D): THREE.Object3D[] {
  const list: THREE.Object3D[] = []
  root.traverse((obj) => {
    if (obj !== root) list.push(obj)
  })
  return list
}
