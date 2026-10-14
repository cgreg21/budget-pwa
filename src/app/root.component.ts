import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'budget-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './root.component.html',
})
export class RootComponent {}
