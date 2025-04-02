import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ControlsComponent from './ControlsComponent';

const StarPolyhedron = () => {
  const mountRef = useRef(null);
  const [color, setColor] = useState('#ffff00');
  const [lightIntensity, setLightIntensity] = useState(0.6);
  const [scene, setScene] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [camera, setCamera] = useState(null);
  const [polyhedron, setPolyhedron] = useState(null);
  const [directionalLight, setDirectionalLight] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const sceneInstance = new THREE.Scene();
    const cameraInstance = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    cameraInstance.position.z = 5;

    const rendererInstance = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererInstance.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(rendererInstance.domElement);

    // Geometry creation
    const geometry = new THREE.IcosahedronGeometry(1);
    const material = new THREE.MeshStandardMaterial({ color: color, flatShading: true });
    const polyhedronInstance = new THREE.Mesh(geometry, material);
    sceneInstance.add(polyhedronInstance);

    // Lighting
    const directionalLightInstance = new THREE.DirectionalLight(0xffffff, lightIntensity);
    directionalLightInstance.position.set(0, 5, 5).normalize();
    sceneInstance.add(directionalLightInstance);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    sceneInstance.add(ambientLight);

    // Controls
    const controls = new OrbitControls(cameraInstance, rendererInstance.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      rendererInstance.render(sceneInstance, cameraInstance);
    };
    animate();

    // Set the objects into state
    setScene(sceneInstance);
    setRenderer(rendererInstance);
    setCamera(cameraInstance);
    setPolyhedron(polyhedronInstance);
    setDirectionalLight(directionalLightInstance);

    // Cleanup on component unmount
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(rendererInstance.domElement);
      }
    };
  }, []);

  useEffect(() => {
    // Update material color dynamically when color state changes
    if (polyhedron) {
      polyhedron.material.color.set(color);
    }
  }, [color, polyhedron]);

  useEffect(() => {
    // Update light intensity dynamically when lightIntensity state changes
    if (directionalLight) {
      directionalLight.intensity = lightIntensity;
    }
  }, [lightIntensity, directionalLight]);

  const handleColorChange = (colorResult) => {
    setColor(colorResult.hex);
  };

  const handleReset = () => {
    setColor('#ffff00');
    setLightIntensity(0.6);
  };

  const handleRandomize = () => {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    setColor(randomColor);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <ControlsComponent
        color={color}
        onColorChange={handleColorChange}
        onReset={handleReset}
        onRandomize={handleRandomize}
        lightIntensity={lightIntensity}
        onLightChange={setLightIntensity}
      />
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default StarPolyhedron;
