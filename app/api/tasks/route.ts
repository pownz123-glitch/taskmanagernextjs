import { NextResponse } from 'next/server';
import db from '@/lib/db';

type TaskRow = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
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
  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 120) {
      return NextResponse.json({ error: 'Title must be 1-120 characters.' }, { status: 400 });
    }

    const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
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
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
