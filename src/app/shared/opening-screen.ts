import type { ApplicationRef } from '@angular/core';
import { catchError, filter, firstValueFrom, of, take, timeout } from 'rxjs';

/** The HTML shell paints before JavaScript; release it once the first view settles. */
export async function finishOpeningScreen(app: ApplicationRef): Promise<void> {
  const screen = document.getElementById('opening-screen');
  if (!screen) return;
  const settled = firstValueFrom(app.isStable.pipe(
    filter(Boolean), take(1), timeout({ first: 4000 }), catchError(() => of(true))
  ));
  // A slow image/API/font must never lock users behind a full-screen overlay.
  let deadline: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all([settled, document.fonts.load('italic 96px OpeningSerif').catch(() => [])]),
    new Promise<void>(resolve => { deadline = setTimeout(resolve, 4000); })
  ]);
  clearTimeout(deadline);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    screen.classList.add('is-leaving');
    screen.setAttribute('aria-hidden', 'true');
    const root = document.querySelector('app-root');
    root?.removeAttribute('inert');
    root?.removeAttribute('aria-busy');
    document.body.classList.remove('cinetex-starting');
    const remove = () => screen.remove();
    screen.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550);
  }));
}

export function showOpeningError(): void {
  const screen = document.getElementById('opening-screen');
  if (!screen) return;
  screen.dataset['state'] = 'error';
  screen.setAttribute('role', 'alert');
  screen.setAttribute('aria-label', 'Cinetex could not start');
  const message = document.getElementById('opening-message');
  if (message) message.textContent = 'Unable to open Cinetex. Please try again.';
}
