const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  const createTask = async (overrides = {}) => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Write route tests', ...overrides });

    return response.body;
  };

  describe('GET /tasks', () => {
    it('lists all tasks', async () => {
      const first = await createTask({ title: 'First task' });
      const second = await createTask({ title: 'Second task' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([first, second]);
    });

    it('filters tasks by status and paginates from page one', async () => {
      const todo = await createTask({ title: 'Todo', status: 'todo' });
      const inProgress = await createTask({ title: 'In progress', status: 'in_progress' });
      await createTask({ title: 'Done', status: 'done' });

      const filtered = await request(app).get('/tasks?status=todo');
      const paginated = await request(app).get('/tasks?page=1&limit=2');

      expect(filtered.status).toBe(200);
      expect(filtered.body).toEqual([todo]);
      expect(paginated.status).toBe(200);
      expect(paginated.body).toEqual([todo, inProgress]);
    });
  });

  describe('POST /tasks', () => {
    it('creates a task and returns 201', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Ship API',
          description: 'Add endpoint coverage',
          priority: 'high',
          dueDate: '2030-01-01T00:00:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Ship API',
        description: 'Add endpoint coverage',
        priority: 'high',
        status: 'todo',
      });
    });

    it.each([
      [{}, 'title is required and must be a non-empty string'],
      [{ title: 'Task', priority: 'urgent' }, 'priority must be one of: low, medium, high'],
      [{ title: 'Task', dueDate: 'not-a-date' }, 'dueDate must be a valid ISO date string'],
    ])('rejects invalid create data: %j', async (body, error) => {
      const response = await request(app).post('/tasks').send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error });
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const task = await createTask();

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated task', status: 'in_progress', priority: 'low' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: task.id,
        title: 'Updated task',
        status: 'in_progress',
        priority: 'low',
      });
    });

    it('returns 400 for invalid updates and 404 for an unknown task', async () => {
      const invalid = await request(app).put('/tasks/unknown').send({ title: '' });
      const missing = await request(app).put('/tasks/unknown').send({ title: 'Valid title' });

      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ error: 'title must be a non-empty string' });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes a task and returns 404 when it is already absent', async () => {
      const task = await createTask();

      const deleted = await request(app).delete(`/tasks/${task.id}`);
      const missing = await request(app).delete(`/tasks/${task.id}`);

      expect(deleted.status).toBe(204);
      expect(deleted.text).toBe('');
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks a task as done and returns 404 for an unknown task', async () => {
      const task = await createTask({ priority: 'high' });

      const completed = await request(app).patch(`/tasks/${task.id}/complete`);
      const missing = await request(app).patch('/tasks/unknown/complete');

      expect(completed.status).toBe(200);
      expect(completed.body).toMatchObject({
        id: task.id,
        status: 'done',
        priority: 'high',
      });
      expect(completed.body.completedAt).toEqual(expect.any(String));
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a task and replaces an existing assignee', async () => {
      const task = await createTask();

      const assigned = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Ada Lovelace  ' });
      const reassigned = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Grace Hopper' });

      expect(assigned.status).toBe(200);
      expect(assigned.body).toMatchObject({ id: task.id, assignee: 'Ada Lovelace' });
      expect(reassigned.status).toBe(200);
      expect(reassigned.body).toMatchObject({ id: task.id, assignee: 'Grace Hopper' });
    });

    it.each([
      [{}, 'assignee is required and must be a non-empty string'],
      [{ assignee: '   ' }, 'assignee is required and must be a non-empty string'],
      [{ assignee: 42 }, 'assignee is required and must be a non-empty string'],
    ])('rejects invalid assignee data: %j', async (body, error) => {
      const task = await createTask();

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error });
    });

    it('returns 404 when assigning an unknown task', async () => {
      const response = await request(app)
        .patch('/tasks/unknown/assign')
        .send({ assignee: 'Ada Lovelace' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns status totals and overdue count', async () => {
      await createTask({ dueDate: '2020-01-01T00:00:00.000Z' });
      await createTask({ status: 'in_progress' });
      const done = await createTask({ status: 'done' });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
      expect(done.status).toBe('done');
    });
  });
});
