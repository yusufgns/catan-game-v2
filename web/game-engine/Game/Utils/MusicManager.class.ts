import * as THREE from 'three';
import EventEmitter from './EventEmitter.class';

interface MusicTrack {
  id: string;
  name: string;
}

interface AudioManager extends EventEmitter {
  sounds: Record<string, THREE.Audio>;
  currentMusic: THREE.Audio | null;
  musicVolume: number;
  masterVolume: number;
  stopMusic(fadeOut?: boolean, fadeDuration?: number): void;
  fadeVolume(audio: THREE.Audio, targetVolume: number, duration: number, onComplete?: (() => void) | null): void;
  forceStopAllMusic?(): void;
}

export default class MusicManager extends EventEmitter {
  private audioManager: AudioManager;
  private musicTracks: MusicTrack[];
  private currentTrackIndex: number;
  private isPlaying: boolean;
  private isPaused: boolean;
  private fadeInDuration: number;
  private fadeOutDuration: number;
  private pausedTrackId: string | null;
  private _onTrackEnded: (() => void) | null;
  private _currentAudioSource: AudioBufferSourceNode | null;

  constructor(audioManager: AudioManager) {
    super();

    this.audioManager = audioManager;
    this.musicTracks = [
      { id: 'morningPetalsMusic', name: 'Morning Petals' },
      { id: 'windowLightMusic', name: 'Window Light' },
      { id: 'forestDreamsMusic', name: 'Forest Dreams' },
    ];

    this.currentTrackIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.fadeInDuration = 2000;
    this.fadeOutDuration = 1000;
    this.pausedTrackId = null;
    this._onTrackEnded = null;
    this._currentAudioSource = null;

    this.init();
  }

  init(): void {}

  startRandomMusic(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.playNextRandomTrack();
  }

  pauseMusic(): void {
    if (!this.isPlaying) return;

    this.isPaused = true;
    this.isPlaying = false;

    if (
      this.audioManager.currentMusic &&
      this.audioManager.currentMusic.isPlaying
    ) {
      this.pausedTrackId = this.getCurrentTrack()?.id ?? null;
      this.audioManager.stopMusic(true, this.fadeOutDuration);
    }

    this.removeEndedListener();
  }

  resumeMusic(): void {
    if (!this.isPaused) {
      this.startRandomMusic();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;

    if (this.pausedTrackId && this.currentTrackIndex >= 0) {
      const track = this.musicTracks[this.currentTrackIndex];
      if (track && track.id === this.pausedTrackId) {
        this.playTrackWithoutLoop(track);
        this.attachEndedListener(track.id);
        return;
      }
    }

    this.playNextRandomTrack();
  }

  stopMusic(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedTrackId = null;
    this.audioManager.stopMusic(true, this.fadeOutDuration);
    this.currentTrackIndex = -1;

    this.removeEndedListener();
  }

  playNextRandomTrack(): void {
    if (!this.isPlaying) return;

    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * this.musicTracks.length);
    } while (
      nextIndex === this.currentTrackIndex &&
      this.musicTracks.length > 1
    );

    this.currentTrackIndex = nextIndex;
    const track = this.musicTracks[this.currentTrackIndex];

    this.playTrackWithoutLoop(track);

    this.trigger('trackChanged', {
      name: track.name,
      id: track.id,
    });

    this.attachEndedListener(track.id);
  }

  playTrackWithoutLoop(track: MusicTrack): void {
    if (
      this.audioManager.currentMusic &&
      this.audioManager.currentMusic.isPlaying
    ) {
      this.audioManager.stopMusic(false);
    }

    const music = this.audioManager.sounds[track.id];
    if (!music) {
      console.warn(`Music ${track.id} not found`);
      return;
    }

    this.audioManager.currentMusic = music;
    music.setLoop(false);

    music.setVolume(0);
    music.play();
    this.audioManager.fadeVolume(
      music,
      this.audioManager.musicVolume * this.audioManager.masterVolume,
      this.fadeInDuration
    );
  }

  private attachEndedListener(trackId: string): void {
    this.removeEndedListener();

    const audio = this.audioManager.sounds[trackId];
    if (!audio) return;

    // THREE.Audio.source is the AudioBufferSourceNode, created on each .play() call
    const source = (audio as unknown as { source: AudioBufferSourceNode | null }).source;
    if (!source) return;

    this._currentAudioSource = source;
    this._onTrackEnded = () => {
      if (!this.isPlaying) return;

      setTimeout(() => {
        if (this.isPlaying) {
          this.playNextRandomTrack();
        }
      }, 1000);
    };

    source.addEventListener('ended', this._onTrackEnded);
  }

  private removeEndedListener(): void {
    if (this._currentAudioSource && this._onTrackEnded) {
      this._currentAudioSource.removeEventListener('ended', this._onTrackEnded);
    }
    this._currentAudioSource = null;
    this._onTrackEnded = null;
  }

  getCurrentTrack(): MusicTrack | null {
    if (this.currentTrackIndex >= 0) {
      return this.musicTracks[this.currentTrackIndex];
    }
    return null;
  }

  addTrack(id: string, name: string): void {
    this.musicTracks.push({ id, name });
  }

  removeTrack(id: string): void {
    this.musicTracks = this.musicTracks.filter((track) => track.id !== id);
  }

  dispose(): void {
    this.removeEndedListener();
    this.stopMusic();
    this.audioManager.forceStopAllMusic?.();
  }
}
