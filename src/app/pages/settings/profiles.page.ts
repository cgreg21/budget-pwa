import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DialogService } from '../../ui/dialog.service';
import { UI_ICONS } from '../../ui/icons';
import { MAX_PROFILE_NAME_LENGTH, type Profile } from '../../data/profiles';
import { ProfileService } from '../../data/profile.service';
import { SettingsService } from '../../preferences/settings.service';

/** Create, rename, delete and switch between the profiles. */
@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [RouterLink, FormsModule],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './profiles.page.html',
})
export class ProfilesPage {
  readonly p = inject(ProfileService);
  readonly s = inject(SettingsService);
  private readonly dialogs = inject(DialogService);
  readonly ui = UI_ICONS;
  readonly maxLength = MAX_PROFILE_NAME_LENGTH;
  readonly newName = signal('');

  label(profile: Profile): string {
    return profile.name || this.s.t().profiles.defaultName;
  }

  add(): void {
    if (this.p.add(this.newName()) !== null) this.newName.set('');
  }

  rename(profile: Profile, name: string): void {
    if (name.trim() === '' && profile.name === '') return;
    this.p.rename(profile.id, name);
  }

  async use(profile: Profile): Promise<void> {
    const t = this.s.t();
    const ok = await this.dialogs.confirm({
      title: t.profiles.use, message: t.profiles.switchBody(this.label(profile)), ok: t.profiles.use, cancel: t.common.cancel,
    });
    if (ok) this.p.switchTo(profile.id);
  }

  async remove(profile: Profile): Promise<void> {
    const t = this.s.t();
    const ok = await this.dialogs.confirm({
      title: t.common.delete, message: t.profiles.deleteBody(this.label(profile)), ok: t.common.delete, cancel: t.common.cancel,
    });
    if (ok) await this.p.remove(profile.id);
  }
}
