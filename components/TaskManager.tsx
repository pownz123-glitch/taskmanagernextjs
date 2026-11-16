'use client';

import { FormEvent, useEffect, useState } from 'react';
import { isPriority, type Priority } from '@/lib/task-validation';

type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  due_date: string | null;
  priority: Priority;
};

type TaskFilter = 'all' | 'active' | 'completed';

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/tasks', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load tasks');
        }

        return response.json() as Promise<Task[]>;
      })
      .then((data) => {
        setTasks(data);
        setError('');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Unable to load tasks.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();

    if (!trimmed) {
      setError('Task title is required.');
      return;
    }

    const taskDetails = {
      title: trimmed,
      due_date: dueDate || null,
      priority,
    };

    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing ? `/api/tasks/${editingId}` : '/api/tasks',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskDetails),
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
      setDueDate('');
      setPriority('medium');
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
        setDueDate('');
        setPriority('medium');
      }
      setError('');
    } catch {
      setError('Unable to delete task.');
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setTitle(task.title);
    setDueDate(task.due_date ?? '');
    setPriority(task.priority);
    setError('');
  }

  function cancelEditing() {
    setEditingId(null);
    setTitle('');
    setDueDate('');
    setPriority('medium');
  }

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') {
      return !task.completed;
    }

    if (filter === 'completed') {
      return task.completed;
    }

    return true;
  });

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
              <div className="task-form-grid">
                <div className="field-group task-title-field">
                  <label htmlFor="task-title">Task title</label>
                  <input
                    id="task-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={editingId === null ? 'Add a task' : 'Edit task'}
                    className="task-input"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="task-due-date">Due date</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) => {
                      if (isPriority(event.target.value)) {
                        setPriority(event.target.value);
                      }
                    }}
                    className="task-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

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

            <div className="task-filters" role="group" aria-label="Filter tasks">
              {(['all', 'active', 'completed'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`filter-btn ${filter === option ? 'selected' : ''}`}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                  {option === 'all'
                    ? ` (${tasks.length})`
                    : ` (${tasks.filter((task) => (option === 'active' ? !task.completed : task.completed)).length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="empty-state">Loading tasks...</p>
            ) : visibleTasks.length === 0 ? (
              <p className="empty-state">
                {tasks.length === 0 ? 'No tasks yet.' : 'No tasks match this filter.'}
              </p>
            ) : (
              <ul className="task-list">
                {visibleTasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <button
                      type="button"
                      onClick={() => toggleTask(task)}
                      className="task-toggle"
                    >
                      <span className={`task-checkbox ${task.completed ? 'done' : ''}`}>
                        {task.completed ? '✓' : ''}
                      </span>
                      <span className="task-description">
                        <span className={`task-text ${task.completed ? 'done' : ''}`}>
                          {task.title}
                        </span>
                        {task.due_date ? (
                          <span className="task-due-date">
                            Due{' '}
                            {new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    <div className="task-actions">
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority}
                      </span>
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
