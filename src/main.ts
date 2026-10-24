// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { finishOpeningScreen, showOpeningError } from './app/shared/opening-screen';

bootstrapApplication(AppComponent, appConfig)
  .then(app => { void finishOpeningScreen(app); })
  .catch((err) => { console.error(err); showOpeningError(); });
