import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { sql } from '@vercel/postgres'
import { ensureSchema } from './db.js'

/**
 * Cuentas reales para KAHY (correo + contraseña) sobre las mismas tablas de
 * datos que ya existían. Igual que db.ts y kahyAi.ts, vive dentro de api/
 * y no importa nada fuera de esta carpeta (ver el encabezado de kahyAi.ts).
 *
 * Modelo:
 * - `accounts.data_id` es el `device_id` bajo el que viven los datos de la
 *   cuenta. Al registrarse, la cuenta reclama el id anónimo que ese
 *   navegador ya usaba, así lo hecho antes de crear la cuenta se conserva.
 * - Una sesión es un token aleatorio que solo conoce el navegador; aquí se
 *   guarda únicamente su SHA-256, de modo que una copia de la base de datos
 *   no permite entrar a ninguna cuenta.
 * - Las contraseñas se guardan con scrypt y sal aleatoria, nunca en claro.
 * - Un id reclamado por una cuenta solo se puede leer o modificar con la
 *   sesión de esa cuenta (withDataAccess). Los ids anónimos siguen
 *   funcionando como antes para "explorar sin cuenta".
 */

const SESSION_DAYS = 30
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MIN_PASSWORD = 8
const MAX_PASSWORD = 128

type Result = { status: number; body: Record<string, unknown> }

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, 64, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split('$')
  if (scheme !== 'scrypt' || !saltText || !keyText) return false
  const expected = Buffer.from(keyText, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltText, 'base64'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Límite de intentos por proceso, igual de "mejor esfuerzo" que el del chat:
// en serverless se reinicia con cada instancia fría. Frena ráfagas de fuerza
// bruta contra una instancia, no sustituye un límite durable.
const attemptLog = new Map<string, number[]>()

function tooManyAttempts(key: string, limit: number, windowMs = 10 * 60_000): boolean {
  const now = Date.now()
  const recent = (attemptLog.get(key) || []).filter((time) => now - time < windowMs)
  if (recent.length >= limit) {
    attemptLog.set(key, recent)
    return true
  }
  recent.push(now)
  attemptLog.set(key, recent)
  return false
}

function cleanEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : ''
}

async function createSession(accountId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await sql`DELETE FROM sessions WHERE account_id = ${accountId} AND expires_at < now()`
  await sql`INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (${hashToken(token)}, ${accountId}, ${expiresAt})`
  return token
}

export function readBearer(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header
  if (!value) return null
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/.exec(value.trim())
  return match ? match[1] : null
}

type SessionAccount = { accountId: string; email: string; dataId: string }

async function findSession(token: string): Promise<SessionAccount | null> {
  const { rows } = await sql`
    SELECT a.account_id, a.email, a.data_id
    FROM sessions s JOIN accounts a ON a.account_id = s.account_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now()
    LIMIT 1
  `
  const row = rows[0]
  return row ? { accountId: row.account_id, email: row.email, dataId: row.data_id } : null
}

async function isClaimed(dataId: string): Promise<boolean> {
  const { rows } = await sql`SELECT 1 FROM accounts WHERE data_id = ${dataId} LIMIT 1`
  return rows.length > 0
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505'
}

export async function registerAccount(raw: Record<string, unknown>, clientId: string): Promise<Result> {
  const email = cleanEmail(raw.email)
  const password = typeof raw.password === 'string' ? raw.password : ''
  if (!EMAIL_PATTERN.test(email)) return { status: 400, body: { code: 'INVALID_EMAIL', error: 'Escribe un correo con formato válido.' } }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return { status: 400, body: { code: 'WEAK_PASSWORD', error: `La contraseña debe tener entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres.` } }
  }
  if (tooManyAttempts(`register:${clientId}`, 6)) return { status: 429, body: { code: 'RATE_LIMIT', error: 'Demasiados intentos. Espera unos minutos.' } }

  const existing = await sql`SELECT 1 FROM accounts WHERE email = ${email} LIMIT 1`
  if (existing.rows.length) return { status: 409, body: { code: 'EMAIL_TAKEN', error: 'Ya existe una cuenta con ese correo. Inicia sesión.' } }

  // La cuenta reclama el id anónimo de este navegador solo si tiene forma de UUID y nadie más lo reclamó.
  const requested = typeof raw.deviceId === 'string' ? raw.deviceId : ''
  let dataId = UUID_PATTERN.test(requested) && !(await isClaimed(requested)) ? requested : randomUUID()
  const accountId = randomUUID()
  const passwordHash = await hashPassword(password)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await sql`INSERT INTO accounts (account_id, email, password_hash, data_id) VALUES (${accountId}, ${email}, ${passwordHash}, ${dataId})`
      break
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const taken = await sql`SELECT 1 FROM accounts WHERE email = ${email} LIMIT 1`
      if (taken.rows.length) return { status: 409, body: { code: 'EMAIL_TAKEN', error: 'Ya existe una cuenta con ese correo. Inicia sesión.' } }
      if (attempt === 1) throw error
      dataId = randomUUID() // Otro registro reclamó ese id entre la comprobación y el INSERT.
    }
  }

  const token = await createSession(accountId)
  return { status: 201, body: { token, email, dataId } }
}

// Hash de relleno para que un correo inexistente tarde lo mismo que una contraseña incorrecta.
let dummyHash: Promise<string> | null = null

export async function loginAccount(raw: Record<string, unknown>, clientId: string): Promise<Result> {
  const email = cleanEmail(raw.email)
  const password = typeof raw.password === 'string' ? raw.password.slice(0, MAX_PASSWORD) : ''
  if (!email || !password) return { status: 400, body: { code: 'INVALID', error: 'Escribe tu correo y tu contraseña.' } }
  if (tooManyAttempts(`login:${clientId}:${email}`, 8)) return { status: 429, body: { code: 'RATE_LIMIT', error: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.' } }

  const { rows } = await sql`SELECT account_id, email, password_hash, data_id FROM accounts WHERE email = ${email} LIMIT 1`
  const account = rows[0]
  if (!dummyHash) dummyHash = hashPassword('kahy-relleno')
  const valid = await verifyPassword(password, account ? account.password_hash : await dummyHash)
  if (!account || !valid) return { status: 401, body: { code: 'INVALID_CREDENTIALS', error: 'El correo o la contraseña no coinciden.' } }

  const token = await createSession(account.account_id)
  return { status: 200, body: { token, email: account.email, dataId: account.data_id } }
}

export async function logoutSession(authorization: string | string[] | undefined): Promise<Result> {
  const token = readBearer(authorization)
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`
  return { status: 200, body: { ok: true } }
}

export async function currentAccount(authorization: string | string[] | undefined): Promise<Result> {
  const token = readBearer(authorization)
  const session = token ? await findSession(token) : null
  if (!session) return { status: 401, body: { code: 'SESSION_EXPIRED', error: 'La sesión terminó. Vuelve a iniciar sesión.' } }
  return { status: 200, body: { email: session.email, dataId: session.dataId } }
}

type AccessResult =
  | { ok: true; dataId: string | undefined }
  | { ok: false; status: 401 | 403; code: string; error: string }

/**
 * Decide bajo qué id puede operar una petición a /api/data/*:
 * - con sesión válida, siempre el id de la cuenta (se ignora el que envíe el cliente);
 * - con un token que ya no vale, 401 para que el cliente cierre la sesión;
 * - sin sesión, el id anónimo enviado, salvo que pertenezca a una cuenta (403).
 */
export async function resolveDataId(authorization: string | string[] | undefined, requestedId: string | undefined): Promise<AccessResult> {
  const hasAuthorization = Boolean(Array.isArray(authorization) ? authorization[0] : authorization)
  if (hasAuthorization) {
    const token = readBearer(authorization)
    const session = token ? await findSession(token) : null
    if (!session) return { ok: false, status: 401, code: 'SESSION_EXPIRED', error: 'La sesión terminó. Vuelve a iniciar sesión.' }
    return { ok: true, dataId: session.dataId }
  }
  if (requestedId && (await isClaimed(requestedId))) {
    return { ok: false, status: 403, code: 'LOGIN_REQUIRED', error: 'Estos datos pertenecen a una cuenta. Inicia sesión para verlos.' }
  }
  return { ok: true, dataId: requestedId }
}

export type DataRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}
export type DataResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

/**
 * Envuelve cada handler de /api/data/*. Aplica resolveDataId y reescribe el
 * deviceId de la petición con el id autorizado, de modo que los handlers
 * siguen leyendo `deviceId` como siempre y no necesitan saber de cuentas.
 */
export function withDataAccess(handler: (req: DataRequest, res: DataResponse) => unknown) {
  return async (req: DataRequest, res: DataResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      await ensureSchema()
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null
      const fromQuery = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      const requested = fromQuery || (typeof body?.deviceId === 'string' ? body.deviceId : undefined)
      const access = await resolveDataId(req.headers?.authorization, requested)
      if (!access.ok) return res.status(access.status).json({ code: access.code, error: access.error })
      if (access.dataId) {
        req.query.deviceId = access.dataId
        if (body) body.deviceId = access.dataId
      }
    } catch (error) {
      console.error('[KAHY DB]', error instanceof Error ? error.message : error)
      return res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
    }
    return handler(req, res)
  }
}
