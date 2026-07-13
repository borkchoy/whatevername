import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { SnipApiService } from './snip-api.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: SnipApiService,
          useValue: {
            getLinks: () => of([]),
            createLink: () => of({
              code: 'ABC123',
              url: 'https://example.com',
              shortUrl: 'http://localhost:3000/ABC123',
              hits: 0,
              createdAt: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
