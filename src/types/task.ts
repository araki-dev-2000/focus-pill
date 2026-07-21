export type TaskStatus = 'now' | 'next' | 'standby' | 'completed';

export interface Task {
  id: string; // crypto.randomUUID()
  title: string;
  status: TaskStatus;
  order: number; // Shared ordering across all tasks
  createdAt: string; // ISO 8601
}

export interface StoreSchema {
  tasks: Task[];
}

// Restore destination for a completed task (now / next / standby)
export type RestoreTarget = Extract<TaskStatus, 'now' | 'next' | 'standby'>;

export type TaskUpdatePatch = Partial<Pick<Task, 'title' | 'status'>>;

export interface TaskAPI {
  getAll: () => Promise<Task[]>;
  add: (title: string) => Promise<Task[]>;
  update: (id: string, patch: TaskUpdatePatch) => Promise<Task[]>;
  delete: (id: string) => Promise<Task[]>;
  reorder: (ids: string[]) => Promise<Task[]>;
  onChanged: (cb: (tasks: Task[]) => void) => void;
}
