import EventEmitter from '../../../Utils/EventEmitter.class';
import { createSeasonConfigs, SeasonName, SeasonConfig, SeasonConfigs } from '../../../../config/season-configs';

export default class SeasonManager extends EventEmitter {
  private static instance: SeasonManager;
  private _currentSeason!: SeasonName;
  private availableSeasons!: SeasonName[];
  private seasonConfigs!: SeasonConfigs;

  constructor(initialSeason: SeasonName = 'spring') {
    super();

    if (SeasonManager.instance) {
      return SeasonManager.instance;
    }
    SeasonManager.instance = this;

    this._currentSeason = initialSeason;
    this.availableSeasons = ['spring', 'winter', 'autumn', 'rainy'];

    this.seasonConfigs = createSeasonConfigs();
  }

  static getInstance(): SeasonManager {
    if (!SeasonManager.instance) {
      SeasonManager.instance = new SeasonManager('spring');
    }
    return SeasonManager.instance;
  }

  get currentSeason(): SeasonName {
    return this._currentSeason;
  }

  set currentSeason(value: SeasonName) {
    if (!this.availableSeasons.includes(value)) {
      console.warn(
        `Invalid season value: ${value}. Must be one of:`,
        this.availableSeasons
      );
      return;
    }

    const oldValue = this._currentSeason;

    if (oldValue === value) {
      return;
    }

    this._currentSeason = value;
    this.trigger('seasonChanged', value, oldValue);
  }

  toggle(): void {
    const currentIndex = this.availableSeasons.indexOf(this._currentSeason);
    const nextIndex = (currentIndex + 1) % this.availableSeasons.length;
    this.currentSeason = this.availableSeasons[nextIndex];
  }

  setSeason(season: SeasonName): void {
    this.currentSeason = season;
  }

  getSeasonConfig(season: SeasonName = this._currentSeason): SeasonConfig {
    return this.seasonConfigs[season];
  }

  getColorConfig(component: keyof SeasonConfig, timeOfDay?: 'day' | 'night', season: SeasonName = this._currentSeason): unknown {
    const config = this.seasonConfigs[season];
    if (!config || !config[component]) {
      console.warn(
        `No config found for component: ${component} in season: ${season}`
      );
      return null;
    }

    const componentConfig = config[component] as Record<string, unknown>;
    if (timeOfDay && componentConfig[timeOfDay]) {
      return componentConfig[timeOfDay];
    }

    return componentConfig;
  }

  onChange(callback: (...args: unknown[]) => void): this {
    this.on('seasonChanged', callback);
    return this;
  }

  offChange(_callback: (...args: unknown[]) => void): this {
    this.off('seasonChanged');
    return this;
  }

  reset(): void {
    this.currentSeason = 'spring';
  }
}
