const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('task lifecycle', () => {
    it('creates a task with sensible defaults and makes it available to callers', () => {
      const task = taskService.create({ title: 'Write service tests' });

      expect(task).toMatchObject({
        title: 'Write service tests',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
      expect(taskService.getAll()).toEqual([task]);
      expect(taskService.findById(task.id)).toEqual(task);
    });

    it('updates an existing task and returns null for an unknown id', () => {
      const task = taskService.create({ title: 'Original title' });

      expect(taskService.update(task.id, { title: 'Updated title', priority: 'high' }))
        .toMatchObject({ title: 'Updated title', priority: 'high' });
      expect(taskService.update('missing-id', { title: 'No task' })).toBeNull();
    });

    it('removes an existing task and reports when the task is absent', () => {
      const task = taskService.create({ title: 'Delete me' });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.remove(task.id)).toBe(false);
    });
  });

  describe('querying tasks', () => {
    it('filters by the full status value', () => {
      const todo = taskService.create({ title: 'Plan', status: 'todo' });
      taskService.create({ title: 'Build', status: 'in_progress' });

      expect(taskService.getByStatus('todo')).toEqual([todo]);
    });

    it('returns the first page when pagination starts at page one', () => {
      const first = taskService.create({ title: 'First' });
      const second = taskService.create({ title: 'Second' });
      taskService.create({ title: 'Third' });

      expect(taskService.getPaginated(1, 2)).toEqual([first, second]);
    });

    it('calculates status counts and excludes completed overdue tasks', () => {
      taskService.create({ title: 'Open overdue', dueDate: '2020-01-01T00:00:00.000Z' });
      taskService.create({ title: 'In progress', status: 'in_progress' });
      const completed = taskService.create({ title: 'Completed', dueDate: '2020-01-01T00:00:00.000Z' });
      taskService.completeTask(completed.id);

      expect(taskService.getStats()).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('completion', () => {
    it('marks a task done without changing its selected priority', () => {
      const task = taskService.create({ title: 'Urgent task', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed).toMatchObject({
        id: task.id,
        status: 'done',
        priority: 'high',
      });
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    it('returns null when completing an unknown task', () => {
      expect(taskService.completeTask('missing-id')).toBeNull();
    });
  });
});
