import './style.css';
import { World } from './world/World';
import { Renderer } from 'pixi.js';

export const renderer = new Renderer({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundAlpha: 0,
});

const init = async () => {
  document.body.appendChild(renderer.view as HTMLCanvasElement);

  window.onresize = () => {
    renderer.resize(window.innerWidth, window.innerHeight);
  };

  const world = new World();
  await world.init();

  let lastTime = performance.now();
  let lastFrame = -1;

  const maxFps = 60;

  const minElapsedMS = 1000 / maxFps;
  const maxElapsedMS = 100;

  // const debug = new Debug(world);

  requestAnimationFrame(animate);
  function animate(currentTime = performance.now()) {
    let elapsedMS = currentTime - lastTime;

    if (elapsedMS > maxElapsedMS) {
      elapsedMS = maxElapsedMS;
    }

    const delta = (currentTime - lastFrame) | 0;

    if (delta > minElapsedMS) {
      lastFrame = currentTime - (delta % minElapsedMS);
      lastTime = currentTime;

      world.update();
      renderer.render(world.stage);
    }

    requestAnimationFrame(animate);
  }
};

init();
