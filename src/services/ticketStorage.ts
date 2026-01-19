import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZONES } from "../constants/zones";
import type { ParkingTicket } from "../types/parking";
import { addMinutes, computePricePLN } from "../utils/parking";
import { TICKETS_STORAGE_KEY } from "./storageKeys";

export async function loadTickets(): Promise<ParkingTicket[]> {
  try {
    const stored = await AsyncStorage.getItem(TICKETS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ParkingTicket[]) : [];
  } catch (e) {
    console.warn("Nie udalo sie wczytac biletow", e);
    return [];
  }
}

export async function saveTickets(tickets: ParkingTicket[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.warn("Nie udalo sie zapisac biletow", e);
  }
}

export async function addTicket(ticket: ParkingTicket): Promise<ParkingTicket[]> {
  const existing = await loadTickets();
  const updated = [ticket, ...existing];
  await saveTickets(updated);
  return updated;
}

export function extendTicketInList(
  tickets: ParkingTicket[],
  id: string,
  extensionMinutes = 15
):
  | {
      updated: ParkingTicket[];
      updatedTicket: ParkingTicket | null;
      extraCost: number;
    }
  | null {
  const target = tickets.find((t) => t.id === id);
  if (!target) return null;

  const end = new Date(target.endISO);
  const newEnd = addMinutes(end, extensionMinutes);
  const newDuration = (target.durationMin || 0) + extensionMinutes;
  const zoneCfg = ZONES[target.zone] || { ratePerHour: 0 };
  const { price } = computePricePLN(newDuration, zoneCfg.ratePerHour);
  const extraCost = Math.max(0, price - target.amount);

  const updated = tickets.map((t) =>
    t.id === id
      ? {
          ...t,
          endISO: newEnd.toISOString(),
          durationMin: newDuration,
          amount: price,
        }
      : t
  );

  const updatedTicket = updated.find((t) => t.id === id) || null;
  return { updated, updatedTicket, extraCost };
}
