/**
 * Correos de KAHY (por ahora solo los de recuperar contraseña), enviados con
 * la API HTTP de Resend: no hace falta instalar nada, basta un `fetch`.
 * Igual que el resto de api/_lib, no importa nada fuera de api/.
 *
 * Variables de entorno (en Vercel → Settings → Environment Variables):
 * - RESEND_API_KEY: llave de la cuenta de Resend. Sin ella, la recuperación
 *   por correo responde que no está disponible (nunca finge que envió algo).
 * - MAIL_FROM: remitente, p. ej. "KAHY <hola@tu-dominio.mx>". Debe ser de un
 *   dominio verificado en Resend. Sin dominio propio, el de pruebas
 *   ("KAHY <onboarding@resend.dev>") solo entrega al correo dueño de la
 *   cuenta de Resend: sirve para probar, no para usuarios reales.
 * - APP_URL: dirección pública de la app para armar los enlaces, p. ej.
 *   https://kahy-desarrollo.vercel.app. Nunca se toma del encabezado Host de
 *   la petición: alguien podría falsificarlo para que el enlace apunte a otro
 *   sitio y robar el token.
 */

export type Mail = { to: string; subject: string; html: string; text: string }
export type MailTransport = (mail: Mail) => Promise<void>

const DEFAULT_FROM = 'KAHY <onboarding@resend.dev>'

const resendTransport: MailTransport = async (mail) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || DEFAULT_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  })
  if (!response.ok) throw new Error(`Resend respondió ${response.status}: ${(await response.text().catch(() => '')).slice(0, 300)}`)
}

let transport: MailTransport | null = null

/** Solo para pruebas: reemplaza el envío real por uno falso (null vuelve a Resend). */
export function setMailTransport(next: MailTransport | null) {
  transport = next
}

export function mailConfigured(): boolean {
  return Boolean(transport || process.env.RESEND_API_KEY)
}

export function sendMail(mail: Mail): Promise<void> {
  return (transport || resendTransport)(mail)
}

/**
 * Dirección pública de la app: APP_URL si existe; si no, la que Vercel da a la
 * rama o a producción (variables del sistema, que nadie de fuera puede cambiar).
 */
export function appUrl(): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  const vercelHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return vercelHost ? `https://${vercelHost}` : 'http://localhost:8443'
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)
}

/** Correo con el enlace para elegir una contraseña nueva. No incluye ningún dato de la persona más que su correo. */
export function resetPasswordMail(to: string, link: string, minutes: number): Mail {
  const safeLink = escapeHtml(link)
  return {
    to,
    subject: 'Restablece tu contraseña de KAHY',
    text: [
      'Hola:',
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta de KAHY.',
      `Abre este enlace para elegir una nueva (vence en ${minutes} minutos y solo funciona una vez):`,
      link,
      '',
      'Si no fuiste tú, ignora este correo: tu contraseña no cambia.',
      'KAHY nunca te pedirá tu contraseña por correo ni dentro del chat.',
    ].join('\n'),
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f6f1ff;font-family:Segoe UI,Arial,sans-serif;color:#3c2864">
  <div style="max-width:520px;margin:0 auto;background:#fffefb;border-radius:20px;padding:28px">
    <p style="margin:0 0 6px;font-weight:700;letter-spacing:.08em;font-size:12px;color:#7a5aa6">KAHY</p>
    <h1 style="margin:0 0 14px;font-size:22px">Restablece tu contraseña</h1>
    <p style="margin:0 0 18px;line-height:1.5">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Toca el botón para elegir una nueva.</p>
    <p style="margin:0 0 18px"><a href="${safeLink}" style="display:inline-block;background:#684d72;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Elegir una contraseña nueva</a></p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#5d5a66">El enlace vence en ${minutes} minutos y solo funciona una vez. Si el botón no abre, copia esta dirección en tu navegador:</p>
    <p style="margin:0 0 18px;font-size:13px;word-break:break-all"><a href="${safeLink}" style="color:#684d72">${safeLink}</a></p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#5d5a66">Si no fuiste tú, ignora este correo: tu contraseña no cambia. KAHY nunca te pedirá tu contraseña por correo ni dentro del chat.</p>
  </div>
</body></html>`,
  }
}

/** Aviso de que la contraseña cambió: si no fue la persona, sabe que debe actuar. */
export function passwordChangedMail(to: string): Mail {
  return {
    to,
    subject: 'Tu contraseña de KAHY cambió',
    text: 'Hola:\n\nLa contraseña de tu cuenta de KAHY acaba de cambiar y se cerró la sesión en tus otros dispositivos.\nSi no fuiste tú, pide un nuevo enlace desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.',
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f6f1ff;font-family:Segoe UI,Arial,sans-serif;color:#3c2864">
  <div style="max-width:520px;margin:0 auto;background:#fffefb;border-radius:20px;padding:28px">
    <p style="margin:0 0 6px;font-weight:700;letter-spacing:.08em;font-size:12px;color:#7a5aa6">KAHY</p>
    <h1 style="margin:0 0 14px;font-size:22px">Tu contraseña cambió</h1>
    <p style="margin:0 0 12px;line-height:1.5">La contraseña de tu cuenta acaba de cambiar y se cerró la sesión en tus otros dispositivos.</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#5d5a66">Si no fuiste tú, pide un nuevo enlace desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.</p>
  </div>
</body></html>`,
  }
}
