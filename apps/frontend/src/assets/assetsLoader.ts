import * as PIXI from 'pixi.js';
import { manifest } from './manifest';

interface AsepriteFrameData extends PIXI.ISpritesheetFrameData {
  duration: number;
}

interface AsepriteData extends PIXI.ISpritesheetData {
  frames: PIXI.utils.Dict<AsepriteFrameData>;
  duration: number;
}

export class AssetsLoader {
  private isLoaded: boolean = false;

  public sheets: PIXI.utils.Dict<PIXI.Spritesheet<AsepriteData>> = {};

  async load() {
    if (!this.isLoaded) {
      await PIXI.Assets.init({ manifest });
      this.sheets = await PIXI.Assets.loadBundle('main');
      this.isLoaded = true;
    }
  }
}

export const assetsLoader = new AssetsLoader();
