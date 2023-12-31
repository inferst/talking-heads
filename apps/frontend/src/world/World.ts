import { Container, utils } from 'pixi.js';
import { assetsLoader } from '../assets/assetsLoader';
import { Connection, Message } from '../connection/connection';
import { Dude } from './entities/Dude';
// import { config } from '../config/config';
import tinycolor from 'tinycolor2';

export class World {
  private connection = new Connection();

  public stage: Container = new Container();
  public dudes: utils.Dict<Dude> = {};

  public async init() {
    await assetsLoader.load();

    this.connection.init();
    this.connection.onMessage((data) => this.handleMessage(data));
  }

  public update() {
    for (const id in this.dudes) {
      this.dudes[id].update();

      if (this.dudes[id].shouldBeDeleted) {
        this.deleteDude(id, this.dudes[id]);
      }
    }
  }

  private handleMessage(data: Message) {
    if (!this.dudes[data.userId]) {
      // const chatter = config.chatters[data.name];
      // const sprite = chatter ? chatter.sprite : 'dude';
      const sprite = 'santa';
      const dude = new Dude(data.name, sprite);
      this.addDude(data.userId, dude);
    }

    const dude = this.dudes[data.userId];

    const message = data.message;
    const array = message.split(' ').filter((item) => item != '');
    const command = array[0];
    const value = array[1];

    switch (command) {
      case '!jump':
        dude.jump();
        break;
      case '!color':
        const color = tinycolor(value);

        if (color.isValid()) {
          dude.tint(data.color, value);
        }
        break;
      default:
        if (data.message) {
          dude.addMessage(data.message);
        }
  
        if (data.emotes.length > 0) {
          dude.spitEmotes(data.emotes);
        }
    }

    if (data.color) {
      dude.tint(data.color);
    }
  }

  public addDude(id: string, dude: Dude) {
    this.dudes[id] = dude;
    this.stage.addChild(dude.view);
  }

  public deleteDude(id: string, dude: Dude) {
    delete this.dudes[id];
    this.stage.removeChild(dude.view);
  }
}
