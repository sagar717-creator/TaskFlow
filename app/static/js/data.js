// Per-user Firestore workspace. Collections are scoped below users/{uid}.
import {
  collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from './firebase.js';

export const projectsSeed = [
  { id: '1', name: 'Website Redesign', description: 'Refresh the marketing site with a new visual identity and faster build pipeline.', start_date: '2026-10-10', due_date: '2026-11-09', color: '#4f52e5', archived: false },
  { id: '2', name: 'Security Lab', description: 'Coursework project covering network scanning, hardening, and a written report.', start_date: '2026-10-12', due_date: '2026-11-16', color: '#e8664a', archived: false },
  { id: '3', name: 'University Coursework', description: 'Assignments, readings, and exam prep tracked in one place for the semester.', start_date: '2026-09-01', due_date: '2026-12-21', color: '#1fa36e', archived: false }
];

const seedRows = [
  ['Draft written report', '2', 'backlog', 'medium', 'Sagar', '2026-11-11', ['writing']],
  ['QA pass on staging', '1', 'backlog', 'medium', 'Amir', '2026-11-07', ['qa']],
  ['Write launch announcement', '1', 'todo', 'low', 'Sara', '2026-11-03', ['content', 'marketing']],
  ['Midterm review sheet', '3', 'todo', 'high', 'Sagar', '2026-11-01', ['exam']],
  ['Set up analytics dashboard', '1', 'todo', 'medium', 'Mo', '2026-10-31', ['frontend']],
  ['Harden default configs', '2', 'todo', 'high', 'Sagar', '2026-10-28', ['hardening']],
  ['Implement responsive nav', '1', 'in_progress', 'medium', 'Amir', '2026-10-27', ['frontend']],
  ['Read chapters 4-5', '3', 'todo', 'low', 'Sagar', '2026-10-26', ['reading']],
  ['Build component library', '1', 'in_progress', 'high', 'Mo', '2026-10-25', ['design', 'frontend']],
  ['Accessibility audit', '1', 'review', 'critical', 'Sara', '2026-10-24', ['a11y']],
  ['Run vulnerability scan', '2', 'review', 'critical', 'Sagar', '2026-10-23', ['scanning']],
  ['Group project standup notes', '3', 'todo', 'low', 'Sagar', '2026-10-22', ['meeting']],
  ['Peer review teammate scan', '2', 'in_progress', 'medium', 'Sagar', '2026-10-21', ['review']],
  ['Submit lab report', '3', 'in_progress', 'high', 'Sagar', '2026-10-20', ['report']],
  ['Finish algorithms problem set', '3', 'done', 'medium', 'Sagar', '2026-10-19', ['homework']],
  ['Design new homepage hero', '1', 'done', 'high', 'Sara', '2026-10-17', ['design']],
  ['Set up isolated lab network', '2', 'done', 'high', 'Sagar', '2026-10-16', ['lab']],
  ['Audit current site content', '1', 'done', 'medium', 'Amir', '2026-10-14', ['content']]
];

let uid = null;
let state = { projects: [], tasks: [] };
const GUEST_KEY = 'taskflow.guest-workspace';
const userPath = (kind) => collection(firestore, 'users', uid, kind);
const refFor = (kind, id) => doc(firestore, 'users', uid, kind, String(id));
const timeNow = () => new Date().toISOString();
const announce = () => window.dispatchEvent(new Event('taskflow:data'));
const reportError = error => window.dispatchEvent(new CustomEvent('taskflow:error', { detail: error }));

function projectRecord(project, id, createdAt = timeNow()) {
  return { ...project, id: String(id), uid, archived: !!project.archived, created_at: project.created_at || createdAt, updated_at: timeNow() };
}
function taskRecord(task, id, createdAt = timeNow()) {
  return {
    ...task,
    id: String(id),
    uid,
    project_id: String(task.project_id),
    tags: Array.isArray(task.tags) ? task.tags.slice(0, 6).map(tag => String(tag).trim().toLowerCase()).filter(Boolean) : [],
    created_at: task.created_at || createdAt,
    updated_at: timeNow(),
    completed_at: task.status === 'done' ? (task.completed_at || timeNow()) : null
  };
}
function write(kind, value) {
  if (uid) setDoc(refFor(kind, value.id), value).catch(reportError);
  else persistGuest();
}

function persistGuest() {
  if (!uid) localStorage.setItem(GUEST_KEY, JSON.stringify(state));
}

function newId(kind) {
  return uid ? doc(userPath(kind)).id : crypto.randomUUID();
}

export async function connectWorkspace(userId) {
  disconnectWorkspace();
  if (!userId) {
    try { state = JSON.parse(localStorage.getItem(GUEST_KEY)) || { projects: [], tasks: [] }; }
    catch { state = { projects: [], tasks: [] }; }
    if (!state.projects.length && !state.tasks.length) await seedWorkspace();
    else announce();
    return;
  }
  uid = userId;
  try {
    // This project’s Enterprise database currently has real-time updates disabled.
    // Load on sign-in with ordinary reads so account setup and CRUD still persist.
    const [projectsSnapshot, tasksSnapshot] = await Promise.all([
      getDocs(userPath('projects')),
      getDocs(userPath('tasks'))
    ]);
    state.projects = projectsSnapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    state.tasks = tasksSnapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    announce();
  } catch (error) {
    uid = null;
    state = { projects: [], tasks: [] };
    reportError(error);
    throw error;
  }
}

export function disconnectWorkspace() {
  uid = null; state = { projects: [], tasks: [] };
}

export async function seedWorkspace() {
  if (!uid) {
    state = { projects: [], tasks: [] };
    const projects = projectsSeed.map(project => projectRecord(project, project.id, '2026-10-10T09:00:00.000Z'));
    const dates = { 14: '2026-10-20T12:00:00.000Z', 15: '2026-10-18T12:00:00.000Z', 16: '2026-10-17T12:00:00.000Z', 17: '2026-10-15T12:00:00.000Z' };
    const tasks = seedRows.map((row, index) => {
      const day = String(Math.max(1, 22 - index)).padStart(2, '0');
      const task = taskRecord({ title: row[0], project_id: row[1], status: row[2], priority: row[3], assignee: row[4], due_date: row[5], tags: row[6], description: '', created_at: `2026-10-${day}T09:00:00.000Z`, updated_at: `2026-10-${day}T09:00:00.000Z`, completed_at: dates[index + 1] || null }, String(index + 1), `2026-10-${day}T09:00:00.000Z`);
      if (row[2] !== 'done') task.completed_at = null;
      return task;
    });
    state = { projects, tasks };
    persistGuest(); announce();
    return;
  }
  const batch = writeBatch(firestore);
  const projects = projectsSeed.map(project => projectRecord(project, project.id, '2026-10-10T09:00:00.000Z'));
  projects.forEach(project => batch.set(refFor('projects', project.id), project));
  seedRows.forEach((row, index) => {
    const completedDates = { 14: '2026-10-20T12:00:00.000Z', 15: '2026-10-18T12:00:00.000Z', 16: '2026-10-17T12:00:00.000Z', 17: '2026-10-15T12:00:00.000Z' };
    const day = String(Math.max(1, 22 - index)).padStart(2, '0');
    const task = taskRecord({
      title: row[0], project_id: row[1], status: row[2], priority: row[3], assignee: row[4],
      due_date: row[5], tags: row[6], description: '',
      created_at: `2026-10-${day}T09:00:00.000Z`,
      updated_at: `2026-10-${day}T09:00:00.000Z`, completed_at: completedDates[index + 1] || null
    }, String(index + 1), `2026-10-${day}T09:00:00.000Z`);
    if (row[2] !== 'done') task.completed_at = null;
    batch.set(refFor('tasks', task.id), task);
  });
  await batch.commit();
}

export const db = {
  get projects() { return state.projects; },
  get tasks() { return state.tasks; },
  saveProject(project) {
    const id = project.id ? String(project.id) : newId('projects');
    const old = state.projects.find(item => String(item.id) === id);
    const value = projectRecord({ ...old, ...project }, id, old?.created_at);
    state.projects = old ? state.projects.map(item => String(item.id) === id ? value : item) : [value, ...state.projects];
    announce(); write('projects', value);
  },
  deleteProject(id) {
    const key = String(id), removed = state.tasks.filter(task => String(task.project_id) === key);
    state.projects = state.projects.filter(project => String(project.id) !== key);
    state.tasks = state.tasks.filter(task => String(task.project_id) !== key);
    persistGuest(); announce();
    if (!uid) return;
    (async () => {
      const batch = writeBatch(firestore);
      batch.delete(refFor('projects', key));
      removed.forEach(task => batch.delete(refFor('tasks', task.id)));
      await batch.commit();
    })().catch(reportError);
  },
  archiveProject(id, archived) {
    const key = String(id), old = state.projects.find(item => String(item.id) === key);
    if (!old) return;
    const value = { ...old, archived, updated_at: timeNow() };
    state.projects = state.projects.map(item => String(item.id) === key ? value : item);
    persistGuest(); announce();
    if (uid) updateDoc(refFor('projects', key), { archived, updated_at: value.updated_at }).catch(reportError);
  },
  saveTask(task) {
    const id = task.id ? String(task.id) : newId('tasks');
    const old = state.tasks.find(item => String(item.id) === id);
    const value = taskRecord({ ...old, ...task }, id, old?.created_at);
    state.tasks = old ? state.tasks.map(item => String(item.id) === id ? value : item) : [value, ...state.tasks];
    announce(); write('tasks', value);
  },
  deleteTask(id) {
    const key = String(id), removed = state.tasks.find(item => String(item.id) === key);
    state.tasks = state.tasks.filter(item => String(item.id) !== key);
    persistGuest(); announce();
    if (uid) deleteDoc(refFor('tasks', key)).catch(reportError);
    return removed;
  },
  restoreTask(task) {
    if (!task || state.tasks.some(item => String(item.id) === String(task.id))) return;
    state.tasks = [task, ...state.tasks]; persistGuest(); announce(); write('tasks', task);
  },
  updateTask(id, patch) {
    const key = String(id), old = state.tasks.find(item => String(item.id) === key);
    if (!old) return;
    const value = taskRecord({ ...old, ...patch }, key, old.created_at);
    state.tasks = state.tasks.map(item => String(item.id) === key ? value : item);
    persistGuest(); announce();
    if (uid) updateDoc(refFor('tasks', key), patchToTask(patch, value)).catch(reportError);
  },
  duplicateTask(id) {
    const old = state.tasks.find(item => String(item.id) === String(id));
    if (old) this.saveTask({ ...old, id: undefined, title: `${old.title} (copy)`, status: 'todo', completed_at: null });
  },
  async reset() {
    if (!uid) { await seedWorkspace(); return; }
    const [projects, tasks] = await Promise.all([getDocs(userPath('projects')), getDocs(userPath('tasks'))]);
    const batch = writeBatch(firestore);
    [...projects.docs, ...tasks.docs].forEach(item => batch.delete(item.ref));
    await batch.commit();
    await seedWorkspace();
  },
  export() { return JSON.stringify({ projects: state.projects, tasks: state.tasks }, null, 2); },
  async import(json) {
    const value = JSON.parse(json);
    if (!Array.isArray(value.projects) || !Array.isArray(value.tasks)) throw new Error('Expected projects and tasks arrays');
    const remap = new Map();
    value.projects.forEach(project => {
      const id = newId('projects'); remap.set(String(project.id), id);
      this.saveProject({ ...project, id });
    });
    value.tasks.forEach(task => this.saveTask({ ...task, id: undefined, project_id: remap.get(String(task.project_id)) || task.project_id }));
  }
};

function patchToTask(patch, full) {
  const result = {};
  for (const key of Object.keys(patch)) result[key] = full[key];
  result.updated_at = full.updated_at;
  result.completed_at = full.completed_at;
  return result;
}
