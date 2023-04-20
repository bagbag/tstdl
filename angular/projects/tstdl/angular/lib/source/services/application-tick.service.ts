import { ApplicationRef, Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApplicationTickService {
  private readonly applicationRef = inject(ApplicationRef);

  private scheduled = false;

  schedule(): void {
    if (!this.scheduled) {
      requestAnimationFrame(() => {
        this.scheduled = false;
        this.applicationRef.tick();
      });

      this.scheduled = true;
    }
  }
}
