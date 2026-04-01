import SnowSystem from './SnowSystem.class';
import { getGameContext } from '../../../GameContext';
import SeasonManager from '../../Managers/SeasonManager/SeasonManager.class';

export default class SnowFall {
  [key: string]: any;
  constructor() {
    this.game = getGameContext();
    this.seasonManager = SeasonManager.getInstance();

    const snowBounds = {
      yMin: 15.0,
      yMax: 20.0,
      xRange: 40.0,
      zRange: 30.0,
      originX: 0.0,
      originZ: 0.0,
    };

    this.snowSystem = new SnowSystem(snowBounds);

    this.seasonManager.onChange((newSeason, oldSeason) => {
      this.onSeasonChanged(newSeason, oldSeason);
    });

    this.updateVisibility();
  }

  onSeasonChanged(newSeason, oldSeason) {
    this.updateVisibility();
  }

  updateVisibility() {
    const isWinterSeason = this.seasonManager.currentSeason === 'winter';
    this.snowSystem.setVisible(isWinterSeason);
  }

  update(delta, elapsedTime) {
    this.snowSystem.update(delta, elapsedTime);
  }
}
