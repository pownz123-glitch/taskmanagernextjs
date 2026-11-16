export const priorities = ['low', 'medium', 'high'] as const;

export type Priority = (typeof priorities)[number];

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && priorities.some((priority) => priority === value);
}

export function isDueDate(value: unknown): value is string | null {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
