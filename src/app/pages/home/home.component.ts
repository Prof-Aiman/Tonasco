import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  partNumber = '';
  submittedPart = signal('');

  constructor(private readonly router: Router) {}

  search(): void {
    const value = this.partNumber.trim();
    if (!value) return;
    this.submittedPart.set(value);
    // TODO: connect JigService when Railway API endpoint is ready.
    console.log('Search part number:', value);
  }

  addInventory(): void {
    this.router.navigate(['/add-inventory']);
  }
}
