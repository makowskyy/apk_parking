import type { ZoneKey } from "../constants/zones";

export type ParkingTicketStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type ParkingTicket = {
  id: string;
  status: ParkingTicketStatus;
  createdAtISO: string;
  plate: string;
  zone: ZoneKey;
  zoneName?: string;
  startISO: string;
  endISO: string;
  durationMin: number;
  amount: number;
  notifyBeforeEnd: boolean;
};
