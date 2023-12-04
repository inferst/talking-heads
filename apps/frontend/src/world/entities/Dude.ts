import * as PIXI from 'pixi.js';
import { DudeMessageBox } from './DudeMessageBox';
import { renderer } from '../../main';
import { DudeSpriteContainer } from './DudeSpriteContainer';
import { DudeEmoteSpitter } from './DudeEmoteSpitter';
import { Constants } from '../../config/constants';
import {
  DudeSpriteLayers,
  DudeSpriteTags,
  spriteProvider,
} from '../../sprite/spriteProvider';
import { DudeName } from './DudeName';

type Collider = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class Dude {
  private spriteName: string = 'dude';

  private currentScale: number = 4;

  private direction: number = 1;

  private collider: Collider = {
    x: 9,
    y: 8,
    width: 14,
    height: 16,
  };

  private spriteSize: number = 32;

  private animationState?: DudeSpriteTags;

  private sprite?: DudeSpriteContainer;

  private name: DudeName;

  private twitchColor: string = '#969696';
  private userColor?: string;

  private message: DudeMessageBox = new DudeMessageBox();

  public view: PIXI.Container = new PIXI.Container();

  private velocity: PIXI.IPointData = {
    x: 0,
    y: 0,
  };

  private gravity: number = 400;

  private landAnimationTime?: number;
  private maxLandAnimationTime: number = 200;

  private runIdleAnimationTime?: number;
  private maxRunIdleAnimdationTime?: number;

  private maxLifeTime: number = 1000 * 60 * 69;
  private currentLifeTime: number = this.maxLifeTime;

  private maxOpacityTime: number = 5000;
  private currentOpacityTime: number = this.maxOpacityTime;

  public shouldBeDeleted: boolean = false;

  private emoteSpitter: DudeEmoteSpitter = new DudeEmoteSpitter();

  private get color() {
    return this.userColor ?? this.twitchColor;
  }

  private get isJumping() {
    return (
      this.animationState == DudeSpriteTags.Fall ||
      this.animationState == DudeSpriteTags.Jump
    );
  }

  constructor(name: string, sprite?: string) {
    this.spriteName = sprite ?? this.spriteName;

    const width = renderer.width;

    this.view.y =
      -(this.collider.y + this.collider.height - this.spriteSize / 2) *
      this.currentScale;
    this.view.x =
      Math.random() * (width - this.spriteSize * this.currentScale) +
      (this.spriteSize / 2) * this.currentScale;

    this.direction = Math.random() > 0.5 ? 1 : -1;

    this.name = new DudeName(name);
    this.name.view.position.y =
      -(this.spriteSize / 2 - this.collider.y) * this.currentScale;

    this.view.sortableChildren = true;
    this.emoteSpitter.view.zIndex = 1;
    this.message.view.zIndex = 3;
    this.message.view.position.y =
      this.name.view.position.y - this.name.view.height;

    this.view.addChild(this.name.view);
    this.view.addChild(this.emoteSpitter.view);
    this.view.addChild(this.message.view);

    this.playAnimation(DudeSpriteTags.Idle);

    this.runIdleAnimationTime = performance.now();
    this.maxRunIdleAnimdationTime = Math.random() * 5000;
  }

  jump() {
    if (!this.isJumping) {
      this.velocity.x = this.direction * 100;
      this.velocity.y = -300;

      this.playAnimation(DudeSpriteTags.Jump);
    }
  }

  tint(twitchColor: string, userColor?: string) {
    this.twitchColor = twitchColor;

    if (userColor) {
      this.userColor = userColor;
    }

    this.sprite?.tint(this.color);
  }

  update() {
    const now = performance.now();

    if (
      this.landAnimationTime &&
      now - this.landAnimationTime > this.maxLandAnimationTime
    ) {
      this.playAnimation(DudeSpriteTags.Idle);
      this.landAnimationTime = undefined;
    }

    if (
      this.runIdleAnimationTime &&
      this.maxRunIdleAnimdationTime &&
      now - this.runIdleAnimationTime > this.maxRunIdleAnimdationTime &&
      (this.animationState == DudeSpriteTags.Run ||
        this.animationState == DudeSpriteTags.Idle)
    ) {
      if (this.animationState == DudeSpriteTags.Idle) {
        this.playAnimation(DudeSpriteTags.Run);
      } else {
        this.playAnimation(DudeSpriteTags.Idle);
      }

      this.runIdleAnimationTime = now;
      this.maxRunIdleAnimdationTime = Math.random() * 5000;
    }

    this.velocity.y =
      this.velocity.y + (this.gravity * Constants.fixedDeltaTime) / 1000;

    const newPosition = {
      x:
        this.view.position.x +
        (this.velocity.x * Constants.fixedDeltaTime) / 1000,
      y:
        this.view.position.y +
        (this.velocity.y * Constants.fixedDeltaTime) / 1000,
    };

    if (
      newPosition.y +
        (this.collider.y + this.collider.height - this.spriteSize / 2) *
          this.currentScale >
      renderer.height
    ) {
      this.velocity.y = 0;
      this.velocity.x = 0;

      newPosition.y =
        renderer.height -
        (this.collider.y + this.collider.height - this.spriteSize / 2) *
          this.currentScale;

      if (this.animationState == DudeSpriteTags.Fall) {
        this.playAnimation(DudeSpriteTags.Land);
        this.landAnimationTime = now;
      }
    }

    this.view.position.set(newPosition.x, newPosition.y);

    if (this.velocity.y > 0) {
      this.playAnimation(DudeSpriteTags.Fall);
    }

    const width = renderer.width;

    if (this.animationState != DudeSpriteTags.Idle) {
      this.view.position.x +=
        (1 * this.direction * Constants.fixedDeltaTime * 60) / 1000;

      if (
        this.view.x + (this.collider.width / 2) * this.currentScale >= width ||
        this.view.x - (this.collider.width / 2) * this.currentScale <= 0
      ) {
        this.direction = -this.direction;
        this.velocity.x = -this.velocity.x;
        this.sprite?.view.scale.set(
          this.direction * this.currentScale,
          this.currentScale
        );
      }
    }

    if (this.currentLifeTime > 0) {
      this.currentLifeTime -= Constants.fixedDeltaTime;
    } else {
      if (this.currentOpacityTime > 0) {
        this.currentOpacityTime -= Constants.fixedDeltaTime;
        this.view.alpha = this.currentOpacityTime / this.maxOpacityTime;
      } else {
        this.shouldBeDeleted = true;
      }
    }

    this.sprite?.update((Constants.fixedDeltaTime / 1000) * 60);
    this.emoteSpitter.update();

    this.emoteSpitter.view.position.y =
      this.message.view.position.y - this.message.view.height;

    this.message.update();
  }

  addMessage(message: string) {
    this.message.add(message);

    this.currentLifeTime = this.maxLifeTime;
    this.currentOpacityTime = this.maxOpacityTime;
    this.view.alpha = 1;
  }

  spitEmotes(emotes: string[]) {
    for (const emote of emotes) {
      this.emoteSpitter.add(emote);
    }
  }

  async playAnimation(state: DudeSpriteTags) {
    if (this.animationState == state) {
      return;
    }

    this.animationState = state;

    if (this.sprite) {
      this.view.removeChild(this.sprite.view);
    }

    const dudeSprite = spriteProvider.getSprite(this.spriteName, state);
    this.sprite = new DudeSpriteContainer({
      body: dudeSprite[DudeSpriteLayers.Body],
      eyes: dudeSprite[DudeSpriteLayers.Eyes],
    });
    this.sprite.view.scale.set(
      this.direction * this.currentScale,
      this.currentScale
    );
    this.sprite.tint(this.color);

    this.view.addChild(this.sprite.view);
  }
}
