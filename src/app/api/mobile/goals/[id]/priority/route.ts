import { toggleWeeklyPriorityCore } from "@/lib/core/weeklyPriority";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const result = await toggleWeeklyPriorityCore(auth.userId, id);
  if (result.error) return jsonResponse(result, 400);
  return jsonResponse(result);
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
