import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { SnipApiService, SnipLink } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly api = inject(SnipApiService);

  readonly backendOrigin = 'http://localhost:3000';
  readonly urlInput = signal('');
  readonly links = signal<SnipLink[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly loadError = signal('');
  readonly submitError = signal('');
  readonly createdLink = signal<SnipLink | null>(null);

  readonly canSubmit = computed(
    () => this.urlInput().trim().length > 0 && this.validateUrl(this.urlInput()) === null && !this.submitting()
  );

  constructor() {
    this.loadLinks();
  }

  onUrlInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.urlInput.set(target.value);
    this.submitError.set('');
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    const url = this.urlInput().trim();
    const validationError = this.validateUrl(url);
    if (validationError) {
      this.submitError.set(validationError);
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.createdLink.set(null);

    this.api.createLink(url).subscribe({
      next: (link) => {
        this.createdLink.set(link);
        this.links.update((items) => [link, ...items]);
        this.urlInput.set('');
        this.submitting.set(false);
      },
      error: (error: unknown) => {
        this.submitError.set(this.toErrorMessage(error, 'Could not shorten URL.'));
        this.submitting.set(false);
      },
    });
  }

  reloadLinks(): void {
    this.loadLinks();
  }

  private loadLinks(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.api.getLinks().subscribe({
      next: (links) => {
        this.links.set(links);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(this.toErrorMessage(error, 'Could not load links.'));
        this.loading.set(false);
      },
    });
  }

  private validateUrl(value: string): string | null {
    if (!value) {
      return 'Please paste a URL.';
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'Only http:// or https:// URLs are allowed.';
      }
      return null;
    } catch {
      return 'Please enter a valid URL.';
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as { error?: unknown } | null;
      if (apiError && typeof apiError.error === 'string') {
        return apiError.error;
      }
      return fallback;
    }

    return fallback;
  }
}
