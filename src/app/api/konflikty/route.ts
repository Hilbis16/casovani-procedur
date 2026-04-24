import { NextRequest, NextResponse } from "next/server";
import { findConflicts } from "@/lib/conflictDetection";
import { addMinutes } from "@/lib/dateUtils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const therapistId = Number(searchParams.get("therapistId"));
  const patientId = Number(searchParams.get("patientId"));
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const durationMin = Number(searchParams.get("durationMin"));
  const excludeId = searchParams.get("excludeId");

  if (!therapistId || !patientId || !date || !startTime || !durationMin) {
    return NextResponse.json({ conflicts: [] });
  }

  const endTime = addMinutes(startTime, durationMin);
  const dateObj = new Date(date);
  dateObj.setUTCHours(0, 0, 0, 0);

  const conflicts = await findConflicts({
    therapistId,
    patientId,
    date: dateObj,
    startTime,
    endTime,
    excludeScheduleId: excludeId ? Number(excludeId) : undefined,
  });

  return NextResponse.json({ conflicts });
}
