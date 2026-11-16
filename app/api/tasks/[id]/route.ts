import { NextResponse } from 'next/server';
import db from '@/lib/db';

export type Context = {
  params: Promise<{ id: string }>;
};

type TaskRow = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
};

export function getId(value: string): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export function serializeTask(task: TaskRow) {
  return {
    ...task,
    completed: Boolean(task.completed),
  };
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const taskId = getId(id);

  if (taskId === null) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(serializeTask(task));
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const taskId = getId(id);

  if (taskId === null) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;

  if (!current) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === 'string' ? input.title : undefined;
  const completed = typeof input.completed === 'boolean' ? input.completed : undefined;

  const nextTitle = title === undefined ? current.title : title.trim();
  const nextCompleted = completed === undefined ? Boolean(current.completed) : completed;

  if (title !== undefined && (title.trim() === '' || title.trim().length > 120)) {
    return NextResponse.json({ error: 'Title must be 1-120 characters.' }, { status: 400 });
  }

  if (title !== undefined || completed !== undefined) {
    db.prepare(
      'UPDATE tasks SET title = ?, completed = ? WHERE id = ?',
    ).run(nextTitle, Number(nextCompleted), taskId);
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;

  return NextResponse.json(serializeTask(updated));
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const taskId = getId(id);

  if (taskId === null) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
