import { getGameContext } from '../../../GameContext';

export default class Camp {
  [key: string]: any;
  constructor() {
    this.game = getGameContext();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.addCamp();
  }

  addCamp() {
    this.campModel = this.resources.items.campModel.scene;
    this.scene.add(this.campModel);

    this.campModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
}
