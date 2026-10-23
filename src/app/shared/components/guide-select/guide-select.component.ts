import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild, inject } from '@angular/core';

export interface GuideOption {
  value: number;
  label: string;
  detail?: string;
  marker?: string;
}

/** Select-only combobox. Arrow keys preview; Enter/Space commits; Escape cancels. */
@Component({
  selector: 'app-guide-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide-select.component.html',
  styleUrls: ['./guide-select.component.css']
})
export class GuideSelectComponent implements OnChanges {
  @Input({ required: true }) inputId = '';
  @Input() label = '';
  @Input() placeholder = 'Choose';
  @Input() options: GuideOption[] = [];
  @Input() value: number | null = null;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<number>();
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private cd = inject(ChangeDetectorRef);
  open = false;
  openAbove = false;
  panelHeight = 300;
  activeIndex = 0;
  private typed = '';
  private typedAt = 0;

  get selected(): GuideOption | undefined { return this.options.find(option => option.value === this.value); }

  ngOnChanges(): void {
    if (this.disabled || !this.options.length) this.open = false;
    this.activeIndex = Math.max(0, Math.min(this.activeIndex, this.options.length - 1));
  }

  toggle(): void {
    if (this.open) this.open = false;
    else this.openMenu();
  }

  private openMenu(): void {
    if (this.disabled || !this.options.length) return;
    const triggerBounds = this.trigger?.nativeElement.getBoundingClientRect();
    if (triggerBounds) {
      const below = window.innerHeight - triggerBounds.bottom - 16;
      const above = this.host.nativeElement.getBoundingClientRect().top - 16;
      this.openAbove = below < 240 && above > below;
      this.panelHeight = Math.min(300, Math.max(96, (this.openAbove ? above : below) - 54));
    }
    this.open = true;
    this.activeIndex = Math.max(0, this.options.findIndex(option => option.value === this.value));
    this.typed = '';
    this.revealActive();
  }

  choose(index: number): void {
    const option = this.options[index];
    if (!option || this.disabled) return;
    this.open = false;
    this.trigger?.nativeElement.focus({ preventScroll: true });
    if (option.value !== this.value) this.valueChange.emit(option.value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (event.key === 'Tab') { this.open = false; return; }
    if (event.key === 'Escape') {
      if (this.open) { event.preventDefault(); event.stopPropagation(); this.open = false; }
      return;
    }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (this.open) this.choose(this.activeIndex); else this.openMenu();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const wasOpen = this.open;
      if (!this.open) this.openMenu();
      if (event.key === 'Home') this.activeIndex = 0;
      else if (event.key === 'End') this.activeIndex = this.options.length - 1;
      else if (wasOpen) this.activeIndex = Math.max(0, Math.min(this.options.length - 1, this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
      this.revealActive();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!this.open) this.openMenu();
      const now = Date.now();
      this.typed = (now - this.typedAt < 700 ? this.typed : '') + event.key.toLowerCase();
      this.typedAt = now;
      const match = this.options.findIndex(option => option.label.toLowerCase().startsWith(this.typed) || String(option.value) === this.typed);
      if (match !== -1) { this.activeIndex = match; this.revealActive(); }
    }
  }

  private revealActive(): void {
    this.cd.detectChanges();
    const option = this.host.nativeElement.querySelector<HTMLElement>(`[data-option-index="${this.activeIndex}"]`);
    const panel = option?.parentElement;
    if (!option || !panel) return;
    if (option.offsetTop < panel.scrollTop) panel.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > panel.scrollTop + panel.clientHeight) panel.scrollTop = option.offsetTop + option.offsetHeight - panel.clientHeight;
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointer(event: PointerEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node)) this.open = false;
  }

  trackOption(_: number, option: GuideOption): number { return option.value; }
}
