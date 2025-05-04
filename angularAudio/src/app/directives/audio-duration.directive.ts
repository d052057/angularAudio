import { Directive, ElementRef, EventEmitter, Input, Output } from '@angular/core';

@Directive({
  selector: '[appAudioDuration]'
})
export class AudioDurationDirective {

  @Input('audioDuration') src!: string;
  @Output() durationLoaded = new EventEmitter<number>();

  constructor(private el: ElementRef) { }

  ngOnInit() {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(audio.duration);
      this.durationLoaded.emit(duration);
    });
    audio.src = this.src;
  }
}
