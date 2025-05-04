import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, switchMap } from 'rxjs';
export interface AudioItem {
  url: string;
  title?: string;
  duration: number;

}
@Injectable({
  providedIn: 'root'
})
export class AudioService {
  http = inject(HttpClient)
  constructor() { }
  getAudio() {
    return this.http.get<AudioItem[]>('/assets/audio.json');
  }
}
