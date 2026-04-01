import type { ToastType } from '../../types/engine.types';

export default class ToastManager {
  toastContainer: HTMLDivElement | null;
  activeToasts: HTMLDivElement[];

  constructor() {
    this.toastContainer = null;
    this.activeToasts = [];
    this.init();
  }

  init(): void {
    this.createToastContainer();
  }

  createToastContainer(): void {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 10000;
      pointer-events: none;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const target = document.getElementById('catan-game') || document.body;
    target.appendChild(this.toastContainer);
  }

  getBaseToastStyles(): string {
    return `
      background: linear-gradient(145deg, #f5f0ec, #ede8e4);
      color: rgba(0, 0, 0, 0.9);
      padding: 14px 18px;
      border-radius: 14px;
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      display: flex;
      align-items: center;
      gap: 14px;
      transform: translateX(-120%) scale(0.9);
      transition: all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: 0;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      max-width: 280px;
      min-width: 200px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(8px);
    `;
  }

  getIconContainerStyles(gradient: string): string {
    return `
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: ${gradient};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    `;
  }

  getIconStyles(): string {
    return `
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.95);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    `;
  }

  getLabelStyles(): string {
    return `
      font-size: 0.7rem;
      color: rgba(0, 0, 0, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 3px;
    `;
  }

  getTitleStyles(): string {
    return `
      font-size: 0.88rem;
      color: rgba(0, 0, 0, 0.85);
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
  }

  showMusicToast(trackName: string): HTMLDivElement {
    this.clearMusicToasts();

    const toast = document.createElement('div') as HTMLDivElement;
    toast.className = 'music-toast';
    toast.style.cssText = this.getBaseToastStyles();

    const iconGradient = 'linear-gradient(145deg, #8b5cf6, #7c3aed)';

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);

    const icon = document.createElement('i');
    icon.className = 'fas fa-music';
    icon.style.cssText = this.getIconStyles();
    iconContainer.appendChild(icon);

    const textContent = document.createElement('div');
    textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;

    const label = document.createElement('div');
    label.textContent = 'Now Playing';
    label.style.cssText = this.getLabelStyles();

    const title = document.createElement('div');
    title.textContent = trackName;
    title.style.cssText = this.getTitleStyles();

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #8b5cf6, #7c3aed);
      width: 0%;
      transition: width 4s linear;
      border-radius: 0 0 0 14px;
    `;

    textContent.appendChild(label);
    textContent.appendChild(title);
    toast.appendChild(iconContainer);
    toast.appendChild(textContent);
    toast.appendChild(progressBar);

    this.insertToast(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0) scale(1)';
        toast.style.opacity = '1';

        setTimeout(() => {
          progressBar.style.width = '100%';
        }, 100);
      });
    });

    setTimeout(() => {
      this.hideToast(toast);
    }, 4000);

    return toast;
  }

  showDayNightToast(timeOfDay: string): HTMLDivElement {
    const toast = document.createElement('div') as HTMLDivElement;
    toast.className = 'daynight-toast';

    let icon: string, iconGradient: string, displayName: string;
    if (timeOfDay === 'day') {
      icon = 'fas fa-sun';
      iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
      displayName = 'Daytime';
    } else {
      icon = 'fas fa-moon';
      iconGradient = 'linear-gradient(145deg, #818cf8, #6366f1)';
      displayName = 'Nighttime';
    }

    toast.style.cssText = this.getBaseToastStyles();

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);

    const iconElement = document.createElement('i');
    iconElement.className = icon;
    iconElement.style.cssText = this.getIconStyles();
    iconContainer.appendChild(iconElement);

    const textContent = document.createElement('div');
    textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;

    const label = document.createElement('div');
    label.textContent = 'Time Changed';
    label.style.cssText = this.getLabelStyles();

    const title = document.createElement('div');
    title.textContent = displayName;
    title.style.cssText = this.getTitleStyles();

    textContent.appendChild(label);
    textContent.appendChild(title);
    toast.appendChild(iconContainer);
    toast.appendChild(textContent);

    this.insertToast(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0) scale(1)';
        toast.style.opacity = '1';
      });
    });

    setTimeout(() => {
      this.hideToast(toast);
    }, 3000);

    return toast;
  }

  showSeasonToast(season: string): HTMLDivElement {
    const toast = document.createElement('div') as HTMLDivElement;
    toast.className = 'season-toast';

    let icon: string, iconGradient: string, displayName: string;
    switch (season) {
      case 'spring':
        icon = 'fas fa-seedling';
        iconGradient = 'linear-gradient(145deg, #34d399, #10b981)';
        displayName = 'Blooming Spring';
        break;
      case 'summer':
        icon = 'fas fa-sun';
        iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
        displayName = 'Sunny Summer';
        break;
      case 'autumn':
      case 'fall':
        icon = 'fa-brands fa-canadian-maple-leaf';
        iconGradient = 'linear-gradient(145deg, #fb923c, #f97316)';
        displayName = 'Cozy Autumn';
        break;
      case 'winter':
        icon = 'fas fa-snowflake';
        iconGradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
        displayName = 'Frosty Winter';
        break;
      default:
        icon = 'fas fa-cloud-rain';
        iconGradient = 'linear-gradient(145deg, #9ca3af, #6b7280)';
        displayName = 'Thundering Rain';
    }

    toast.style.cssText = this.getBaseToastStyles();

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);

    const iconElement = document.createElement('i');
    iconElement.className = icon;
    iconElement.style.cssText = this.getIconStyles();
    iconContainer.appendChild(iconElement);

    const textContent = document.createElement('div');
    textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;

    const label = document.createElement('div');
    label.textContent = 'Season Changed';
    label.style.cssText = this.getLabelStyles();

    const title = document.createElement('div');
    title.textContent = displayName;
    title.style.cssText = this.getTitleStyles();

    textContent.appendChild(label);
    textContent.appendChild(title);
    toast.appendChild(iconContainer);
    toast.appendChild(textContent);

    this.insertToast(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0) scale(1)';
        toast.style.opacity = '1';
      });
    });

    setTimeout(() => {
      this.hideToast(toast);
    }, 3000);

    return toast;
  }

  showToast(message: string, type: ToastType = 'info', duration: number = 3000): HTMLDivElement {
    const toast = document.createElement('div') as HTMLDivElement;
    toast.className = `toast toast-${type}`;

    let iconGradient: string, icon: string;
    const isMusicDisabled = message === 'Music disabled';

    if (isMusicDisabled) {
      iconGradient = 'linear-gradient(145deg, #374151, #1f2937)';
      icon = 'fas fa-volume-mute';
    } else {
      switch (type) {
        case 'success':
          iconGradient = 'linear-gradient(145deg, #34d399, #10b981)';
          icon = 'fas fa-check';
          break;
        case 'error':
          iconGradient = 'linear-gradient(145deg, #f87171, #ef4444)';
          icon = 'fas fa-exclamation';
          break;
        case 'warning':
          iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
          icon = 'fas fa-exclamation-triangle';
          break;
        default:
          iconGradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
          icon = 'fas fa-info';
      }
    }

    toast.style.cssText = this.getBaseToastStyles();

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);

    const iconElement = document.createElement('i');
    iconElement.className = icon;
    iconElement.style.cssText = this.getIconStyles();
    iconContainer.appendChild(iconElement);

    const textContent = document.createElement('div');
    textContent.textContent = message;
    textContent.style.cssText = `
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.8);
      font-weight: 500;
      flex: 1;
    `;

    toast.appendChild(iconContainer);
    toast.appendChild(textContent);

    this.insertToast(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0) scale(1)';
        toast.style.opacity = '1';
      });
    });

    setTimeout(() => {
      this.hideToast(toast);
    }, duration);

    return toast;
  }

  insertToast(toast: HTMLDivElement): void {
    const existingToasts = Array.from(this.toastContainer!.children) as HTMLDivElement[];
    let insertAfter: HTMLDivElement | null = null;

    for (let i = existingToasts.length - 1; i >= 0; i--) {
      const existingToast = existingToasts[i];
      if (
        existingToast.className === 'season-toast' ||
        existingToast.className === 'daynight-toast'
      ) {
        insertAfter = existingToast;
        break;
      }
    }

    if (insertAfter) {
      this.toastContainer!.insertBefore(toast, insertAfter.nextSibling);
    } else {
      this.toastContainer!.appendChild(toast);
    }

    this.activeToasts.push(toast);
    toast.offsetHeight; // force reflow
  }

  hideToast(toast: HTMLDivElement): void {
    if (!toast || !toast.parentNode) return;

    toast.style.transform = 'translateX(-120%) scale(0.9)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToasts = this.activeToasts.filter((t) => t !== toast);
    }, 450);
  }

  clearMusicToasts(): void {
    const musicToasts = this.activeToasts.filter(
      (toast) => toast.className === 'music-toast'
    );
    musicToasts.forEach((toast) => this.hideToast(toast));
  }

  clearDayNightToasts(): void {
    const dayNightToasts = this.activeToasts.filter(
      (toast) => toast.className === 'daynight-toast'
    );
    dayNightToasts.forEach((toast) => this.hideToast(toast));
  }

  clearSeasonToasts(): void {
    const seasonToasts = this.activeToasts.filter(
      (toast) => toast.className === 'season-toast'
    );
    seasonToasts.forEach((toast) => this.hideToast(toast));
  }

  destroy(): void {
    if (this.toastContainer && this.toastContainer.parentNode) {
      this.toastContainer.parentNode.removeChild(this.toastContainer);
    }
    this.activeToasts = [];
  }
}
