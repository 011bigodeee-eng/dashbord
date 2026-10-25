import type { WorkoutState } from "@/lib/portal-validation";
export type Exercise = {
  name: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  load: number;
  rest: number;
  tempo?: string;
  notes?: string;
};
export type Prescription = {
  name: string;
  division: string;
  exercises: Exercise[];
  notes?: string;
};
export type Run = {
  id: string;
  trainingId: string;
  snapshot: Prescription;
  state: WorkoutState;
  status: "IN_PROGRESS" | "PAUSED" | "COMPLETED";
  activeSeconds: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  feedback: string;
  difficulty: number | null;
};
export type AthleteRecord = {
  id: string;
  kind: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};
export type AthleteData = {
  user: { name: string; email: string; demo: boolean };
  student: { id: string; name: string; goal: string };
  trainer: { name: string; specialty: string; phone: string };
  records: AthleteRecord[];
  sessions: Run[];
  messages: {
    id: string;
    title: string;
    body: string;
    category: string;
    readAt: string | null;
    createdAt: string;
  }[];
  requests: {
    id: string;
    appointmentId: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    response: string;
    createdAt: string;
  }[];
  photos: { id: string; date: string }[];
  serverTime: string;
};
