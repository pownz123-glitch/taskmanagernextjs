'use client';

import { FormEvent, useEffect, useState } from 'react';

type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load tasks');
      }

      const data = (await response.json()) as Task[];
      setTasks(data);
      setError('');
    } catch {
      setError('Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();

    if (!trimmed) {
      setError('Task title is required.');
      return;
    }

    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing ? `/api/tasks/${editingId}` : '/api/tasks',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isEditing ? { title: trimmed } : { title: trimmed },
          ),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (isEditing) {
        setTasks((current) =>
          current.map((task) => (task.id === editingId ? data : task)),
        );
      } else {
        setTasks((current) => [data, ...current]);
      }

      setTitle('');
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    }
  }

  async function toggleTask(task: Task) {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });

      const updated = (await response.json()) as Task;

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      setError('Unable to update task.');
    }
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(`Delete "${task.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (editingId === task.id) {
        setEditingId(null);
        setTitle('');
      }
      setError('');
    } catch {
      setError('Unable to delete task.');
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setTitle(task.title);
    setError('');
  }

  function cancelEditing() {
    setEditingId(null);
    setTitle('');
  }

  return (
    <main className="app-shell">
      <div className="task-wrapper">
        <div className="content-panel">
          <div className="page-header">
            <span className="eyebrow">Task Manager</span>
            <h1 className="lesson-title">Stay on top of your work</h1>
            <p className="lesson-subtitle">
              Add, update, complete, and remove tasks from one clean workspace.
            </p>
          </div>

          <div className="task-form">
            <form onSubmit={handleSubmit}>
              <label htmlFor="task-title">Task title</label>
              <input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={editingId === null ? 'Add a task' : 'Edit task'}
                className="task-input"
              />

              <div className="form-actions">
                <button type="submit" className="primary-btn">
                  {editingId === null ? 'Save task' : 'Update task'}
                </button>
                {editingId !== null ? (
                  <button type="button" onClick={cancelEditing} className="secondary-btn">
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            {error ? <p className="error-text">{error}</p> : null}

            {loading ? (
              <p className="empty-state">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="empty-state">No tasks yet.</p>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <button
                      type="button"
                      onClick={() => toggleTask(task)}
                      className="task-toggle"
                    >
                      <span className={`task-checkbox ${task.completed ? 'done' : ''}`}>
                        {task.completed ? '✓' : ''}
                      </span>
                      <span className={`task-text ${task.completed ? 'done' : ''}`}>
                        {task.title}
                      </span>
                    </button>

                    <div className="task-actions">
                      <button
                        type="button"
                        onClick={() => startEditing(task)}
                        className="small-btn"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="small-btn delete"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
