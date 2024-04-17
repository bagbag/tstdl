import { Directive, HostListener, input, output } from '@angular/core';
import { isDefined, isNull, isString } from '@tstdl/base/utils';
import { objectEntries } from '@tstdl/base/utils/object';

@Directive({
  selector: '[tslDrag]',
  standalone: true,
  exportAs: 'drag'
})
export class DragDirective {
  readonly clearData = input<boolean>(false);
  readonly allowedEffect = input<DataTransfer['effectAllowed']>('uninitialized');
  readonly image = input<Element>();
  readonly imageCoordinates = input<[x: number, y: number]>();
  readonly format = input<string>();
  readonly data = input<string | Record<string, string>>();

  readonly start = output<DragEvent>();
  readonly dragging = output<boolean>();
  readonly drag = output<DragEvent>();
  readonly end = output<DragEvent>();

  @HostListener('drag', ['$event'])
  onDrag(event: DragEvent): void {
    this.drag.emit(event);
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    this.start.emit(event);
    this.dragging.emit(true);

    if (isNull(event.dataTransfer)) {
      return;
    }

    event.dataTransfer.effectAllowed = this.allowedEffect();

    const image = this.image();

    if (isDefined(image)) {
      const [x = 0, y = 0] = this.imageCoordinates() ?? [];
      event.dataTransfer.setDragImage(image, x, y);
    }

    const format = this.format();
    const data = this.data();

    if (this.clearData()) {
      event.dataTransfer.clearData();
    }

    if (isString(data)) {
      event.dataTransfer.setData(format ?? 'text/plain', data);
    }
    else if (isDefined(data)) {
      const entries = objectEntries(data);

      for (const [key, value] of entries) {
        event.dataTransfer.setData(key, value);
      }
    }
  }

  @HostListener('dragend', ['$event'])
  onDragEnd(event: DragEvent): void {
    this.end.emit(event);
    this.dragging.emit(false);
  }
}
