import { sql } from '@vercel/postgres'

/**
 * Shared Postgres helpers for KAHY's persistence layer (Vercel Postgres / Neon).
 * Lives under api/_lib alongside kahyAi.ts for the same reason: Vercel's
 * function bundler only reliably traces imports that stay inside api/, so
 * this file has zero imports outside npm packages — see kahyAi.ts's header
 * comment for the full story on why that boundary matters here.
 *
 * There is no real login system: every table is keyed by an anonymous
 * `device_id` generated and stored client-side (src/lib/deviceId.ts), not by
 * a user account. Tables have no foreign keys on purpose — "explorar sin
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
  ]).then(() => {
    // Index creation kept separate from CREATE TABLE for older Postgres compatibility.
    return Promise.all([
      sql`CREATE INDEX IF NOT EXISTS idx_screening_device ON screening_results(device_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_memory_device ON chat_memory(device_id)`,
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

/** Used by "borrar perfil guardado en este dispositivo" — a real delete, not just orphaning the row, since the deviceId itself isn't reset. */
export async function deleteAllDataForDevice(deviceId: string): Promise<void> {
  await Promise.all([
    sql`DELETE FROM profiles WHERE device_id = ${deviceId}`,
    sql`DELETE FROM screening_results WHERE device_id = ${deviceId}`,
    sql`DELETE FROM chat_memory WHERE device_id = ${deviceId}`,
    sql`DELETE FROM pet_garden WHERE device_id = ${deviceId}`,
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
  }
}

export async function upsertPetGarden(deviceId: string, state: StoredPetGarden): Promise<void> {
  await sql`
    INSERT INTO pet_garden (device_id, happiness, bond, progress, care_counts, last_care)
    VALUES (${deviceId}, ${state.happiness}, ${state.bond}, ${state.progress}, ${JSON.stringify(state.careCounts)}::jsonb, ${new Date(state.lastCare).toISOString()})
    ON CONFLICT (device_id) DO UPDATE SET
      happiness = EXCLUDED.happiness,
      bond = EXCLUDED.bond,
      progress = EXCLUDED.progress,
      care_counts = EXCLUDED.care_counts,
      last_care = EXCLUDED.last_care
  `
}
