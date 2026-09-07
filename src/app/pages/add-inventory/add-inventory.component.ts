import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JigService } from '../../core/services/jig.service';

@Component({
  selector: 'app-add-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './add-inventory.component.html',
  styleUrl: './add-inventory.component.css'
})
export class AddInventoryComponent {
  saving = false;
  message = '';
  error = '';

  form = {
    partNumber: '',
    registerId: '',
    machine: '',
    binNumber: '',
    status: 'Available',
    borrower: '',
    dateBorrow: '',
    dateReturn: ''
  };

  constructor(
    private readonly jigService: JigService,
    private readonly router: Router
  ) {}

  save(): void {
    this.message = '';
    this.error = '';

    if (!this.form.partNumber.trim() || !this.form.registerId.trim()) {
      this.error = 'Part Number and Register ID are required.';
      return;
    }

    this.saving = true;

    this.jigService.addJig(this.form).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Jig added successfully to Google Sheets.';
        setTimeout(() => this.router.navigate(['/']), 900);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Unable to add jig.';
      }
    });
  }
}
