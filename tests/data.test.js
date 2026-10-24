import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../app/static/js/firebase.js', () => ({ firestore: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), getDocs: vi.fn(),
  query: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), writeBatch: vi.fn()
}));

import { db, connectWorkspace } from '../app/static/js/data.js';

const sample = (extra = {}) => ({
  title: 'Write tests', project_id: '1', status: 'todo', priority: 'medium',
  assignee: 'Tester', due_date: '2026-11-01', tags: [], description: '', ...extra
});

let n = 0;
beforeEach(async () => {
  n = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `test-id-${++n}` });
  localStorage.clear();
  await connectWorkspace(null); // guest mode: seeds sample data, no Firebase
});
afterEach(() => vi.unstubAllGlobals());

describe('guest workspace', () => {
  it('seeds sample projects and tasks on first load', () => {
    expect(db.projects.length).toBeGreaterThan(0);
    expect(db.tasks.length).toBeGreaterThan(0);
  });

  it('restores saved data instead of reseeding', async () => {
    db.saveTask(sample({ title: 'Persist me' }));
    const count = db.tasks.length;
    await connectWorkspace(null);
    expect(db.tasks.length).toBe(count);
    expect(db.tasks.some(t => t.title === 'Persist me')).toBe(true);
  });

  it('writes changes to localStorage', () => {
    db.saveTask(sample({ title: 'Stored task' }));
    const stored = JSON.parse(localStorage.getItem('taskflow.guest-workspace'));
    expect(stored.tasks[0].title).toBe('Stored task');
  });
});

describe('tasks', () => {
  it('creates a task with normalised tags (lower-case, max 6)', () => {
    const before = db.tasks.length;
    db.saveTask(sample({ tags: [' CI ', 'Docker', 'a', 'b', 'c', 'd', 'e'] }));
    expect(db.tasks.length).toBe(before + 1);
    expect(db.tasks[0].tags).toEqual(['ci', 'docker', 'a', 'b', 'c', 'd']);
    expect(db.tasks[0].completed_at).toBeNull();
  });

  it('sets completed_at when a task is created as done', () => {
    db.saveTask(sample({ status: 'done' }));
    expect(db.tasks[0].completed_at).not.toBeNull();
  });

  it('sets and clears completed_at when status changes', () => {
    db.saveTask(sample());
    const id = db.tasks[0].id;
    db.updateTask(id, { status: 'done' });
    expect(db.tasks.find(t => t.id === id).completed_at).not.toBeNull();
    db.updateTask(id, { status: 'todo' });
    expect(db.tasks.find(t => t.id === id).completed_at).toBeNull();
  });

  it('ignores updates to a task that does not exist', () => {
    const before = db.tasks.length;
    db.updateTask('missing-id', { status: 'done' });
    expect(db.tasks.length).toBe(before);
  });

  it('deletes a task and can restore it exactly once', () => {
    db.saveTask(sample());
    const id = db.tasks[0].id;
    const removed = db.deleteTask(id);
    expect(removed.id).toBe(id);
    expect(db.tasks.some(t => t.id === id)).toBe(false);
    db.restoreTask(removed);
    db.restoreTask(removed); // second call must not duplicate
    expect(db.tasks.filter(t => t.id === id).length).toBe(1);
  });

  it('duplicates a task as a new "(copy)" in To Do', () => {
    db.saveTask(sample({ title: 'Original', status: 'done' }));
    const original = db.tasks[0];
    db.duplicateTask(original.id);
    const copy = db.tasks[0];
    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe('Original (copy)');
    expect(copy.status).toBe('todo');
    expect(copy.completed_at).toBeNull();
  });
});

describe('projects', () => {
  it('deleting a project also deletes its tasks', () => {
    const projectId = db.projects[0].id;
    expect(db.tasks.some(t => String(t.project_id) === String(projectId))).toBe(true);
    db.deleteProject(projectId);
    expect(db.projects.some(p => p.id === projectId)).toBe(false);
    expect(db.tasks.some(t => String(t.project_id) === String(projectId))).toBe(false);
  });

  it('archives and restores a project', () => {
    const id = db.projects[0].id;
    db.archiveProject(id, true);
    expect(db.projects.find(p => p.id === id).archived).toBe(true);
    db.archiveProject(id, false);
    expect(db.projects.find(p => p.id === id).archived).toBe(false);
  });
});

describe('import / export', () => {
  it('imports an export and keeps every task linked to a real project', async () => {
    const projects = db.projects.length, tasks = db.tasks.length;
    await db.import(db.export());
    expect(db.projects.length).toBe(projects * 2);
    expect(db.tasks.length).toBe(tasks * 2);
    const ids = new Set(db.projects.map(p => String(p.id)));
    expect(db.tasks.every(t => ids.has(String(t.project_id)))).toBe(true);
  });

  it('rejects JSON without projects and tasks arrays', async () => {
    await expect(db.import('{"projects": 1}')).rejects.toThrow('Expected projects and tasks arrays');
  });
});

describe('events', () => {
  it('announces data changes to the UI', () => {
    const spy = vi.fn();
    window.addEventListener('taskflow:data', spy);
    db.saveTask(sample());
    window.removeEventListener('taskflow:data', spy);
    expect(spy).toHaveBeenCalled();
  });
});