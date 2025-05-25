import { Component, ElementRef, output, signal, viewChild, effect, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Subject, switchMap, takeUntil, map, from } from 'rxjs';
import { NgFor, NgIf } from '@angular/common';
import { AudioItem, AudioService } from '../services/audio.service';
import { TimeConversionPipe } from '../pipes/time-conversion.pipe';
import { EventListenerService } from '../services/event-handler.service';
import { fadeInOut } from '../services/animations';
@Component({
  selector: 'app-audio-player',
  imports: [NgFor, NgIf, TimeConversionPipe],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss',
  animations: [fadeInOut]
})
export class AudioPlayerComponent {
  service = inject(AudioService);
  eventListenerService = inject(EventListenerService);
  audioList = signal<AudioItem[]>([]);
  // In your component class
  isShuffle = signal(false); // Initialize shuffle state to false

  // Add this method to your component
  toggleShuffle(): void {
    let shuffleState = this.isShuffle();
    shuffleState = !shuffleState;
    this.isShuffle.set(shuffleState);
    // If enabling shuffle, generate the shuffled indices
    if (this.isShuffle()) {
      this.generateShuffleIndices();
    } else {
      // If disabling shuffle, clear the shuffle history
      this.playHistory = [this.currentTrackIndex()];
    }
  }
  // Input properties

  autoPlay = signal(true);


  // Output properties
  audioTimeUpdate = output<number>();
  audioTimeUpdateChange = output<number>();
  audioVolume = signal<number>(50); // Default volume 50%
  audioVolumeChange = output<number>();
  playEvent = output<void>();
  pauseEvent = output<void>();
  muteEvent = output<void>();
  repeatEvent = output<void>();
  trackEndEvent = output<void>();
  trackChangeEvent = output<AudioItem>();
  autoPlayChange = output<boolean>();

  // Signal-based state
  isAudioLoaded = signal(false);
  isAudioPlaying = signal(false);
  isAudioAutoPlay = signal(false);
  isRepeat = signal(false);
  isMute = signal(false);
  currentTrackIndex = signal(0);
  currentAudio = signal<AudioItem | null>(null);
  totalAudioLength = signal(0);
  currentAudioTime = signal(0);

  // ViewChild reference
  readonly audioPlayer = viewChild.required<ElementRef<HTMLAudioElement>>('AngAudioPlayer');
  audio!: any;
  /*private readonly audioContext = new AudioContext();*/
  // Shuffle-related properties
  private shuffledIndices: number[] = []; // Added missing property
  private playHistory: number[] = []; // Added missing property

  // Cleanup subject
  private destroy$ = new Subject<void>();

  private readonly trackListContainer = viewChild.required<ElementRef>('trackListContainer');

  ngOnInit(): void {
    this.initializeAudio();
    this.audio = this.audioPlayer().nativeElement;
    this.service.getAudio()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((audioList: AudioItem[]) => {
          const durationPromises = audioList.map(async (item: AudioItem) => {
            item.duration = await this.getAudioDuration(item.url);
            return item;
          });
          return from(Promise.all(durationPromises));
        })
      )
      .subscribe((data: AudioItem[]) => {
        this.audioList.set(data);
        this.currentTrackIndex.set(0);
        this.currentAudio.set(data[this.currentTrackIndex()]);
        this.audio.src = data[this.currentTrackIndex()].url;
        this.isAudioLoaded.set(false);
      });
  }
  constructor() {

  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.audioPlayer()) {
      /* const audio = this.audioPlayer().nativeElement;*/
      this.eventListenerService.unregisterAll();
    }
  }
  scrollToCurrentTrack() {
    const container = this.trackListContainer().nativeElement;
    const selectedTrack = container.children[this.currentTrackIndex()];
    if (selectedTrack) {
      selectedTrack.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  private initializeAudio(): void {
    const audioList = this.audioList();
    if (audioList?.length) {
      this.currentAudio.set(audioList[0]);
      if (this.isShuffle()) {
        this.generateShuffleIndices();
      }
    }

    setTimeout(() => {
      if (this.audioPlayer()) {
        //const audio = this.audioPlayer().nativeElement;
        this.audio.volume = this.audioVolume() / 100;
        this.isAudioAutoPlay.set(this.autoPlay());

        this.eventListenerService.registerHandler(this.audio, 'playing', this.handlePlaying);
        this.eventListenerService.registerHandler(this.audio, 'pause', this.handlePause);
        this.eventListenerService.registerHandler(this.audio, 'loadeddata', this.handleLoadedData);
        this.eventListenerService.registerHandler(this.audio, 'timeupdate', this.handleTimeUpdate);
        this.eventListenerService.registerHandler(this.audio, 'ended', this.handleEnded);
        this.eventListenerService.registerHandler(this.audio, 'volumechange', this.handleVolumeChange);

        if (this.autoPlay()) {
          this.attemptAutoplay();
        }
      }
    }, 0);
  }

  // Event handlers
  private handlePlaying = (): void => {
    this.isAudioPlaying.set(true);
    this.playEvent.emit();
  };

  private handlePause = (): void => {
    this.isAudioPlaying.set(false);
    this.pauseEvent.emit();
  };

  private handleLoadedData = (): void => {
    this.isAudioLoaded.set(true);
    const duration = Math.floor(this.audioPlayer().nativeElement.duration);
    this.totalAudioLength.set(duration);
  };

  private handleEnded = (): void => {
    this.trackEndEvent.emit();
    if (this.isRepeat()) {
      this.audioPlayer().nativeElement.currentTime = 0;
      this.audioVolume.set(this.audioPlayer().nativeElement.currentTime)
      this.play();
      return;
    } else {
      this.playNext();
    }
  };
  private handleTimeUpdate = (): void => {
    const currentTime = Math.floor(this.audioPlayer().nativeElement.currentTime);
    this.currentAudioTime.set(currentTime);
    this.audioTimeUpdateChange.emit(currentTime);
  };

  private handleVolumeChange = (): void => {
    const volume = Math.floor(this.audioPlayer().nativeElement.volume * 100);
    this.audioVolumeChange.emit(volume);

  };

  // Public API methods
  play(): void {
    if (this.audioPlayer()) {
      this.handleLoadedData();
      this.scrollToCurrentTrack();
      this.audioPlayer().nativeElement.play()
        .catch(error => console.error('Error playing audio:', error));
    }
  }

  pause(): void {
    if (this.audioPlayer()) {
      this.audioPlayer().nativeElement.pause();
    }

  }

  togglePlay(): void {
    this.isAudioPlaying() ? this.pause() : this.play();
  }

  toggleMute(): void {
    if (this.audioPlayer()) {
      this.muteEvent.emit();
      this.isMute.set(!this.isMute());
      this.audioPlayer().nativeElement.muted = this.isMute();
    }
  }

  toggleRepeat(): void {
    if (this.audioPlayer()) {
      this.audio.loop = !this.audio.loop;
      this.isRepeat.set(this.audio.loop);
      this.repeatEvent.emit();
    }
  }

  toggleAutoPlay(): void {
    const newAutoPlayState = !this.isAudioAutoPlay();
    this.isAudioAutoPlay.set(newAutoPlayState);
    this.autoPlayChange.emit(newAutoPlayState);

    if (newAutoPlayState && this.isAudioLoaded() && !this.isAudioPlaying()) {
      this.attemptAutoplay();
    }
  }

  seek(time: Event): void {
    if (this.audioPlayer()) {
      const input = time.target as HTMLInputElement;
      const timeNumber = parseFloat(input.value)
      this.audioPlayer().nativeElement.currentTime = timeNumber;
      this.currentAudioTime.set(this.audioPlayer().nativeElement.currentTime);
    }
  }

  setVolume(volume: Event): void {
    if (this.audioPlayer()) {
      const input = volume.target as HTMLInputElement;
      const volumeNumber = parseFloat(input.value);
      this.audioPlayer().nativeElement.volume = volumeNumber / 100;
      this.audioVolume.set(this.audioPlayer().nativeElement.volume)
    }
  }
  playNext(): void {
    const audioList = this.audioList();
    if (!audioList?.length) return;

    const nextIndex = this.getNextTrackIndex();
    this.currentTrackIndex.set(nextIndex);
    this.audioPlayer().nativeElement.currentTime = 0;
    this.currentAudioTime.set(this.audioPlayer().nativeElement.currentTime);
    this.currentAudio.set(audioList[this.currentTrackIndex()]);
    this.audio.src = audioList[this.currentTrackIndex()].url; 
    if (this.audio.muted) {
      this.audio.muted = !this.audio.muted;
      this.isMute.set(this.audio.muted);
    }
    setTimeout(() => {
      if (this.isAudioAutoPlay()) {
        this.play();
      }
    }, 50);
  }

  playPrevious(): void {
    const audioList = this.audioList();
    if (!audioList?.length) return;

    const prevIndex = this.getPreviousTrackIndex();
    this.currentTrackIndex.set(prevIndex);
    this.audioPlayer().nativeElement.currentTime = 0;
    this.currentAudioTime.set(this.audioPlayer().nativeElement.currentTime);
    this.currentAudio.set(audioList[this.currentTrackIndex()]);
    this.audio.src = audioList[this.currentTrackIndex()].url; 
    setTimeout(() => this.play(), 50);
  }

  playTrack(index: number): void {
    const audioList = this.audioList();
    if (!audioList?.length || index < 0 || index >= audioList.length) return;

    this.currentTrackIndex.set(index);
    this.currentAudio.set(audioList[this.currentTrackIndex()]);
    this.audio.src = audioList[this.currentTrackIndex()].url;
    setTimeout(() => this.play(), 50);
  }

  private attemptAutoplay(): void {
    if (!this.audioPlayer()) return;

    const audio = this.audioPlayer().nativeElement;

    audio.play()
      .then(() => {
        this.playEvent.emit();
      })
      .catch(error => {
        console.warn('Autoplay with sound was prevented:', error);

        if (!audio.muted) {
          audio.muted = true;
          this.isMute.set(true);

          audio.play()
            .then(() => {
              console.info('Autoplay succeeded with muted audio');
              this.playEvent.emit();
            })
            .catch(mutedError => {
              console.error('Even muted autoplay was prevented:', mutedError);
            });
        }
      });
  }

  private generateShuffleIndices(): void {
    const audioList = this.audioList();
    if (!audioList?.length) return;

    this.shuffledIndices = Array.from({ length: audioList.length }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] =
        [this.shuffledIndices[j], this.shuffledIndices[i]];
    }

    // Remove current track from shuffle if it exists
    const currentIndex = this.currentTrackIndex();
    const shuffleIndex = this.shuffledIndices.indexOf(currentIndex);
    if (shuffleIndex > -1) {
      this.shuffledIndices.splice(shuffleIndex, 1);
    }
  }

  private getNextTrackIndex(): number {
    const audioList = this.audioList();
    if (!audioList?.length) return 0;

    if (this.isShuffle()) {
      if (this.shuffledIndices.length === 0) {
        this.generateShuffleIndices();

        this.playHistory.forEach(historyIndex => {
          const indexToRemove = this.shuffledIndices.indexOf(historyIndex);
          if (indexToRemove > -1) {
            this.shuffledIndices.splice(indexToRemove, 1);
          }
        });

        if (this.shuffledIndices.length === 0) {
          this.playHistory = [];
          this.generateShuffleIndices();
        }
      }

      const nextShuffleIndex = this.shuffledIndices.shift() || 0;
      this.playHistory.push(nextShuffleIndex);

      if (this.playHistory.length > audioList.length) {
        this.playHistory.shift();
      }

      return nextShuffleIndex;
    } else {
      let nextIndex = this.currentTrackIndex() + 1;
      return nextIndex >= audioList.length ? 0 : nextIndex;
    }
  }

  private getPreviousTrackIndex(): number {
    const audioList = this.audioList();
    if (!audioList?.length) return 0;

    if (this.isShuffle()) {
      if (this.playHistory.length > 1) {
        this.playHistory.pop();
        return this.playHistory[this.playHistory.length - 1];
      }
      return this.currentTrackIndex();
    } else {
      let prevIndex = this.currentTrackIndex() - 1;
      return prevIndex < 0 ? audioList.length - 1 : prevIndex;
    }
  }

  playRandom(): void {
    const audioList = this.audioList();
    if (!audioList?.length) return;

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * audioList.length);
    } while (randomIndex === this.currentTrackIndex() && audioList.length > 1);

    this.currentTrackIndex.set(randomIndex);

    if (this.isShuffle()) {
      this.playHistory.push(randomIndex);
      const shuffleIndex = this.shuffledIndices.indexOf(randomIndex);
      if (shuffleIndex > -1) {
        this.shuffledIndices.splice(shuffleIndex, 1);
      }
    }

    setTimeout(() => this.play(), 50);
  }

  resetShuffle(): void {
    if (!this.isShuffle()) return;

    this.playHistory = [this.currentTrackIndex()];
    this.generateShuffleIndices();

    const currentIndex = this.currentTrackIndex();
    const shuffleIndex = this.shuffledIndices.indexOf(currentIndex);
    if (shuffleIndex > -1) {
      this.shuffledIndices.splice(shuffleIndex, 1);
    }
  }

  getRemainingShuffleTracks(): number {
    return this.shuffledIndices.length;
  }
  readonly audioListState = computed(() => {
    const list = this.audioList();
    return !list || list.length === 0;
  });

  private getAudioDuration(src: string): Promise<number> {
    const audioTmp = new Audio();

    return new Promise(resolve => {
      const onMetadata = () => {
        resolve(Math.floor(audioTmp.duration));
      };

      this.eventListenerService.registerHandler(audioTmp, 'loadedmetadata', onMetadata);
      audioTmp.src = src;
    });
  }

  getVideoDuration(src: string, obj: any) {
    return new Promise(function (resolve) {
      var video = document.createElement('video');
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        var event = new CustomEvent("myVideoDurationEvent", {
          detail: {
            duration: video.duration,
          }
        });
        obj['duration'] = Math.floor(video.duration);
      })
      video.src = src;
    }
    );
  }
}
