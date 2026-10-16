import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import dependencies from '../../pwa/dependencies.json';
import { APP_VERSION } from '../../pwa/app-info';
import { SettingsService } from '../../preferences/settings.service';
import { UI_ICONS } from '../../ui/icons';

/** The libraries and assets the app is built with, with their version and license. */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './about.page.html',
})
export class AboutPage {
  readonly s = inject(SettingsService);
  readonly ui = UI_ICONS;
  readonly version = APP_VERSION;
  readonly libraries = dependencies.dependencies;
  readonly assets = dependencies.assets;
}
