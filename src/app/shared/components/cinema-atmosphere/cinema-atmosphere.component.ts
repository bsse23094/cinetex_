import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, NgZone, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { WebGLRenderer, Group, Mesh, Material, BufferGeometry, Texture, PerspectiveCamera, Scene, WebGLRenderTarget } from 'three';
import { nearestReelPhase, reelPose } from './reel-motion';
import { Movie } from '../../../core/models/movie.model';
import { loadReelArtwork, reelArtworkUrls } from './reel-artwork';

@Component({
  selector: 'app-cinema-atmosphere',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reel-fallback" [class.is-rendered]="ready" aria-hidden="true">
      <img *ngFor="let film of fallbackFilms; let i = index" [src]="poster(film)" crossorigin="anonymous" (error)="fallbackImageError($event, film)" alt="" [style.--card]="i">
    </div>
    <div class="reel-canvas" [class.is-ready]="ready" #surface aria-hidden="true"></div>
  `,
  styles: [`
    :host{display:block;position:relative;width:100%;height:100%;touch-action:pan-y;cursor:grab}
    :host:active{cursor:grabbing}.reel-canvas{position:absolute;inset:0;opacity:0;transition:opacity 1s}.reel-canvas.is-ready{opacity:1}
    .reel-fallback{position:absolute;inset:10% 8% 15%;display:flex;align-items:center;justify-content:center;perspective:1000px;transition:opacity .7s}
    .reel-fallback.is-rendered{opacity:0;pointer-events:none}.reel-fallback img{position:absolute;width:38%;aspect-ratio:2/3;object-fit:cover;border:7px solid #c0c0b8;box-shadow:0 30px 50px #0009;transform:translateX(calc((var(--card) - 1) * 70%)) rotateY(calc((var(--card) - 1) * -24deg)) rotateZ(-6deg) scale(.9)}
    .reel-fallback img:nth-child(2){z-index:2;transform:rotateZ(-6deg)}    @media(prefers-reduced-motion:reduce){.reel-canvas,.reel-fallback{transition:none}}
  `]
})
export class CinemaAtmosphereComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() films: Movie[] = [];
  @Input() selectedIndex = 0;
  @Output() selectFilm = new EventEmitter<number>();
  ready = false;
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private zone = inject(NgZone);
  private cd = inject(ChangeDetectorRef);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private reel?: Group;
  private panels: Group[] = [];
  private metalRings: Mesh[] = [];
  private geometries: BufferGeometry[] = [];
  private materials: Material[] = [];
  private textures: Texture[] = [];
  private pictureMaterials: Material[] = [];
  private panelGeneration = 0;
  private environment?: WebGLRenderTarget;
  private resizeObserver?: ResizeObserver;
  private observer?: IntersectionObserver;
  private frame = 0;
  private destroyed = false;
  private visible = true;
  private motion?: MediaQueryList;
  private signature = '';
  private buildPanels?: () => void;
  private renderFrame?: (time: number) => void;
  private pointer = { x: 0, y: 0 };
  private dragStart?: number;
  private dragPhase = 0;
  private targetPhase = 0;
  private currentPhase = 0;
  private pointerId?: number;
  private lastPointerX = 0;
  private lastPointerTime = 0;
  private velocity = 0;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private scrollProgress = 0;

  get fallbackFilms(): Movie[] {
    if (!this.films.length) return [];
    const current = this.selectedIndex;
    return [-1, 0, 1].map(offset => this.films[(current + offset + this.films.length) % this.films.length]);
  }
  poster(film: Movie): string {
    return reelArtworkUrls(film)[0] || 'assets/no-poster.svg';
  }
  fallbackImageError(event: Event, film: Movie): void {
    const image = event.target as HTMLImageElement;
    const urls = reelArtworkUrls(film);
    const current = urls.indexOf(image.src);
    const next = current >= 0 ? urls[current + 1] : undefined;
    if (!image.src.endsWith('/assets/no-poster.svg')) image.src = next || 'assets/no-poster.svg';
  }
  private titleCard(film: Movie): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 750;
    const context = canvas.getContext('2d')!;
    const wash = context.createLinearGradient(0, 0, 500, 750);
    wash.addColorStop(0, '#36402a');
    wash.addColorStop(1, '#10150e');
    context.fillStyle = wash;
    context.fillRect(0, 0, 500, 750);
    context.strokeStyle = '#b9ca7760';
    context.strokeRect(26, 26, 448, 698);
    context.fillStyle = '#d9f76c';
    context.font = 'italic 38px Georgia';
    context.fillText('cinetex.', 50, 94);
    context.fillStyle = '#eff1e5';
    context.font = '38px Georgia';
    const lines: string[] = [];
    let line = '';
    for (const word of (film.title || film.name || 'Feature film').split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (line && context.measureText(candidate).width > 400) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(0, 7).forEach((text, index) => context.fillText(text, 50, 350 + index * 48, 400));
    return canvas;
  }
  ngOnChanges(changes: SimpleChanges): void {
    const signature = this.films.map(film => film.id + ':' + film.poster_path + ':' + film.backdrop_path).join('|');
    const filmsChanged = signature !== this.signature;
    if (filmsChanged) { this.signature = signature; this.buildPanels?.(); }
    if (this.dragStart === undefined && (filmsChanged || changes['selectedIndex'])) this.targetPhase = nearestReelPhase(this.selectedIndex, this.targetPhase, this.films.length);
    if (this.motion?.matches) this.renderFrame?.(0);
  }
  ngAfterViewInit(): void {
    if (!this.browser) return;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.zone.runOutsideAngular(() => { void this.initialize(); });
  }

  private onMove = (event: PointerEvent) => {
    const rect = this.element.nativeElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    this.pointer.y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    if (this.dragStart !== undefined && event.pointerId === this.pointerId) {
      const stride = Math.max(120, rect.width * .28);
      const elapsed = Math.max(8, event.timeStamp - this.lastPointerTime);
      this.velocity = (this.lastPointerX - event.clientX) / stride / elapsed;
      this.targetPhase = this.dragPhase + (this.dragStart - event.clientX) / stride;
      this.lastPointerX = event.clientX;
      this.lastPointerTime = event.timeStamp;
      if (this.motion?.matches) this.renderFrame?.(0);
    }
  };
  private onLeave = () => { if (this.dragStart === undefined) this.pointer = { x: 0, y: 0 }; };
  private onDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || this.films.length < 2) return;
    clearTimeout(this.settleTimer);
    this.dragStart = this.lastPointerX = event.clientX;
    this.lastPointerTime = event.timeStamp;
    this.dragPhase = this.targetPhase;
    this.velocity = 0;
    this.pointerId = event.pointerId;
    this.element.nativeElement.setPointerCapture(event.pointerId);
  };
  private onUp = (event: PointerEvent) => {
    if (this.dragStart === undefined || event.pointerId !== this.pointerId) return;
    const momentum = event.timeStamp - this.lastPointerTime < 100 ? Math.max(-.65, Math.min(.65, this.velocity * 140)) : 0;
    this.finishDrag();
    this.settle(momentum);
  };
  private finishDrag(): void {
    if (this.pointerId !== undefined && this.element.nativeElement.hasPointerCapture(this.pointerId)) this.element.nativeElement.releasePointerCapture(this.pointerId);
    this.dragStart = undefined;
    this.pointerId = undefined;
    this.pointer = { x: 0, y: 0 };
  }
  private onCancel = () => { this.finishDrag(); this.settle(); };
  private onWheel = (event: WheelEvent) => {
    // Horizontal trackpad gestures move posters; normal vertical scrolling remains native.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) && !event.shiftKey) return;
    if (this.films.length < 2 || this.dragStart !== undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const pixels = (event.shiftKey ? event.deltaY || event.deltaX : event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.element.nativeElement.clientWidth : 1);
    this.targetPhase += pixels / Math.max(200, this.element.nativeElement.clientWidth * .45);
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.settle(), 140);
    if (this.motion?.matches) this.renderFrame?.(0);
  };
  private settle(momentum = 0): void {
    this.targetPhase = Math.round(this.targetPhase + momentum);
    const count = this.films.length;
    if (!count) return;
    const selected = ((this.targetPhase % count) + count) % count;
    if (selected !== this.selectedIndex) this.zone.run(() => this.selectFilm.emit(selected));
    if (this.motion?.matches) this.renderFrame?.(0);
  }
  private onScroll = () => {
    const rect = this.element.nativeElement.getBoundingClientRect();
    this.scrollProgress = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height, 1)));
  };
  private onVisibility = () => this.schedule();
  private schedule(): void {
    cancelAnimationFrame(this.frame);
    if (this.destroyed || !this.visible || document.hidden || !this.renderFrame) return;
    if (this.motion?.matches) this.renderFrame(0);
    else this.frame = requestAnimationFrame(this.renderFrame);
  }

  private async initialize(): Promise<void> {
    try {
      const T = await import('./three-runtime');
      if (this.destroyed) return;
      const host = this.element.nativeElement;
      const surface = host.querySelector<HTMLElement>('.reel-canvas')!;
      this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(pointer: coarse)').matches ? 1.25 : 1.6));
      this.renderer.setClearColor(0x080908, 0);
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      surface.appendChild(this.renderer.domElement);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(35, 1, .1, 60);
      this.camera.position.set(0, .15, 12.5);
      const environmentGenerator = new T.PMREMGenerator(this.renderer);
      const room = new T.RoomEnvironment();
      this.environment = environmentGenerator.fromScene(room, .04);
      this.scene.environment = this.environment.texture;
      room.dispose();
      environmentGenerator.dispose();
      this.scene.add(new T.HemisphereLight(0xffffff, 0x242719, 2));
      const key = new T.DirectionalLight(0xf5ffe0, 4);
      key.position.set(4, 5, 5);
      this.scene.add(key);
      this.reel = new T.Group();
      this.reel.rotation.z = -.09;
      this.scene.add(this.reel);
      const metal = new T.MeshStandardMaterial({ color: 0xbabdb2, metalness: 1, roughness: .21 });
      const dark = new T.MeshBasicMaterial({ color: 0x0a0b09 });
      this.materials.push(metal, dark);

      // A physical film carrier: metallic stock, perforations, and textured frames.
      const frameGeometry = new T.BoxGeometry(2.68, 4.04, .065);
      const posterGeometry = new T.PlaneGeometry(2.40, 3.62, 1, 1);
      const holeGeometry = new T.PlaneGeometry(.065, .11);
      this.geometries.push(frameGeometry, posterGeometry, holeGeometry);
      const loader = new T.TextureLoader();
      this.buildPanels = () => {
        const generation = ++this.panelGeneration;
        this.panels.forEach(panel => this.reel!.remove(panel));
        this.panels = [];
        this.pictureMaterials.forEach(material => material.dispose());
        this.pictureMaterials = [];
        this.textures.forEach(texture => texture.dispose());
        this.textures = [];
        this.films.forEach((film, index) => {
          const panel = new T.Group();
          panel.add(new T.Mesh(frameGeometry, metal));
          const placeholder = new T.CanvasTexture(this.titleCard(film));
          placeholder.colorSpace = T.SRGBColorSpace;
          this.textures.push(placeholder);
          const pictureMaterial = new T.MeshBasicMaterial({ map: placeholder, toneMapped: false });
          this.pictureMaterials.push(pictureMaterial);
          const picture = new T.Mesh(posterGeometry, pictureMaterial);
          picture.position.z = .04;
          panel.add(picture);
          for (let side of [-1, 1]) for (let hole = 0; hole < 20; hole++) {
            const perforation = new T.Mesh(holeGeometry, dark);
            perforation.position.set(side * 1.285, -1.83 + hole * .192, .041);
            panel.add(perforation);
          }
          const pose = reelPose(index, this.currentPhase, this.films.length);
          panel.position.set(pose.x, 0, pose.z);
          panel.rotation.y = pose.turn;
          this.reel!.add(panel);
          this.panels.push(panel);
          const isCurrent = () => !this.destroyed && generation === this.panelGeneration;
          void loadReelArtwork<Texture>(reelArtworkUrls(film), loader, isCurrent).then(texture => {
            if (!isCurrent()) { texture?.dispose(); return; }
            if (!texture) {
              if (!this.ready) this.zone.run(() => { this.ready = true; this.cd.markForCheck(); });
              if (this.motion?.matches) this.renderFrame?.(0);
              return;
            }
            texture.colorSpace = T.SRGBColorSpace;
            texture.anisotropy = Math.min(4, this.renderer!.capabilities.getMaxAnisotropy());
            const image = texture.image as HTMLImageElement;
            const imageRatio = image.naturalWidth / image.naturalHeight;
            const frameRatio = 2.40 / 3.62;
            if (imageRatio > frameRatio) {
              texture.repeat.x = frameRatio / imageRatio;
              texture.offset.x = (1 - texture.repeat.x) / 2;
            } else if (imageRatio > 0) {
              texture.repeat.y = imageRatio / frameRatio;
              texture.offset.y = (1 - texture.repeat.y) / 2;
            }
            pictureMaterial.color.set(0xffffff);
            pictureMaterial.map = texture;
            pictureMaterial.needsUpdate = true;
            this.textures.push(texture);
            if (!this.ready) this.zone.run(() => { this.ready = true; this.cd.markForCheck(); });
            if (this.motion?.matches) this.renderFrame?.(0);
          });
        });
      };
      this.buildPanels();

      // Thin elliptical tracks connect the frames into one sculptural film reel.
      const ringGeometry = new T.TorusGeometry(3.8, .025, 8, 140);
      this.geometries.push(ringGeometry);
      for (let i = 0; i < 2; i++) {
        const ring = new T.Mesh(ringGeometry, metal);
        ring.rotation.set(.8 + i * .14, .22, -.35);
        ring.position.set(0, -.1, -1.8 - i * .15);
        this.reel.add(ring);
        this.metalRings.push(ring);
      }

      const resize = () => {
        if (!this.renderer || !this.camera) return;
        const { width, height } = host.getBoundingClientRect();
        this.renderer.setSize(width, height);
        this.camera.aspect = width / Math.max(1, height);
        this.camera.position.z = width / Math.max(1, height) < 1 ? 15 : 12.5;
        this.camera.updateProjectionMatrix();
      };
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(host);
      resize();
      let last = 0;
      this.renderFrame = time => {
        if (this.destroyed || !this.renderer || !this.scene || !this.camera || !this.reel) return;
        const reduced = !!this.motion?.matches;
        {
          const elapsed = Math.min(.05, Math.max(.001, (time - last) / 1000 || 1 / 60));
          last = time;
          const ease = reduced ? 1 : 1 - Math.exp(-8 * elapsed);
          this.currentPhase += (this.targetPhase - this.currentPhase) * ease;
          this.panels.forEach((panel, index) => {
            const pose = reelPose(index, this.currentPhase, this.panels.length);
            panel.position.x = pose.x;
            panel.position.z = pose.z;
            panel.rotation.y = pose.turn;
            panel.rotation.z = -pose.turn * .055;
            panel.position.y = reduced ? 0 : Math.sin(time * .0006 + index * .9) * .06;
          });
          const tiltEase = reduced ? 1 : 1 - Math.exp(-4 * elapsed);
          this.reel.rotation.y += ((reduced ? 0 : this.pointer.x * .12) - this.reel.rotation.y) * tiltEase;
          this.reel.rotation.x += ((reduced ? 0 : this.pointer.y * .06 + this.scrollProgress * .18) - this.reel.rotation.x) * tiltEase;
          this.reel.rotation.z = -.09 + (reduced ? 0 : Math.sin(time * .00018) * .015 + this.scrollProgress * .08);
          this.renderer.render(this.scene, this.camera);
        }
        if (!reduced && this.visible && !document.hidden) this.frame = requestAnimationFrame(this.renderFrame!);
      };
      this.observer = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; this.schedule(); });
      this.observer.observe(host);
      host.addEventListener('pointermove', this.onMove, { passive: true });
      host.addEventListener('pointerleave', this.onLeave);
      host.addEventListener('pointerdown', this.onDown);
      host.addEventListener('pointerup', this.onUp);
      host.addEventListener('pointercancel', this.onCancel);
      host.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);
      this.motion?.addEventListener('change', this.onVisibility);
      this.schedule();
    } catch {
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.panelGeneration++;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.settleTimer);
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    const host = this.element.nativeElement;
    host.removeEventListener('pointermove', this.onMove);
    host.removeEventListener('pointerleave', this.onLeave);
    host.removeEventListener('pointerdown', this.onDown);
    host.removeEventListener('pointerup', this.onUp);
    host.removeEventListener('pointercancel', this.onCancel);
    host.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.motion?.removeEventListener('change', this.onVisibility);
    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    this.pictureMaterials.forEach(material => material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
  ngOnDestroy(): void { this.destroyed = true; if (this.browser) this.cleanup(); }
}
