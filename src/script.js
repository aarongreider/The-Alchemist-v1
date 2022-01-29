import './style.css'
//import './checker.png'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationMixer, PCFShadowMap, SkeletonHelper } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js';
//import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
//import { GodRaysFakeSunShader, GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader } from './jsm/shaders/GodRaysShader.js';



// Debug
const gui = new dat.GUI();
const stats = Stats();
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

// Clock
const clock = new THREE.Clock();

// Texture Loader
const txtLoader = new THREE.TextureLoader();

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Postprocessing
/* const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect())); */

// Uniforms
let uniforms = {
    time: { value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
    sampleTxt: {
        value: txtLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png')
    }
};

/** 
 * GLOBAL VARIABLES
 */

// init objects
let autoscroll = true;
let boyAnimations, settings;
let boxMesh, sphereMesh, sunMesh, skydomeMesh, sceneModel;
let boyMixer1, skeleton, boyModel, duneModel;
let activeClip, pole_walking_NLA, sitting_NLA, start_walking_NLA, movePos1_NLA, walk_cycle_NLA;

// init scene
let wheelDeltaY, wheelTotalY, controls, camera, renderer;

function initObjects() {

    // Geometry
    //const torusGeo = new THREE.TorusGeometry(.75, .2, 16, 100);
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const boxGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const sphereGeo = new THREE.SphereGeometry(.5, 100, 100);
    const circleGeo = new THREE.CircleGeometry(.5, 30);

    //  Textures
    const checkTxt = txtLoader.load(`https://threejsfundamentals.org/threejs/resources/images/checker.png`);
    checkTxt.wrapS = THREE.RepeatWrapping;
    checkTxt.wrapT = THREE.RepeatWrapping;
    checkTxt.repeat.set(10, 10);
    checkTxt.magFilter = THREE.NearestFilter;
    const skyTxt = txtLoader.load(`skydome.jpg`);
    const duneBaseTxt = txtLoader.load(`duneMat_baseColor.png`);
    const duneMetalTxt = txtLoader.load(`duneMat_metallicMap.png`);

    // Materials
    const redMat = new THREE.MeshBasicMaterial();
    redMat.color = new THREE.Color(0xff0000);

    const phongMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    const txtMat = new THREE.MeshBasicMaterial({
        map: checkTxt,
        side: THREE.DoubleSide
    })

    const skyMat = new THREE.MeshBasicMaterial({
        map: skyTxt,
        //emissive: 0xffffff,
        //emissiveMap: skyTxt,
        //emissiveIntensity: 5,
        side: THREE.BackSide
    });

    const duneMat = new THREE.MeshStandardMaterial({
        map: duneBaseTxt,
        roughnessMap: duneMetalTxt,
        metalness: .5,
        metalnessMap: duneMetalTxt
    });

    // Shader Materials
    const shaderMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.DoubleSide
    });

    const shaderMat2 = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader2').textContent,
        side: THREE.DoubleSide
    });

    const shaderMat3 = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader3').textContent,
        side: THREE.DoubleSide
    });


    // Mesh

    boxMesh = new THREE.Mesh(boxGeo, phongMat);
    boxMesh.position.y = .15;
    boxMesh.position.x = .15;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    scene.add(boxMesh);

    sphereMesh = new THREE.Mesh(sphereGeo, shaderMat);
    sphereMesh.scale.set(1.5, 1.5, 1.5);
    sphereMesh.position.x = -1.25;
    sphereMesh.position.z = -1.25;
    scene.add(sphereMesh);

    sunMesh = new THREE.Mesh(circleGeo, phongMat);
    sunMesh.position.z = -3;
    sunMesh.position.x = 1;
    sunMesh.position.y = 1;
    scene.add(sunMesh);

    skydomeMesh = new THREE.Mesh(sphereGeo, skyMat);
    skydomeMesh.scale.set(50, 50, 50);
    //skydomeMesh.castShadow = true;
    scene.add(skydomeMesh);

    gltfLoader.load(`dune+boy_v14.gltf`, (gltf) => {
        sceneModel = gltf.scene;

        //set transforms
        sceneModel.scale.set(.1, .1, .1);

        // assign cast shadow
        sceneModel.traverse(function (object) {
            if (object.isMesh) {
                //object.castShadow = true;
                object.receiveShadow = true;


                if (object.name.includes("Dunes")) {
                    console.log("object name: " + object.name)
                    object.material = duneMat;
                }
            }
        });

        // add model to scene
        scene.add(sceneModel);

        // show rig skeleton
        skeleton = new THREE.SkeletonHelper(sceneModel);
        skeleton.visible = true;
        scene.add(skeleton);

        // init animation mixer
        boyMixer1 = new THREE.AnimationMixer(sceneModel);
        console.log("anim leng: " + gltf.animations.length);

        //boyMixer1.clipAction(gltf.animations[0]).play();
        //console.log(boyMixer1.clipAction(gltf.animations[0]));
        boyAnimations = gltf.animations;

        movePos1_NLA = boyMixer1.clipAction(gltf.animations[0]);
        pole_walking_NLA = boyMixer1.clipAction(gltf.animations[1]);
        sitting_NLA = boyMixer1.clipAction(gltf.animations[2]);
        start_walking_NLA = boyMixer1.clipAction(gltf.animations[3]);
        walk_cycle_NLA = boyMixer1.clipAction(gltf.animations[4]);

        activeClip = movePos1_NLA;
        activeClip.play();
        //walk_cycle_NLA.play();
        //activeClip.setEffectiveWeight(0);
        //boyMixer1.clipAction(movePos1_NLA).play();

        //boyMixer1.clipAction(gltf.animations[3]).setEffectiveWeight(0);

        console.log(boyAnimations);
        console.log(activeClip);
        //gui.add(sceneModel.position, "y").min(-20).max(5);
        const folder1 = gui.addFolder('boy controls');

        settings = {
            'sit down': function () { switchAnims(sitting_NLA) },
            'walk cycle': function () { switchAnims(walk_cycle_NLA) },
            'move position 1': function () { switchAnims(movePos1_NLA) },
            'pole walking': function () { switchAnims(pole_walking_NLA) },
            'start walking': function () { switchAnims(start_walking_NLA) }
        }
        folder1.add(settings, 'sit down');
        folder1.add(settings, 'walk cycle');
        folder1.add(settings, 'move position 1');
        folder1.add(settings, 'pole walking');
        folder1.add(settings, 'start walking');

    });

    // Lights
    {
        /* const pointLight = new THREE.PointLight(0xffffff, 1)
        //pointLight.position.set(2, 3, 4);
        pointLight.position.set(0.5, 1, 0);
        pointLight.castShadow = true;
        scene.add(pointLight); */

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);


        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(3, 10, 10);
        dirLight.intensity = .5;
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 2;
        dirLight.shadow.camera.bottom = - 2;
        dirLight.shadow.camera.left = - 2;
        dirLight.shadow.camera.right = 2;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 40;
        dirLight.target = boxMesh;
        scene.add(dirLight);
        scene.add(new THREE.CameraHelper(dirLight.shadow.camera));
    }
}
function switchAnims(newClip) {
    //activeClip.setEffectiveWeight(0);
    newClip.setEffectiveWeight(1);
    newClip.play();
    activeClip.crossFadeTo(newClip, 1, false);
    activeClip = newClip;
}

/**
 * INIT SCENE
 */

function initScene() {

    /**
     * Sizes
     */
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    window.addEventListener('resize', () => {
        // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight

        // Update camera
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()

        // Update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    /**
     * Mouse Wheel Event
     */
    new function normalizeWheel(val, min, max) {
        return (val - min) / (max - min);
    }

    wheelTotalY = 0;
    window.addEventListener("wheel", event => {
        wheelDeltaY = event.deltaY;
        wheelTotalY += wheelDeltaY;
        console.log(wheelDeltaY);
        //console.log("total Y: " + wheelTotalY);
    });

    /**
     * Camera
     */
    // Base camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 2
    scene.add(camera)
    gui.add(camera.position, "y").min(-5).max(5);

    // Controls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true;
    //controls.enabled = false;

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;

    // Load GUI Items
    //autoscroll = true;
    var params = {
        scroll: autoscroll
    };
    gui.add(params, "scroll").name("scroll").onChange(function () {
        if (autoscroll) { console.log("no autoscroll") }
        autoscroll = !autoscroll;
    });

}


/**
 * Animate
 */
let htmlBody = document.querySelector("html");
console.log(htmlBody.scrollHeight);
console.log(window.innerHeight);
const tick = () => {
    stats.begin()

    if ((htmlBody.scrollTop <= (htmlBody.scrollHeight - window.innerHeight - 10)) && (autoscroll)) {
        htmlBody.scrollTop++;
        //console.log(htmlBody.scrollTop);
    } else if (autoscroll) {
        htmlBody.scrollTop = 0;
        //console.log("scrolltop bottom " + htmlBody.scrollTop);
    }
    //const clock = new THREE.Clock()
    const elapsedTime = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Update Uniforms
    uniforms['time'].value = performance.now() / 1000;
    uniforms['resolution'].value = [window.innerWidth, window.innerHeight];

    // Update objects
    boxMesh.rotation.x = (wheelTotalY / 3800) + (htmlBody.scrollTop / 100);
    boxMesh.rotation.y = (wheelTotalY / 3800) + (htmlBody.scrollTop / 100);

    // Update animations
    if (boyMixer1) {
        //mixer.update(delta);

        //var t = elapsedTime;
        //var t = (wheelTotalY / 2500) + (elapsedTime / 2);
        var t = (wheelTotalY / 3800) + (htmlBody.scrollTop / 200);
        //var t = (Math.random() / 5) + (elapsedTime);
        //var t = Math.sin(elapsedTime) * 10;
        //var t = Math.floor(elapsedTime) / 5;
        //var t = (Math.round(10 * elapsedTime) / 8);
        //console.log("custom time: " + t);
        boyMixer1.setTime(t);
    }

    // Update stats
    stats.update();

    // Update Orbital Controls
    controls.update();

    // Render
    renderer.render(scene, camera);

    stats.end()
    // Call tick again on the next frame
    requestAnimationFrame(tick);
}



initObjects();
initScene();
tick();