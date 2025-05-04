import { Pipe, PipeTransform } from '@angular/core';
import { from, Observable } from 'rxjs';

@Pipe({
  name: 'audioDuration'
})
export class AudioDurationPipe implements PipeTransform {

  transform(src: string): Observable<number> {
    return from(this.getAudioDuration(src));
  }

  private getAudioDuration(src: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.floor(audio.duration));
      });
      audio.src = src;
    });
  }

}
