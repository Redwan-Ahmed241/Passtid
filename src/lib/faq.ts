export const faq = [
  {
    q: "Do I need an account?",
    a: "Yes. Only signed-in users can see slots and queue counts. One account covers both services: passports and ID cards, and migration (coordination numbers).",
  },
  {
    q: "What is a booking window?",
    a: "A list of date ranges, each with its own optional times of day. The bot only books slots inside it. Both dates of a range count, and either can be left open: a start date alone means that date onwards, an end date alone means from now until then. The start of each time range is bookable and the end is not, so 09:00–12:00 takes 11:45 but never 12:00.",
  },
  {
    q: "What details do I have to give?",
    a: "For every person: a first name, a last name, and either a personal (security) number for passports and ID cards or a phone number for migration. A personal number and a phone number are different things. One contact email covers the whole submission.",
  },
  {
    q: "What does “3 queued” mean?",
    a: "Three people have confirmed a booking request for that exact slot, or already hold it. The number rises the moment someone confirms, not when the booking succeeds, and drops back when an attempt fails, is cancelled or stalls for 15 minutes.",
  },
  {
    q: "Can I see who else is queued?",
    a: "No. Other users only ever see a number. Names, personal identity numbers and contact details are never shown.",
  },
  {
    q: "Does a busy slot stop me from booking it?",
    a: "No. The queue count is information, not a lock. The bot still goes for the slot you picked, or the earliest matching one if you didn't pick. It just lets you choose a quieter time.",
  },
  {
    q: "Which clock are the times in?",
    a: "Always the embassy's local time in London, on both the passport and the migration service, whatever timezone you or the server are in.",
  },
  {
    q: "How far ahead does it look?",
    a: "Up to 12 weeks for passports and national ID cards, and 8 weeks for migration. The console tells you the exact last date it checked.",
  },
  {
    q: "What happens if there is nothing inside my window?",
    a: "Nothing is booked. You get a clear message, and the slots outside your window stay visible on the calendar, so you can decide whether to widen it or switch on emergency mode to take the first slot that appears.",
  },
] as const;
