import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Jig {
  sheetRow?: number;
  partNumber: string;
  registerId: string;
  machine: string;
  binNumber: string;
  status: string;
  borrower: string;
  dateBorrow: string;
  dateReturn: string;
}

@Injectable({ providedIn: 'root' })
export class JigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/jigs`;

  findByPartNumber(partNumber: string): Observable<Jig[]> {
    return this.http.get<Jig[]>(
      `${this.baseUrl}?partNumber=${encodeURIComponent(partNumber)}`
    );
  }

  addJig(payload: Jig): Observable<Jig> {
    return this.http.post<Jig>(this.baseUrl, payload);
  }

  borrow(registerId: string, borrower: string): Observable<Jig> {
    return this.http.patch<Jig>(
      `${this.baseUrl}/${encodeURIComponent(registerId)}/borrow`,
      { borrower }
    );
  }

  returnJig(registerId: string): Observable<Jig> {
    return this.http.patch<Jig>(
      `${this.baseUrl}/${encodeURIComponent(registerId)}/return`,
      {}
    );
  }
}
