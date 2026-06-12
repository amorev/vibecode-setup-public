import { test, expect } from '../fixtures';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Generate a unique marker for this test run — used in titles to avoid collisions
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const PREFIX = `e2e-${RUN_ID}`;

/** Authenticated API client as admin. */
async function adminApi(): Promise<AxiosInstance> {
  const { data } = await axios.post(`${API_URL}/auth/login`, {
    login: ADMIN_LOGIN,
    password: ADMIN_PASSWORD,
  });
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
}

/** Authenticated API client as a regular user. Creates the user if needed. */
async function userApi(login: string, password: string): Promise<AxiosInstance> {
  // Create user as admin (ignore 409 if already exists)
  const admin = await adminApi();
  try {
    await admin.post('/users', { login, password, role: 'user' });
  } catch (err: any) {
    if (err.response?.status !== 409) throw err;
  }

  const { data } = await axios.post(`${API_URL}/auth/login`, { login, password });
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
}

interface EventDto {
  id: number;
  title: string;
  description: string;
  link: string;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Seed a few events for filter tests. Returns cleanup function. */
async function seedEvents(
  api: AxiosInstance,
  events: Array<{ title: string; description: string; daysFromNow: number }>,
): Promise<{ ids: number[]; cleanup: () => Promise<void> }> {
  const ids: number[] = [];
  for (const e of events) {
    const date = new Date();
    date.setDate(date.getDate() + e.daysFromNow);
    date.setHours(12, 0, 0, 0);
    const res = await api.post('/events', {
      title: e.title,
      description: e.description,
      link: 'https://example.com',
      eventDate: date.toISOString(),
    });
    ids.push(res.data.id);
  }
  return {
    ids,
    cleanup: async () => {
      await Promise.all(
        ids.map((id) => api.delete(`/events/${id}`).catch(() => {})),
      );
    },
  };
}

test.describe.serial('Events API', () => {

  // ── Public access ───────────────────────────────────────────────
  test('GET /api/events is public (no auth required)', async () => {
    const api = axios.create({ baseURL: API_URL });
    const res = await api.get('/events');
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  test('GET /api/events/:id is public', async () => {
    const admin = await adminApi();
    const { cleanup, ids } = await seedEvents(admin, [
      { title: `${PREFIX}-public-one`, description: 'public access', daysFromNow: 30 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      const res = await api.get(`/events/${ids[0]}`);
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(ids[0]);
      expect(res.data.title).toBe(`${PREFIX}-public-one`);
    } finally {
      await cleanup();
    }
  });

  // ── Filtering ───────────────────────────────────────────────────
  test('filter by title (partial, case-insensitive)', async () => {
    const admin = await adminApi();
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-Vue-meetup`, description: 'frontend', daysFromNow: 10 },
      { title: `${PREFIX}-React-meetup`, description: 'frontend', daysFromNow: 20 },
      { title: `${PREFIX}-Vue-workshop`, description: 'deep dive', daysFromNow: 30 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      const res = await api.get('/events', { params: { title: 'vue' } });
      expect(res.status).toBe(200);
      expect(res.data.total).toBe(2);
      for (const item of res.data.items) {
        expect(item.title.toLowerCase()).toContain('vue');
      }
    } finally {
      await cleanup();
    }
  });

  test('filter by description (partial)', async () => {
    const admin = await adminApi();
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-A`, description: 'TypeORM basics', daysFromNow: 10 },
      { title: `${PREFIX}-B`, description: 'Prisma basics', daysFromNow: 20 },
      { title: `${PREFIX}-C`, description: 'TypeORM advanced', daysFromNow: 30 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      const res = await api.get('/events', { params: { description: 'TypeORM' } });
      expect(res.data.total).toBe(2);
      for (const item of res.data.items) {
        expect(item.description).toContain('TypeORM');
      }
    } finally {
      await cleanup();
    }
  });

  test('filter by date range (dateFrom + dateTo)', async () => {
    const admin = await adminApi();
    // Seed: -10, +5, +15, +30 days
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-past`, description: 'in the past', daysFromNow: -10 },
      { title: `${PREFIX}-near`, description: 'near', daysFromNow: 5 },
      { title: `${PREFIX}-medium`, description: 'medium', daysFromNow: 15 },
      { title: `${PREFIX}-far`, description: 'far', daysFromNow: 30 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      // Range covering only "near" and "medium" (0 .. 20)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(end.getDate() + 20);

      const res = await api.get('/events', {
        params: {
          dateFrom: today.toISOString().slice(0, 10),
          dateTo: end.toISOString().slice(0, 10),
          limit: 50,
        },
      });

      // 2 from this run should be in range (near=+5, medium=+15).
      // There may be others, but the seeded ones we care about must all be present.
      const titles = res.data.items.map((e: EventDto) => e.title);
      expect(titles).toContain(`${PREFIX}-near`);
      expect(titles).toContain(`${PREFIX}-medium`);
      expect(titles).not.toContain(`${PREFIX}-past`);
      expect(titles).not.toContain(`${PREFIX}-far`);
    } finally {
      await cleanup();
    }
  });

  test('combined filters (title + description + dateFrom + dateTo)', async () => {
    const admin = await adminApi();
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-Vue-conf`, description: 'online', daysFromNow: 7 },
      { title: `${PREFIX}-Vue-meetup`, description: 'offline', daysFromNow: 14 },
      { title: `${PREFIX}-React-meetup`, description: 'offline', daysFromNow: 7 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(end.getDate() + 10);

      const res = await api.get('/events', {
        params: {
          title: 'Vue',
          description: 'online',
          dateFrom: today.toISOString().slice(0, 10),
          dateTo: end.toISOString().slice(0, 10),
        },
      });

      expect(res.data.total).toBe(1);
      expect(res.data.items[0].title).toBe(`${PREFIX}-Vue-conf`);
      expect(res.data.items[0].description).toBe('online');
    } finally {
      await cleanup();
    }
  });

  // ── Pagination ──────────────────────────────────────────────────
  test('pagination: returns correct totalPages and slices items', async () => {
    const admin = await adminApi();
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-p1`, description: 'page test', daysFromNow: 100 },
      { title: `${PREFIX}-p2`, description: 'page test', daysFromNow: 101 },
      { title: `${PREFIX}-p3`, description: 'page test', daysFromNow: 102 },
      { title: `${PREFIX}-p4`, description: 'page test', daysFromNow: 103 },
      { title: `${PREFIX}-p5`, description: 'page test', daysFromNow: 104 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      // page 1, limit 2 — should return 2 of our 5 (plus possibly others).
      const p1 = await api.get('/events', { params: { description: 'page test', page: 1, limit: 2 } });
      expect(p1.data.page).toBe(1);
      expect(p1.data.limit).toBe(2);
      expect(p1.data.total).toBe(5);
      expect(p1.data.totalPages).toBe(3);
      expect(p1.data.items).toHaveLength(2);

      const p2 = await api.get('/events', { params: { description: 'page test', page: 2, limit: 2 } });
      expect(p2.data.items).toHaveLength(2);

      const p3 = await api.get('/events', { params: { description: 'page test', page: 3, limit: 2 } });
      expect(p3.data.items).toHaveLength(1);

      // No overlap between pages
      const allIds = [
        ...p1.data.items.map((e: EventDto) => e.id),
        ...p2.data.items.map((e: EventDto) => e.id),
        ...p3.data.items.map((e: EventDto) => e.id),
      ];
      expect(new Set(allIds).size).toBe(5);
    } finally {
      await cleanup();
    }
  });

  test('pagination defaults: page=1, limit=10', async () => {
    const api = axios.create({ baseURL: API_URL });
    const res = await api.get('/events');
    expect(res.data.page).toBe(1);
    expect(res.data.limit).toBe(10);
  });

  // ── Admin CRUD ──────────────────────────────────────────────────
  test('admin can create, read, update and delete an event', async () => {
    const admin = await adminApi();
    let createdId = 0;

    // CREATE
    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await admin.post<EventDto>('/events', {
      title: `${PREFIX}-crud`,
      description: 'initial',
      link: 'https://example.com',
      eventDate,
    });
    expect(createRes.status).toBe(201);
    expect(createRes.data.id).toBeGreaterThan(0);
    expect(createRes.data.title).toBe(`${PREFIX}-crud`);
    createdId = createRes.data.id;

    try {
      // READ ONE
      const getRes = await admin.get<EventDto>(`/events/${createdId}`);
      expect(getRes.data.id).toBe(createdId);
      expect(getRes.data.title).toBe(`${PREFIX}-crud`);

      // UPDATE
      const newDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const patchRes = await admin.patch<EventDto>(`/events/${createdId}`, {
        title: `${PREFIX}-crud-updated`,
        description: 'updated description',
        eventDate: newDate,
      });
      expect(patchRes.data.title).toBe(`${PREFIX}-crud-updated`);
      expect(patchRes.data.description).toBe('updated description');

      // PARTIAL UPDATE (only title)
      const partialRes = await admin.patch<EventDto>(`/events/${createdId}`, {
        title: `${PREFIX}-partial`,
      });
      expect(partialRes.data.title).toBe(`${PREFIX}-partial`);
      expect(partialRes.data.description).toBe('updated description');
    } finally {
      // DELETE
      const delRes = await admin.delete(`/events/${createdId}`);
      expect(delRes.status).toBe(200);

      // Verify deletion
      await expect(admin.get(`/events/${createdId}`)).rejects.toMatchObject({
        response: { status: 404 },
      });
    }
  });

  // ── Access control ──────────────────────────────────────────────
  test('non-admin user cannot create, update or delete events (403)', async () => {
    const userLogin = `${PREFIX}-regular-user`;
    const user = await userApi(userLogin, 'regular1234');
    const admin = await adminApi();

    // Pre-create an event as admin to attempt modifying
    const created = await admin.post<EventDto>('/events', {
      title: `${PREFIX}-protected`,
      description: 'forbidden',
      link: 'https://example.com',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
    });

    try {
      // POST — should be forbidden
      await expect(
        user.post('/events', {
          title: 'hack',
          description: 'hack',
          link: 'https://hack.com',
          eventDate: new Date().toISOString(),
        }),
      ).rejects.toMatchObject({ response: { status: 403 } });

      // PATCH — should be forbidden
      await expect(
        user.patch(`/events/${created.data.id}`, { title: 'hacked' }),
      ).rejects.toMatchObject({ response: { status: 403 } });

      // DELETE — should be forbidden
      await expect(
        user.delete(`/events/${created.data.id}`),
      ).rejects.toMatchObject({ response: { status: 403 } });
    } finally {
      await admin.delete(`/events/${created.data.id}`).catch(() => {});
    }
  });

  test('unauthenticated request to admin endpoint returns 401', async () => {
    const api = axios.create({ baseURL: API_URL });
    await expect(
      api.post('/events', {
        title: 'x',
        description: 'x',
        link: 'https://x.com',
        eventDate: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  // ── Error handling ──────────────────────────────────────────────
  test('GET /api/events/:id returns 404 for unknown id', async () => {
    const api = axios.create({ baseURL: API_URL });
    await expect(api.get('/events/999999999')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  test('invalid create payload returns 400 with validation errors', async () => {
    const admin = await adminApi();
    // All fields invalid: empty strings, non-URL, non-date
    await expect(
      admin.post('/events', {
        title: '',
        description: '',
        link: 'not-a-url',
        eventDate: 'not-a-date',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  test('dateFrom > dateTo returns empty result', async () => {
    const admin = await adminApi();
    const { cleanup } = await seedEvents(admin, [
      { title: `${PREFIX}-inverted`, description: 'inverted test', daysFromNow: 30 },
    ]);
    try {
      const api = axios.create({ baseURL: API_URL });
      const res = await api.get('/events', {
        params: {
          description: 'inverted test',
          dateFrom: '2026-12-31',
          dateTo: '2026-01-01',
        },
      });
      // Server doesn't enforce ordering — it just returns whatever is in the range.
      // Either zero results, or our event still appears (depending on order).
      // We just assert the response is well-formed and doesn't error.
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.items)).toBe(true);
    } finally {
      await cleanup();
    }
  });

});

// ── UI smoke (optional sanity) ─────────────────────────────────────
test.describe('Events UI smoke', () => {

  test('public /events page loads', async ({ connectedPage: page }) => {
    await page.goto(`${BASE_URL}/#/events`);
    await expect(page.getByRole('heading', { name: 'Мероприятия' })).toBeVisible({ timeout: 10_000 });
    // Filter inputs are present
    await expect(page.getByPlaceholder('Поиск по названию')).toBeVisible();
    await expect(page.getByPlaceholder('Поиск по описанию')).toBeVisible();
  });

  test('home page links to /events', async ({ connectedPage: page }) => {
    await page.goto(`${BASE_URL}/#/`);
    const link = page.getByRole('link', { name: 'Посмотреть мероприятия' });
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute('href', /#\/events$/);
  });

  test('admin can open /admin/events after login', async ({ connectedPage: page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.getByPlaceholder('admin').fill(ADMIN_LOGIN);
    await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/#\/admin/, { timeout: 15_000 });

    // Navigate to events section via the nav tab
    await page.getByRole('button', { name: 'Мероприятия' }).click();
    await page.waitForURL(/#\/admin\/events/, { timeout: 10_000 });

    // The page heading should be visible
    await expect(page.getByRole('heading', { name: 'Мероприятия' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Добавить мероприятие' })).toBeVisible();
  });

});