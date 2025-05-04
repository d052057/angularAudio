import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http'; 
@Injectable({
  providedIn: 'root'
})
export class TextService {
  http = inject(HttpClient);
  constructor() { }
  getText(folder: string): Observable<any> {
    return this.http.get(decodeURIComponent(folder), { responseType: 'text' })
  }
}
