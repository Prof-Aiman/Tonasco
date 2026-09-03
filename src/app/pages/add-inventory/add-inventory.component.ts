import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './add-inventory.component.html',
  styleUrl: './add-inventory.component.css'
})
export class AddInventoryComponent {
  form = {
    partNumber: '',
    jigNumber: '',
    jigName: '',
    location: '',
    quantity: 1,
    status: 'Available'
  };

  save(): void {
    console.log('Inventory payload:', this.form);
    // TODO: connect JigService.addJig(this.form) when backend endpoint is ready.
  }
}
