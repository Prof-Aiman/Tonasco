import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Jig, JigService } from '../../core/services/jig.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  partNumber = '';
  submittedPart = signal('');
  jigs = signal<Jig[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(
    private readonly router: Router,
    private readonly jigService: JigService
  ) {}

  search(): void {
    const value = this.partNumber.trim();
    if (!value) return;

    this.submittedPart.set(value);
    this.loading.set(true);
    this.error.set('');
    this.jigs.set([]);

    this.jigService.findByPartNumber(value).subscribe({
      next: (jigs) => {
        this.jigs.set(jigs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Unable to search jig inventory.');
        this.loading.set(false);
      }
    });
  }

  addInventory(): void {
    this.router.navigate(['/add-inventory']);
  }
}
