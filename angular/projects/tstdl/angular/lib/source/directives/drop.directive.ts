import { Directive, HostListener, input, output, signal } from '@angular/core';
import { isDefined, isNotNull, isNull } from '@tstdl/base/utils';

@Directive({
  selector: '[tslDrop]',
  standalone: true,
  exportAs: 'drop'
})
export class DropDirective {
  readonly #entered = signal(false);
  readonly #isOver = signal(false);

  readonly effect = input<DataTransfer['dropEffect']>();

  readonly enter = output<DragEvent>();
  readonly leave = output<DragEvent>();
  readonly over = output<DragEvent>();
  readonly dropped = output<DragEvent>();
  readonly itemsDropped = output<DataTransferItem[]>();
  readonly filesDropped = output<File[]>();

  readonly entered = this.#entered.asReadonly();
  readonly isOver = this.#isOver.asReadonly();

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    event.preventDefault();

    const effect = this.effect();

    if (isDefined(effect) && isNotNull(event.dataTransfer)) {
      event.dataTransfer.dropEffect = effect;
    }

    this.enter.emit(event);
    this.#entered.set(true);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();

    this.over.emit(event);
    this.#isOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();

    this.leave.emit(event);
    this.#entered.set(false);
    this.#isOver.set(false);
  }

  // Drop listener
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();

    this.#entered.set(false);
    this.#isOver.set(false);
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
