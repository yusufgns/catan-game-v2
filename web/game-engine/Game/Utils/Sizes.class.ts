import EventEmitter from './EventEmitter.class';

export default class Sizes extends EventEmitter {
  width: number;
  height: number;
  pixelRatio: number;
  resizeTimeout: ReturnType<typeof setTimeout> | null;
  _resizeHandler: () => void;

  constructor() {
    super();

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.resizeTimeout = null;

    this._resizeHandler = () => this.handleResizeDebounced();
    window.addEventListener('resize', this._resizeHandler);
  }

  dispose(): void {
    window.removeEventListener('resize', this._resizeHandler);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
  }

  handleResizeDebounced(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.handleResize();
    }, 300);
  }

  handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.trigger('resize');
  }
}
