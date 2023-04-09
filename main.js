import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {GUI} from 'dat.gui'
import {Color, FramebufferTexture, RGBAFormat, Vector2, Vector3} from "three"

let scene;
let camera;
let renderer;
let orbit;

let gui;

let plane;
let lastFrameTexture;
let accumulatedFrameCount;
const MAX_SPHERES = 16;
const MAX_TRIANGLES = 90;
let shader;

let spheres = []
let triangles = []

function createPlane() {
    const planeHeight = camera.position.z * Math.tan(camera.fov * 0.5 * Math.PI / 180) * 2;
    const planeWidth = planeHeight * camera.aspect;

    lastFrameTexture = new FramebufferTexture(window.innerWidth, window.innerHeight, RGBAFormat);
    accumulatedFrameCount = 0;

    let uniforms = {
        "canvasSize": {value: {x: window.innerWidth, y: window.innerHeight}},
        "ViewParams": {value: {x: planeWidth, y: planeHeight, z: -camera.position.z}},
        "CamToWorldMatrix": {value: camera.matrixWorld},
        "MaxBouceCount": {value: 4},
        "LastFrame": {type: 't', value: lastFrameTexture},
        "NumRenderedFrames": {value: accumulatedFrameCount},
        "accumulateFrames": {value: false},
        "sphereList": {value: []},
        "sphereNumber": {value: spheres.length},
        "triangleList": {value: []},
        "triangleNumber": {value: triangles.length}
    }

    for (let i = 0; i < MAX_SPHERES; i++) {
        uniforms.sphereList.value.push({
            position: new Vector3(0, 0, 0),
            radius: 0,
            material: {
                color: {x: 0, y: 0, z: 0, w: 1.0},
                emissionColor: {x: 0, y: 0, z: 0, w: 1.0},
                emissionStrength: 0,
                smoothness: 0
            }
        })
    }

    for (let i = 0; i < MAX_TRIANGLES; i++) {
        uniforms.triangleList.value.push({
            posA: new Vector3(0, 0, 0),
            posB: new Vector3(0, 0, 0),
            posC: new Vector3(0, 0, 0),
            normalA: new Vector3(0, 0, 0),
            normalB: new Vector3(0, 0, 0),
            normalC: new Vector3(0, 0, 0),
            material: {
                color: {x: 0, y: 0, z: 0, w: 1.0},
                emissionColor: {x: 0, y: 0, z: 0, w: 1.0},
                emissionStrength: 0,
                smoothness: 0
            }
        })
    }

    shader = {
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        uniforms: uniforms,
        glslVersion: THREE.GLSL3
    }

    const planeGeo = new THREE.BufferGeometry()
    const vertices = new Float32Array([
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, -1.0, 1.0
    ]);
    planeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    const planeMat = new THREE.ShaderMaterial(shader)

    plane = new THREE.Mesh(planeGeo, planeMat)
    plane.visible = false;
    scene.add(plane)
}

function addGui() {
    gui = new GUI();
    gui.add(plane, 'visible', true).name("Raytracing");
    gui.add(plane.material.uniforms.accumulateFrames, 'value').name("Accumulate").onChange(() => accumulatedFrameCount = 0);
    gui.add(plane.material.uniforms.MaxBouceCount, 'value').name("Max Bouce");

    function addGroup(s, i) {
        let g = gui.addFolder("Sphere " + i)
        let colors = {
            "color": [
                plane.material.uniforms.sphereList.value[i].material.color.x * 255,
                plane.material.uniforms.sphereList.value[i].material.color.y * 255,
                plane.material.uniforms.sphereList.value[i].material.color.z * 255
            ],
            "emission": [
                plane.material.uniforms.sphereList.value[i].material.emissionColor.x * 255,
                plane.material.uniforms.sphereList.value[i].material.emissionColor.y * 255,
                plane.material.uniforms.sphereList.value[i].material.emissionColor.z * 255
            ]
        }
        g.addColor(colors, 'color').name('Color').onChange((c) => {
            plane.material.uniforms.sphereList.value[i].material.color = {
                x: c[0] / 255,
                y: c[1] / 255,
                z: c[2] / 255,
                w: 1.0
            }
            s.material.color = new Color(c[0] / 255, c[1] / 255, c[2] / 255);
        })
        g.addColor(colors, 'emission').name('EmssionColor').onChange((c) => {
            plane.material.uniforms.sphereList.value[i].material.emissionColor = {
                x: c[0] / 255,
                y: c[1] / 255,
                z: c[2] / 255,
                w: 1.0
            }
        })
        g.add(plane.material.uniforms.sphereList.value[i].material, 'emissionStrength', 0, 1, 0.05)
        g.add(plane.material.uniforms.sphereList.value[i].material, 'smoothness', 0, 1, 0.05)
    }

    spheres.forEach(addGroup);
    // triangles.forEach(addGroup)

}

function addSphere(radius, pos, diffuseColor, emissionColor, emissionStrength, smoothness) {
    let geo = new THREE.SphereGeometry(radius)
    let mat = new THREE.MeshBasicMaterial({color: new Color().setRGB(diffuseColor[0], diffuseColor[1], diffuseColor[2])})
    let sphere = new THREE.Mesh(geo, mat)
    sphere.position.set(pos[0], pos[1], pos[2])
    scene.add(sphere);

    shader.uniforms.sphereList.value[spheres.length] = {
        position: new Vector3(pos[0], pos[1], pos[2]),
        radius: radius,
        material: {
            color: {x: diffuseColor[0], y: diffuseColor[1], z: diffuseColor[2], w: 1.0},
            emissionColor: {x: emissionColor[0], y: emissionColor[1], z: emissionColor[2], w: 1.0},
            emissionStrength: emissionStrength,
            smoothness: smoothness
        }
    }
    spheres.push(sphere);
    plane.material.uniforms.sphereNumber.value = spheres.length;
}

function addMesh(geo, pos, rot, diffuseColor, emissionColor, emissionStrength, smoothness) {
    let mat = new THREE.MeshBasicMaterial({color: new Color().setRGB(diffuseColor[0], diffuseColor[1], diffuseColor[2])});
    let m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2])
    m.rotation.set(rot[0], rot[1], rot[2])
    scene.add(m)

    geo.computeVertexNormals();

    let index = geo.getIndex();
    let vertex = geo.getAttribute('position')
    let normal = geo.getAttribute('normal')

    for (let i = 0; i < index.array.length / 3; i++) {

        let posA = m.localToWorld(new Vector3(
            vertex.array[3 * index.array[3 * i]],
            vertex.array[3 * index.array[3 * i] + 1],
            vertex.array[3 * index.array[3 * i] + 2]
        ))
        let posB = m.localToWorld(new Vector3(
            vertex.array[3 * index.array[3 * i + 1]],
            vertex.array[3 * index.array[3 * i + 1] + 1],
            vertex.array[3 * index.array[3 * i + 1] + 2]
        ))
        let posC = m.localToWorld(new Vector3(
            vertex.array[3 * index.array[3 * i + 2]],
            vertex.array[3 * index.array[3 * i + 2] + 1],
            vertex.array[3 * index.array[3 * i + 2] + 2]
        ))

        // let normalA = m.localToWorld(new Vector3(
        //     normal.array[3 * index.array[3 * i]],
        //     normal.array[3 * index.array[3 * i] + 1],
        //     normal.array[3 * index.array[3 * i] + 2]
        // ))
        // let normalB = m.localToWorld(new Vector3(
        //     normal.array[3 * index.array[3 * i + 1]],
        //     normal.array[3 * index.array[3 * i + 1] + 1],
        //     normal.array[3 * index.array[3 * i + 1] + 2]
        // ))
        // let normalC = m.localToWorld(new Vector3(
        //     normal.array[3 * index.array[3 * i + 2]],
        //     normal.array[3 * index.array[3 * i + 2] + 1],
        //     normal.array[3 * index.array[3 * i + 2] + 2]
        // ))

        let normalA = new Vector3(
            normal.array[3 * index.array[3 * i]],
            normal.array[3 * index.array[3 * i] + 1],
            normal.array[3 * index.array[3 * i] + 2]
        )
        let normalB = new Vector3(
            normal.array[3 * index.array[3 * i + 1]],
            normal.array[3 * index.array[3 * i + 1] + 1],
            normal.array[3 * index.array[3 * i + 1] + 2]
        )
        let normalC = new Vector3(
            normal.array[3 * index.array[3 * i + 2]],
            normal.array[3 * index.array[3 * i + 2] + 1],
            normal.array[3 * index.array[3 * i + 2] + 2]
        )

        shader.uniforms.triangleList.value[triangles.length] = {
            posA: posA,
            posB: posB,
            posC: posC,
            normalA: normalA,
            normalB: normalB,
            normalC: normalC,
            material: {
                color: {x: diffuseColor[0], y: diffuseColor[1], z: diffuseColor[2], w: 1.0},
                emissionColor: {x: emissionColor[0], y: emissionColor[1], z: emissionColor[2], w: 1.0},
                emissionStrength: emissionStrength,
                smoothness: smoothness
            }
        }

        triangles.push(m);
        plane.material.uniforms.triangleNumber.value = triangles.length;
    }

    return m;
}

function createHeartGeo() {
    const vertices = new Float32Array([
        0, 0, 0, // point C
        0, 5, -1.5,
        5, 5, 0, // point A
        9, 9, 0,
        5, 9, 2,
        7, 13, 0,
        3, 13, 0,
        0, 11, 0,
        5, 9, -2,
        0, 8, -3,
        0, 8, 3,
        0, 5, 1.5, // point B
        -9, 9, 0,
        -5, 5, 0,
        -5, 9, -2,
        -5, 9, 2,
        -7, 13, 0,
        -3, 13, 0,
    ]);
    const trianglesIndexes = [
        // face 1
        2, 11, 0, // This represents the 3 points A,B,C which compose the first triangle
        2, 3, 4,
        5, 4, 3,
        4, 5, 6,
        4, 6, 7,
        4, 7, 10,
        4, 10, 11,
        4, 11, 2,
        0, 11, 13,
        12, 13, 15,
        12, 15, 16,
        16, 15, 17,
        17, 15, 7,
        7, 15, 10,
        11, 10, 15,
        13, 11, 15,
        // face 2
        0, 1, 2,
        1, 9, 2,
        9, 8, 2,
        5, 3, 8,
        8, 3, 2,
        6, 5, 8,
        7, 6, 8,
        9, 7, 8,
        14, 17, 7,
        14, 7, 9,
        14, 9, 1,
        9, 1, 13,
        1, 0, 13,
        14, 1, 13,
        16, 14, 12,
        16, 17, 14,
        12, 14, 13
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(trianglesIndexes);
    geo.computeVertexNormals();
    geo.scale(0.15, 0.15, 0.15)
    return geo;
}

function checkCurrentMode() {
    if (!plane.visible) {
        spheres.forEach((val) => val.visible = true);
        triangles.forEach((val) => val.visible = true);
        accumulatedFrameCount = 0;
    } else {
        if (accumulatedFrameCount === 0) lastFrameTexture.dispose()
        spheres.forEach((val) => val.visible = false);
        triangles.forEach((val) => val.visible = false);
        accumulatedFrameCount++;
        plane.material.uniforms.NumRenderedFrames.value = accumulatedFrameCount;
    }
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    renderer = new THREE.WebGLRenderer();
    orbit = new OrbitControls(camera, renderer.domElement);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // const axesHelper = new THREE.AxesHelper(5);
    // scene.add(axesHelper);

    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 10;
    orbit.update();

    createPlane();

    addMesh(createHeartGeo(), [0, -1.5, 0], [0, 0, 0], [1, 1, 1], [0, 0, 0], 0, 0);
    addMesh(new THREE.BoxGeometry(3.8, 0.2, 4), [0, 2, 0], [0, 0, 0], [0.95, 1, 1], [0, 0, 0], 0, 0);
    addMesh(new THREE.PlaneGeometry(2,  2), [0, 1.7, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], [1, 1, 1], 10, 0);
    addMesh(new THREE.BoxGeometry(3.8, 0.2, 4), [0, -2, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0], 0, 0);
    addMesh(new THREE.BoxGeometry(0.2, 4.2, 4), [-2, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], 0, 0);
    addMesh(new THREE.BoxGeometry(4.2, 4.2, 0.2), [0, 0, -2.1], [0, 0, 0], [0.1, 0.1, 0.1], [0, 0, 0], 0, 0);
    addMesh(new THREE.BoxGeometry(0.2, 4.2, 4), [2, 0, 0], [0, 0, 0], [0, 0, 1], [0, 0, 0], 0, 0);

    addGui();

    animate()
}

function animate() {

    checkCurrentMode();

    renderer.render(scene, camera)
    renderer.copyFramebufferToTexture(new Vector2(0, 0), lastFrameTexture)

    requestAnimationFrame(animate)
}

init()