import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import ReactResizeDetector from 'react-resize-detector';

import 'mana-font/css/mana.css';

import * as THREE from 'three';

import {
  CardMainType,
  ColorType,
  Creators,
  RarityType
} from '../../interfaces/enums';

import CommonIcon from './images/rarity/common.png';
import UncommonIcon from './images/rarity/uncommon.png';
import RareIcon from './images/rarity/rare.png';
import MythicRareIcon from './images/rarity/mythic.png';

import BackgroundWhite from './images/white-background.png';
import BackgroundBlue from './images/blue-background.png';
import BackgroundBlack from './images/black-background.png';
import BackgroundRed from './images/red-background.png';
import BackgroundGreen from './images/green-background.png';
import BackgroundGold from './images/gold-background.png';
import BackgroundLand from './images/land-background.png';
import BackgroundColorless from './images/artifact.png';

import NoCover from './images/no-cover.jpg';
import cardToColor from './cardToColor';

interface CardWebGLRender {
  name: string;
  rarity: RarityType;
  creator?: string;
  cardID: string;
  manaCost: string;
  legendary?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  backFace?: boolean;
  keywords: string[];
  collectionNumber: number;
  collectionSize: number;
}

const CardWebGLRender = (cardRender: CardWebGLRender) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText, flavourAuthor, cardID } = cardRender;
  const { backFace, keywords, collectionNumber, collectionSize } = cardRender;

  const [scene, setScene] = useState(new THREE.Scene());
  const [renderer, setRenderer] = useState();
  const [camera, setCamera] = useState<THREE.PerspectiveCamera>();
  const [requestID, setRequestID] = useState<number>();

  const mount = useRef<HTMLDivElement>(null);

  const sceneSetup = () => {
    if (mount && mount.current) {
      // get container dimensions and use them for scene sizing
      const width = mount.current.clientWidth;
      const height = mount.current.clientHeight;

      const camera = new THREE.PerspectiveCamera(
        75, // fov = field of view
        width / height, // aspect ratio
        0.1, // near plane
        1000 // far plane
      );

      // set some distance from a cube that is located at z = 0
      camera.position.z = 5;
      setCamera(camera);

      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      setRenderer(renderer);
      mount.current.appendChild(renderer.domElement); // mount using React ref
    }
  };

  const addObjectsToScene = () => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);

    setScene(scene);
  };

  const startAnimationLoop = () => {
    if (camera) {
      renderer.render(scene, camera);
    }
    setRequestID(window.requestAnimationFrame(startAnimationLoop));
  };

  useEffect(() => {
    sceneSetup();
    addObjectsToScene();
    startAnimationLoop();
  }, []);

  useEffect(() => {
    function handleResize() {
      if (mount && mount.current && camera) {
        const width = mount.current.clientWidth;
        const height = mount.current.clientHeight;

        renderer.setSize(width, height);
        setRenderer(renderer);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        setCamera(camera);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestID) {
        window.cancelAnimationFrame(requestID);
      }
    };
  }, []);

  const resizeFactor = (width: number) => {
    return width / 530.0;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * 740;
  };

  return (
    <ReactResizeDetector handleWidth>
      {({ width }: { width: number }) => (
        <div style={{ height: `${getHeight(width)}px` }}>
          <div
            id={`card-id-${cardID}`}
            style={{
              transform: `scale(${resizeFactor(width)})`,
              transformOrigin: 'top left'
            }}
            ref={mount}
          />
        </div>
      )}
    </ReactResizeDetector>
  );
};

export default CardWebGLRender;
