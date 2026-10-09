import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'budget-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class RootComponent {}
