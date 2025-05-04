import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EventListenerService {
  private handlers = new Map<EventTarget, Map<string, EventListenerOrEventListenerObject>>();

  public registerHandler(target: EventTarget, eventName: string, callback: EventListenerOrEventListenerObject): void {
    target.addEventListener(eventName, callback);

    if (!this.handlers.has(target)) {
      this.handlers.set(target, new Map());
    }

    this.handlers.get(target)!.set(eventName, callback);
  }

  public unregisterHandlers(target: EventTarget): void {
    const targetHandlers = this.handlers.get(target);
    if (!targetHandlers) return;

    targetHandlers.forEach((callback, eventName) => {
      target.removeEventListener(eventName, callback);
    });

    this.handlers.delete(target);
  }

  public unregisterAll(): void {
    this.handlers.forEach((events, target) => {
      events.forEach((callback, eventName) => {
        target.removeEventListener(eventName, callback);
      });
    });
    this.handlers.clear();
  }
}

