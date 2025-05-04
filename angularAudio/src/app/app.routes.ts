import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'audio',
    loadComponent: () => import('./audio-player/audio-player.component')
      .then(mod => mod.AudioPlayerComponent)
  },
  {
    path: 'text/:file',
    loadComponent: () => import('./textviewer/textviewer.component')
      .then(mod => mod.TextviewerComponent)
  }
];
