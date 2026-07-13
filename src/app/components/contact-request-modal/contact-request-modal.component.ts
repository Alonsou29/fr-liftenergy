import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface ContactRequestResult {
  name: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-contact-request-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './contact-request-modal.component.html',
  styleUrls: ['./contact-request-modal.component.css'],
})
export class ContactRequestModalComponent {
  private readonly fb = inject(FormBuilder);

  @Input() productName = '';
  @Input() isSubmitting = false;
  @Output() confirmed = new EventEmitter<ContactRequestResult>();
  @Output() cancelled = new EventEmitter<void>();

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmed.emit(this.form.getRawValue() as ContactRequestResult);
  }

  cancel() {
    this.cancelled.emit();
  }
}
