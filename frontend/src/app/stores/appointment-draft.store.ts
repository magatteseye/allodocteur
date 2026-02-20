import { Injectable, signal } from '@angular/core';

export type AppointmentDraft = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  city: string;
  priceCfa: number;
  dateLabel: string;
  time: string;
  isoDateTime: string;
};

@Injectable({ providedIn: 'root' })
export class AppointmentDraftStore {
  draft = signal<AppointmentDraft | null>(null);

  setDraft(d: AppointmentDraft) {
    this.draft.set(d);
  }

  clear() {
    this.draft.set(null);
  }
}
