import { getWindow, saveWindow } from "@/server/mock-backend";
import { clientIdOf, handle, json, parseWindow } from "@/server/http";

export async function GET(request: Request) {
  return handle(() => json(getWindow(clientIdOf(request))));
}

export async function PUT(request: Request) {
  return handle(async () => {
    const clientId = clientIdOf(request);
    const window = parseWindow(await request.json());
    return json(saveWindow(clientId, window));
  });
}
