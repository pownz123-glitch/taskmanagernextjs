import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { isDueDate, isPriority, type Priority } from '@/lib/task-validation';

type TaskRow = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
  due_date: string | null;
  priority: Priority;
};

export async function GET() {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY id DESC').all() as TaskRow[];

  return NextResponse.json(
    tasks.map((task) => ({
      ...task,
      completed: Boolean(task.completed),
    })),
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const dueDate = input.due_date === undefined ? null : input.due_date;
  const priority = input.priority === undefined ? 'medium' : input.priority;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (title.length > 120) {
    return NextResponse.json({ error: 'Title must be 1-120 characters.' }, { status: 400 });
  }

  if (!isDueDate(dueDate)) {
    return NextResponse.json({ error: 'Due date must be a valid date.' }, { status: 400 });
  }

  if (!isPriority(priority)) {
    return NextResponse.json({ error: 'Priority must be low, medium, or high.' }, { status: 400 });
  }

  const result = db
    .prepare('INSERT INTO tasks (title, due_date, priority) VALUES (?, ?, ?)')
    .run(title, dueDate, priority);
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(result.lastInsertRowid) as TaskRow;

  return NextResponse.json(
    {
      ...task,
      completed: Boolean(task.completed),
    },
    { status: 201 },
  );
}
