import { LocationStrategy } from '@angular/common';
import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app/app.routes';
import { ReplaceLocationStrategy } from './app/replace-location-strategy';
import { RootComponent } from './app/root.component';

bootstrapApplication(RootComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    { provide: LocationStrategy, useClass: ReplaceLocationStrategy },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).catch((error: unknown) => console.error(error));
