import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Jig {
  id?: number;
  partNumber: string;
  jigNumber?: string;
  jigName?: string;
  location?: string;
  quantity?: number;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class JigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/jigs`;

  findByPartNumber(partNumber: string): Observable<Jig[]> {
    return this.http.get<Jig[]>(`${this.baseUrl}?partNumber=${encodeURIComponent(partNumber)}`);
  }

  addJig(payload: Jig): Observable<Jig> {
    return this.http.post<Jig>(this.baseUrl, payload);
  }
}
