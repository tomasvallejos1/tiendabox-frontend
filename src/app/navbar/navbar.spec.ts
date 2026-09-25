import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Navbar } from './navbar';

describe('Navbar', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
