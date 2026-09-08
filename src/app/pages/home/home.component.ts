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
  success = signal('');

  modal = signal<'borrow' | 'return' | 'create' | null>(null);
  selectedJig = signal<Jig | null>(null);
  actionLoading = signal(false);
  borrowerName = '';
  createMachine = '';
  createBin = '';
  createStatus = 'Available';
  actionError = '';

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
    this.success.set('');
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

  openBorrow(jig: Jig): void {
    this.selectedJig.set(jig);
    this.borrowerName = '';
    this.actionError = '';
    this.modal.set('borrow');
  }

  openReturn(jig: Jig): void {
    this.selectedJig.set(jig);
    this.actionError = '';
    this.modal.set('return');
  }

  openCreate(jig: Jig): void {
    this.selectedJig.set(jig);
    this.createMachine = jig.machine || '';
    this.createBin = jig.binNumber || '';
    this.createStatus = 'Available';
    this.actionError = '';
    this.modal.set('create');
  }

  closeModal(): void {
    if (this.actionLoading()) return;
    this.modal.set(null);
    this.selectedJig.set(null);
    this.actionError = '';
  }

  submitBorrow(): void {
    const jig = this.selectedJig();
    const borrower = this.borrowerName.trim();

    if (!jig || !borrower) {
      this.actionError = 'Please enter the borrower name.';
      return;
    }

    this.actionLoading.set(true);
    this.actionError = '';

    this.jigService.borrow(jig.registerId, borrower).subscribe({
      next: (updated) => {
        this.replaceJig(updated);
        this.success.set(`${updated.registerId} has been taken by ${updated.borrower}.`);
        this.actionLoading.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.actionError = err?.error?.message || 'Unable to take jig.';
        this.actionLoading.set(false);
      }
    });
  }

  confirmReturn(): void {
    const jig = this.selectedJig();
    if (!jig) return;

    this.actionLoading.set(true);
    this.actionError = '';

    this.jigService.returnJig(jig.registerId).subscribe({
      next: (updated) => {
        this.replaceJig(updated);
        this.success.set(`${updated.registerId} has been returned successfully.`);
        this.actionLoading.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.actionError = err?.error?.message || 'Unable to return jig.';
        this.actionLoading.set(false);
      }
    });
  }

  submitCreate(): void {
    const jig = this.selectedJig();
    if (!jig) return;

    if (!this.createMachine.trim() || !this.createBin.trim() || !this.createStatus) {
      this.actionError = 'Please fill in Machine, Bin and Status.';
      return;
    }

    this.actionLoading.set(true);
    this.actionError = '';

    this.jigService.addJig({
      partNumber: jig.partNumber,
      registerId: jig.registerId,
      machine: this.createMachine.trim(),
      binNumber: this.createBin.trim(),
      status: this.createStatus,
      borrower: '',
      dateBorrow: '',
      dateReturn: ''
    }).subscribe({
      next: (created) => {
        this.replaceJig(created);
        this.success.set(`${created.registerId} has been created in the inventory.`);
        this.actionLoading.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.actionError = err?.error?.message || 'Unable to create jig record.';
        this.actionLoading.set(false);
      }
    });
  }

  private replaceJig(updated: Jig): void {
    this.jigs.update(rows =>
      rows.map(row => row.registerId === updated.registerId ? updated : row)
    );
  }

  statusClass(status: string): string {
    return status.trim().toLowerCase();
  }
}
