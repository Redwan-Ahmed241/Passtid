import { emptyPerson } from "./applicants";
import { addDays } from "./time";
import type { BookingRequest } from "./types";

/** A fresh request: one empty person, the given email, and the next two weeks at any time of day. */
export function defaultRequest(today: string, email: string): BookingRequest {
  return {
    persons: [emptyPerson()],
    email,
    window: {
      emergency: false,
      ranges: [{ id: "r1", from: today, to: addDays(today, 13), times: [] }],
    },
  };
}
