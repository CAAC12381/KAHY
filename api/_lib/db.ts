import { sql } from '@vercel/postgres'

/**
 * Shared Postgres helpers for KAHY's persistence layer (Vercel Postgres / Neon).
 * Lives under api/_lib alongside kahyAi.ts for the same reason: Vercel's
 * function bundler only reliably traces imports that stay inside api/, so
 * this file has zero imports outside npm packages — see kahyAi.ts's header
 * comment for the full story on why that boundary matters here.
 *
 * Every data table is keyed by `device_id`: an anonymous id generated and
 * stored client-side (src/lib/deviceId.ts). An account (see auth.ts) does
 * not add a second key — it *claims* one of those ids through
 * `accounts.data_id`, and from then on that id is only reachable with the
 * account's session. Tables have no foreign keys on purpose — "explorar sin
 * registro" never creates a profiles row, so screenings/chat-memory/pet
 * garden must be able to exist independently of one.
 */

let schemaReady: Promise<void> | null = null

function createSchema() {
  return Promise.all([
    sql`
      CREATE TABLE IF NOT EXISTS profiles (
        device_id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Invitado',
        companion_type TEXT NOT NULL DEFAULT 'mascota',
        mascot TEXT NOT NULL DEFAULT 'vaca',
        flower TEXT NOT NULL DEFAULT 'Clavel',
        city TEXT NOT NULL DEFAULT 'Morelia',
        goals JSONB NOT NULL DEFAULT '[]'::jsonb,
        preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS screening_results (
        id BIGSERIAL PRIMARY KEY,
        device_id TEXT NOT NULL,
        instrument_id TEXT NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        band TEXT NOT NULL,
        item9_positive BOOLEAN NOT NULL DEFAULT false
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS chat_memory (
        id BIGSERIAL PRIMARY KEY,
        device_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS pet_garden (
        device_id TEXT PRIMARY KEY,
        happiness INTEGER NOT NULL DEFAULT 70,
        bond INTEGER NOT NULL DEFAULT 12,
        progress INTEGER NOT NULL DEFAULT 0,
        care_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_care TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS emotion_entries (
        entry_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL,
        primary_emotion TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        intensity TEXT NOT NULL,
        progress TEXT NOT NULL,
        confidence TEXT NOT NULL
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS task_plans (
        plan_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS habit_days (
        device_id TEXT NOT NULL,
        day DATE NOT NULL,
        completed JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (device_id, day)
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        data_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `,
  ]).then(() => {
    // Index creation kept separate from CREATE TABLE for older Postgres compatibility.
    return Promise.all([
      sql`ALTER TABLE pet_garden ADD COLUMN IF NOT EXISTS rewarded_milestones JSONB NOT NULL DEFAULT '[]'::jsonb`,
      sql`CREATE INDEX IF NOT EXISTS idx_screening_device ON screening_results(device_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_memory_device ON chat_memory(device_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_emotion_device_at ON emotion_entries(device_id, at DESC)`,
      sql`CREATE INDEX IF NOT EXISTS idx_task_plans_device ON task_plans(device_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_habit_days_device ON habit_days(device_id, day DESC)`,
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id)`,
    ])
  }).then(() => undefined)
}

/** Idempotent, cached per warm serverless instance — cheap enough to call at the top of every handler. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = createSchema()
  return schemaReady
}

export type StoredProfile = {
  name: string
  companionType: string
  mascot: string
  flower: string
  city: string
  goals: string[]
  preferences: Record<string, unknown>
}

export async function getProfile(deviceId: string): Promise<StoredProfile | null> {
  const { rows } = await sql`SELECT * FROM profiles WHERE device_id = ${deviceId} LIMIT 1`
  const row = rows[0]
  if (!row) return null
  return {
    name: row.name,
    companionType: row.companion_type,
    mascot: row.mascot,
    flower: row.flower,
    city: row.city,
    goals: row.goals || [],
    preferences: row.preferences || {},
  }
}

export async function upsertProfile(deviceId: string, profile: StoredProfile): Promise<void> {
  await sql`
    INSERT INTO profiles (device_id, name, companion_type, mascot, flower, city, goals, preferences, updated_at)
    VALUES (${deviceId}, ${profile.name}, ${profile.companionType}, ${profile.mascot}, ${profile.flower}, ${profile.city}, ${JSON.stringify(profile.goals)}::jsonb, ${JSON.stringify(profile.preferences)}::jsonb, now())
    ON CONFLICT (device_id) DO UPDATE SET
      name = EXCLUDED.name,
      companion_type = EXCLUDED.companion_type,
      mascot = EXCLUDED.mascot,
      flower = EXCLUDED.flower,
      city = EXCLUDED.city,
      goals = EXCLUDED.goals,
      preferences = EXCLUDED.preferences,
      updated_at = now()
  `
}

export type StoredScreeningResult = {
  id: string
  completedAt: number
  answers: number[]
  score: number
  band: string
  item9Positive?: boolean
}

export async function listScreenings(deviceId: string): Promise<StoredScreeningResult[]> {
  const { rows } = await sql`
    SELECT instrument_id, completed_at, answers, score, band, item9_positive
    FROM screening_results WHERE device_id = ${deviceId}
    ORDER BY completed_at ASC LIMIT 40
  `
  return rows.map((row) => ({
    id: row.instrument_id,
    completedAt: new Date(row.completed_at).getTime(),
    answers: row.answers || [],
    score: row.score,
    band: row.band,
    item9Positive: row.item9_positive ?? undefined,
  }))
}

export async function addScreening(deviceId: string, result: StoredScreeningResult): Promise<void> {
  await sql`
    INSERT INTO screening_results (device_id, instrument_id, completed_at, answers, score, band, item9_positive)
    VALUES (${deviceId}, ${result.id}, ${new Date(result.completedAt).toISOString()}, ${JSON.stringify(result.answers)}::jsonb, ${result.score}, ${result.band}, ${Boolean(result.item9Positive)})
  `
}

export async function clearChatMemory(deviceId: string): Promise<void> {
  await sql`DELETE FROM chat_memory WHERE device_id = ${deviceId}`
}

/**
 * Used by "borrar perfil" / "eliminar mi cuenta" — a real delete, not just
 * orphaning the rows. If an account had claimed this id, the account and
 * its sessions go too, so nothing is left that could log back in.
 */
export async function deleteAllDataForDevice(deviceId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE account_id IN (SELECT account_id FROM accounts WHERE data_id = ${deviceId})`
  await Promise.all([
    sql`DELETE FROM accounts WHERE data_id = ${deviceId}`,
    sql`DELETE FROM profiles WHERE device_id = ${deviceId}`,
    sql`DELETE FROM screening_results WHERE device_id = ${deviceId}`,
    sql`DELETE FROM chat_memory WHERE device_id = ${deviceId}`,
    sql`DELETE FROM pet_garden WHERE device_id = ${deviceId}`,
    sql`DELETE FROM emotion_entries WHERE device_id = ${deviceId}`,
    sql`DELETE FROM task_plans WHERE device_id = ${deviceId}`,
    sql`DELETE FROM habit_days WHERE device_id = ${deviceId}`,
  ])
}

export type StoredMemoryEntry = { topic: string; at: number }

export async function listChatMemory(deviceId: string): Promise<StoredMemoryEntry[]> {
  const { rows } = await sql`
    SELECT topic, at FROM chat_memory WHERE device_id = ${deviceId}
    ORDER BY at ASC LIMIT 8
  `
  return rows.map((row) => ({ topic: row.topic, at: new Date(row.at).getTime() }))
}

export async function addChatMemory(deviceId: string, topic: string): Promise<void> {
  await sql`INSERT INTO chat_memory (device_id, topic) VALUES (${deviceId}, ${topic})`
  // Keep only the most recent 8 rows per device so this table can't grow unbounded.
  await sql`
    DELETE FROM chat_memory WHERE device_id = ${deviceId} AND id NOT IN (
      SELECT id FROM chat_memory WHERE device_id = ${deviceId} ORDER BY at DESC LIMIT 8
    )
  `
}

export type StoredPetGarden = {
  happiness: number
  bond: number
  progress: number
  careCounts: Record<string, number>
  lastCare: number
  rewardedMilestones: string[]
}

export async function getPetGarden(deviceId: string): Promise<StoredPetGarden | null> {
  const { rows } = await sql`SELECT * FROM pet_garden WHERE device_id = ${deviceId} LIMIT 1`
  const row = rows[0]
  if (!row) return null
  return {
    happiness: row.happiness,
    bond: row.bond,
    progress: row.progress,
    careCounts: row.care_counts || {},
    lastCare: new Date(row.last_care).getTime(),
    rewardedMilestones: row.rewarded_milestones || [],
  }
}

export async function upsertPetGarden(deviceId: string, state: StoredPetGarden): Promise<void> {
  await sql`
    INSERT INTO pet_garden (device_id, happiness, bond, progress, care_counts, last_care, rewarded_milestones)
    VALUES (${deviceId}, ${state.happiness}, ${state.bond}, ${state.progress}, ${JSON.stringify(state.careCounts)}::jsonb, ${new Date(state.lastCare).toISOString()}, ${JSON.stringify(state.rewardedMilestones)}::jsonb)
    ON CONFLICT (device_id) DO UPDATE SET
      happiness = EXCLUDED.happiness,
      bond = EXCLUDED.bond,
      progress = EXCLUDED.progress,
      care_counts = EXCLUDED.care_counts,
      last_care = EXCLUDED.last_care,
      rewarded_milestones = EXCLUDED.rewarded_milestones
  `
}

export type StoredEmotionEntry = {
  id: string
  at: number
  primary: string
  detail: string
  intensity: string
  progress: string
  confidence: string
}

export async function listEmotionEntries(deviceId: string): Promise<StoredEmotionEntry[]> {
  const { rows } = await sql`
    SELECT entry_id, at, primary_emotion, detail, intensity, progress, confidence
    FROM emotion_entries WHERE device_id = ${deviceId}
    ORDER BY at ASC LIMIT 180
  `
  return rows.map((row) => ({
    id: row.entry_id,
    at: new Date(row.at).getTime(),
    primary: row.primary_emotion,
    detail: row.detail,
    intensity: row.intensity,
    progress: row.progress,
    confidence: row.confidence,
  }))
}

export async function addEmotionEntry(deviceId: string, entry: StoredEmotionEntry): Promise<void> {
  await sql`
    INSERT INTO emotion_entries (entry_id, device_id, at, primary_emotion, detail, intensity, progress, confidence)
    VALUES (${entry.id}, ${deviceId}, ${new Date(entry.at).toISOString()}, ${entry.primary}, ${entry.detail}, ${entry.intensity}, ${entry.progress}, ${entry.confidence})
    ON CONFLICT (entry_id) DO NOTHING
  `
  await sql`
    DELETE FROM emotion_entries WHERE device_id = ${deviceId} AND entry_id NOT IN (
      SELECT entry_id FROM emotion_entries WHERE device_id = ${deviceId} ORDER BY at DESC LIMIT 180
    )
  `
}

export async function clearEmotionEntries(deviceId: string): Promise<void> {
  await sql`DELETE FROM emotion_entries WHERE device_id = ${deviceId}`
}

/** Planes de "Desglosar una tarea": se guardan como JSON completo porque el cliente siempre los envía enteros. */
export async function listTaskPlans(deviceId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await sql`
    SELECT data FROM task_plans WHERE device_id = ${deviceId}
    ORDER BY updated_at ASC LIMIT 30
  `
  return rows.map((row) => row.data)
}

export async function upsertTaskPlan(deviceId: string, planId: string, data: Record<string, unknown>): Promise<void> {
  await sql`
    INSERT INTO task_plans (plan_id, device_id, data, updated_at)
    VALUES (${planId}, ${deviceId}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (plan_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    WHERE task_plans.device_id = EXCLUDED.device_id
  `
  await sql`
    DELETE FROM task_plans WHERE device_id = ${deviceId} AND plan_id NOT IN (
      SELECT plan_id FROM task_plans WHERE device_id = ${deviceId} ORDER BY updated_at DESC LIMIT 30
    )
  `
}

export async function deleteTaskPlans(deviceId: string, planId?: string): Promise<void> {
  if (planId) await sql`DELETE FROM task_plans WHERE device_id = ${deviceId} AND plan_id = ${planId}`
  else await sql`DELETE FROM task_plans WHERE device_id = ${deviceId}`
}

export type StoredHabitDay = { date: string; completed: string[] }

export async function listHabitDays(deviceId: string): Promise<StoredHabitDay[]> {
  const { rows } = await sql`
    SELECT day, completed FROM habit_days
    WHERE device_id = ${deviceId}
    ORDER BY day ASC LIMIT 60
  `
  return rows.map((row) => ({
    date: new Date(row.day).toISOString().slice(0, 10),
    completed: Array.isArray(row.completed) ? row.completed.filter((id) => typeof id === 'string') : [],
  }))
}

export async function upsertHabitDay(deviceId: string, day: StoredHabitDay): Promise<void> {
  await sql`
    INSERT INTO habit_days (device_id, day, completed, updated_at)
    VALUES (${deviceId}, ${day.date}, ${JSON.stringify(day.completed)}::jsonb, now())
    ON CONFLICT (device_id, day) DO UPDATE SET completed = EXCLUDED.completed, updated_at = now()
  `
  await sql`
    DELETE FROM habit_days WHERE device_id = ${deviceId} AND day NOT IN (
      SELECT day FROM habit_days WHERE device_id = ${deviceId} ORDER BY day DESC LIMIT 60
    )
  `
}

const taskEmotions = new Set(['alegría', 'calma', 'alivio', 'esperanza', 'tristeza', 'ansiedad', 'miedo', 'enojo', 'frustración', 'culpa', 'soledad', 'cansancio', 'confusión', 'agobio', 'neutral'])

/** Valida y recorta un plan recibido del cliente; devuelve null si no tiene la forma esperada. */
export function sanitizeTaskPlan(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  const plan = value as Record<string, unknown>
  if (typeof plan.id !== 'string' || typeof plan.title !== 'string' || typeof plan.createdAt !== 'number' || typeof plan.updatedAt !== 'number' || !Array.isArray(plan.steps)) return null
  const steps = plan.steps.slice(0, 12).flatMap((item) => {
    const step = item as Record<string, unknown>
    if (!step || typeof step.id !== 'string' || typeof step.text !== 'string') return []
    return [{
      id: step.id.slice(0, 80),
      text: step.text.slice(0, 200),
      minutes: typeof step.minutes === 'number' ? Math.min(240, Math.max(1, Math.round(step.minutes))) : undefined,
      done: step.done === true,
      doneAt: typeof step.doneAt === 'number' ? step.doneAt : undefined,
    }]
  })
  return {
    id: plan.id.slice(0, 80),
    title: plan.title.slice(0, 240),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    completedAt: typeof plan.completedAt === 'number' ? plan.completedAt : undefined,
    energy: plan.energy === 'poca' || plan.energy === 'bastante' ? plan.energy : 'media',
    source: ['manual', 'ia', 'local', 'chat'].includes(plan.source as string) ? plan.source : 'manual',
    feelingBefore: taskEmotions.has(plan.feelingBefore as string) ? plan.feelingBefore : undefined,
    feelingAfter: taskEmotions.has(plan.feelingAfter as string) ? plan.feelingAfter : undefined,
    steps,
  }
}
