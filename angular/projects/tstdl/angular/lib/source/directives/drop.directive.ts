import { Directive, HostListener, output } from '@angular/core';
import { isNull } from '@tstdl/base/utils';

@Directive({
  selector: '[tslDrop]',
  standalone: true
})
export class DropDirective {
  readonly enter = output<DragEvent>();
  readonly leave = output<DragEvent>();
  readonly dropped = output<DragEvent>();
  readonly itemsDropped = output<DataTransferItem[]>();
  readonly filesDropped = output<File[]>();

  readonly entered = output<boolean>();
  readonly over = output<boolean>();

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    event.preventDefault();

    this.enter.emit(event);
    this.entered.emit(true);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();

    this.over.emit(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();

    this.leave.emit(event);
    this.entered.emit(false);
    this.over.emit(false);
  }

  // Drop listener
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();

    this.entered.emit(false);
    this.over.emit(false);
    this.dropped.emit(event);

    if (isNull(event.dataTransfer)) {
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      this.filesDropped.emit(Array.from(event.dataTransfer.files));
    }

    if (event.dataTransfer.items.length > 0) {
      this.itemsDropped.emit(Array.from(event.dataTransfer.items));
    }
  }
}
