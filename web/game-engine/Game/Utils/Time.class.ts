import EventEmitter from './EventEmitter.class';

export default class Time extends EventEmitter {
  start: number;
  current: number;
  elapsedTime: number;
  delta: number;
  _stopped: boolean;

  constructor() {
    super();

    this.start = performance.now();
    this.current = this.start;
    this.elapsedTime = 0;
    this.delta = 0;
    this._stopped = false;

    window.requestAnimationFrame(() => {
      this.animate();
    });
  }

  animate(): void {
    if (this._stopped) return;

    const currentTime = performance.now();
    this.delta = Math.min((currentTime - this.current) / 1000, 0.1);
    this.current = currentTime;
    this.elapsedTime = (this.current - this.start) / 1000;

    this.trigger('animate');

    window.requestAnimationFrame(() => {
      this.animate();
    });
  }

  stop(): void {
    this._stopped = true;
  }
}
