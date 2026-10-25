import { PRIVACY_CONTACT, PRIVACY_VERSION, PRIVACY_VERSION_LABEL } from "../data/privacy";

/**
 * Aviso de privacidad integral de KAHY, con los elementos del art. 15 de la
 * Ley Federal de Protección de Datos Personales en Posesión de los
 * Particulares (DOF 20 mar 2025): responsable, datos (señalando los
 * sensibles), finalidades, cómo limitar su uso, derechos ARCO y cómo se
 * avisan los cambios. Describe lo que la app hace hoy; si cambia lo que se
 * guarda o para qué, hay que actualizar este texto y PRIVACY_VERSION.
 */

/** Dato del responsable; si falta, se marca como pendiente en vez de inventarlo. */
function Contact({ value, label }: { value: string; label: string }) {
  return value ? <strong>{value}</strong> : <mark className="privacy-pending">[{label}: pendiente de completar]</mark>;
}

export function PrivacyContactEmail() {
  return PRIVACY_CONTACT.email
    ? <a href={`mailto:${PRIVACY_CONTACT.email}`}>{PRIVACY_CONTACT.email}</a>
    : <mark className="privacy-pending">[correo de privacidad: pendiente de completar]</mark>;
}

/** Versión corta, para mostrar donde se piden los datos (al crear la cuenta). */
export function PrivacySummary() {
  return (
    <p>
      KAHY{PRIVACY_CONTACT.responsible ? `, a cargo de ${PRIVACY_CONTACT.responsible},` : ""} usará tu correo, tu perfil y tu avance, incluidos <strong>datos sensibles sobre tu salud emocional</strong> (resultados de tamizaje y etiquetas del calendario emocional), para crear tu cuenta, respaldar tu avance y mostrártelo. No los vendemos ni los usamos para publicidad. Sin cuenta, todo se queda solo en tu dispositivo.
    </p>
  );
}

export default function PrivacyNotice() {
  return (
    <div className="privacy-notice">
      <p className="privacy-meta">Última actualización: {PRIVACY_VERSION_LABEL} · versión {PRIVACY_VERSION}</p>
      <p>KAHY es un prototipo de bienestar emocional en desarrollo. Este aviso explica, con la forma en que la app funciona hoy, qué datos usamos, para qué, con quién y cómo puedes decidir sobre ellos.</p>

      <h3>1. Quién es responsable de tus datos</h3>
      <p>Responsable: <Contact value={PRIVACY_CONTACT.responsible} label="nombre del responsable" />. Domicilio: <Contact value={PRIVACY_CONTACT.address} label="domicilio" />. Correo de privacidad: <PrivacyContactEmail />.</p>

      <h3>2. Qué datos usamos y dónde se guardan</h3>
      <p><strong>Si usas KAHY sin cuenta</strong>, todo lo que haces se guarda solo en tu navegador, en tu dispositivo. KAHY no lo recibe en su servidor (la única excepción es el texto que escribes en el chat, ver el punto 5).</p>
      <p><strong>Si creas una cuenta</strong>, guardamos en nuestro servidor:</p>
      <ul>
        <li><strong>Para entrar a tu cuenta:</strong> tu correo electrónico y tu contraseña, que solo se guarda como una huella cifrada (scrypt) que nadie puede leer. De tus sesiones solo guardamos una huella del código de acceso.</li>
        <li><strong>Tu perfil:</strong> el apodo que elijas (puede ser inventado), la zona de Michoacán que elijas (no usamos tu ubicación ni GPS), tu acompañante, las metas que eliges y tus preferencias de la app y de accesibilidad.</li>
        <li><strong>Tu avance:</strong> los hábitos que marcas cada día, tus tareas y sus pasos, el avance de tu compañero y, solo si activas "Recordar temas de mis conversaciones", el tema general de cada conversación (por ejemplo, "estrés"), nunca el texto.</li>
        <li><strong>Datos sensibles, relacionados con tu salud emocional:</strong> los resultados de los cuestionarios de tamizaje (PHQ-9, GAD-7, ASRS y PCL-5: respuestas, puntaje y banda) y las etiquetas del calendario emocional (emoción detectada, intensidad y fecha, nunca el texto que escribiste).</li>
      </ul>
      <p>Para la mayoría de edad solo confirmamos que tienes 18 años o más; no guardamos tu edad. No pedimos tu nombre completo, teléfono, domicilio, CURP ni documentos. El texto de tus conversaciones del chat no se guarda en nuestro servidor; el historial completo, si lo activas, vive solo en tu navegador.</p>
      <p><strong>Solo en tu dispositivo</strong> (con o sin cuenta, nunca se envía a nuestro servidor) se guarda lo del ejercicio "Lo que le dirías a alguien que quieres", con Moka: los días en que practicaste, el tema general de lo que contaste en el chat para poder practicarlo con ella (por ejemplo, "escuela", nunca el texto) y las frases que tú decidas guardar. Lo que escribes en ese ejercicio no se envía a ningún lado. Lo único que sí llega a tu cuenta es el crecimiento de tu compañero por haber practicado, como parte de su avance.</p>

      <h3>3. Para qué los usamos</h3>
      <p>Finalidades necesarias para el servicio:</p>
      <ul>
        <li>Crear tu cuenta, reconocerte al iniciar sesión y protegerla (por ejemplo, limitando intentos).</li>
        <li>Respaldar tu perfil y tu avance para que no se pierdan y puedas recuperarlos desde otro dispositivo.</li>
        <li>Mostrarte tu historial: tamizajes, calendario emocional, hábitos, tareas y compañero.</li>
        <li>Adaptar sugerencias y el tono de las respuestas a tu avance, solo si "Personalización conectada" está activada.</li>
        <li>Enviarte los correos necesarios para tu cuenta, como el enlace para restablecer tu contraseña y el aviso de que cambió.</li>
      </ul>
      <p><strong>No hay finalidades secundarias:</strong> no vendemos ni rentamos tus datos, no los usamos para publicidad ni para perfiles comerciales y no te enviamos correos promocionales. Los tamizajes son autorreporte: no diagnostican y no se usan para tomar decisiones automáticas sobre ti.</p>

      <h3>4. Tu consentimiento para los datos sensibles</h3>
      <p>Al crear tu cuenta te pedimos tu consentimiento expreso para tratar los datos sensibles del punto 2 con las finalidades del punto 3, y guardamos la fecha y la versión de este aviso que aceptaste. Sin ese consentimiento no se crea la cuenta, pero puedes seguir usando KAHY sin cuenta: lo que hagas se queda solo en tu dispositivo.</p>

      <h3>5. Proveedores que tratan datos por nuestra cuenta</h3>
      <p>Para que KAHY funcione usamos estos proveedores, que tratan datos solo para prestarnos su servicio. Sus servidores pueden estar fuera de México, principalmente en Estados Unidos:</p>
      <ul>
        <li><strong>Vercel Inc.:</strong> aloja la app y el servidor.</li>
        <li><strong>Base de datos Postgres (Neon, a través de Vercel):</strong> guarda los datos de las cuentas.</li>
        <li><strong>Groq, Inc.:</strong> procesa el texto de tus mensajes del chat para generar la respuesta de la IA. Te recomendamos no escribir en el chat datos que te identifiquen, como tu nombre completo, teléfono o domicilio. Si la IA no está disponible, responde un modo local dentro de tu navegador.</li>
        <li><strong>Resend:</strong> envía los correos de tu cuenta; solo recibe tu correo electrónico y el contenido del mensaje.</li>
      </ul>
      <p>No transferimos tus datos a terceros para que los usen con sus propios fines. Solo los entregaríamos a una autoridad competente cuando la ley lo exija.</p>

      <h3>6. Cómo limitar el uso de tus datos</h3>
      <p>En Perfil puedes desactivar "Recordar temas de mis conversaciones", "Personalización conectada" y "Guardar mis conversaciones", y borrar tu historial de tamizaje, tu calendario emocional, tus temas guardados y lo que guardó el ejercicio con Moka. También puedes usar KAHY sin cuenta.</p>

      <h3>7. Tus derechos ARCO y cómo ejercerlos</h3>
      <p>Tienes derecho a <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong> si son inexactos, <strong>cancelarlos</strong> y <strong>oponerte</strong> a su uso.</p>
      <ul>
        <li><strong>Desde la app:</strong> en Perfil puedes ver y corregir tu perfil y tus preferencias, y con "Eliminar mi cuenta y mis datos" se borran tu cuenta y todos sus datos de nuestro servidor.</li>
        <li><strong>Por correo</strong>, a <PrivacyContactEmail />: escríbenos desde el correo de tu cuenta (así verificamos que eres tú) e indica qué derecho quieres ejercer y sobre qué datos. Si quieres una copia de tus datos, pídela así.</li>
      </ul>
      <p>Te respondemos en un máximo de 20 días hábiles y, si procede, lo hacemos efectivo dentro de los 15 días hábiles siguientes. Cada plazo puede ampliarse una sola vez por un periodo igual si hay causa justificada, y te lo diríamos.</p>

      <h3>8. Cómo revocar tu consentimiento</h3>
      <p>Puedes revocarlo cuando quieras eliminando tu cuenta desde Perfil o escribiendo al correo de privacidad. A partir de ese momento dejamos de respaldar tu avance en el servidor y borramos lo guardado.</p>

      <h3>9. Cuánto tiempo los guardamos</h3>
      <p>Mientras tengas tu cuenta. Al eliminarla se borran de nuestra base de datos tu cuenta, tus sesiones y todos los datos asociados. Las sesiones vencen a los 30 días y los enlaces para restablecer la contraseña vencen a los 30 minutos y sirven una sola vez.</p>

      <h3>10. Seguridad</h3>
      <p>La conexión con KAHY va cifrada (HTTPS), las contraseñas y los códigos de sesión se guardan solo como huellas cifradas y tus datos solo se pueden leer con tu sesión. Ningún sistema es infalible: si ocurriera una vulneración que afecte de forma significativa tus derechos, te avisaríamos para que puedas protegerte.</p>

      <h3>11. Cookies y almacenamiento del navegador</h3>
      <p>No usamos cookies de rastreo, publicidad ni analítica. Usamos el almacenamiento de tu navegador solo para que la app funcione: tu sesión, tus preferencias, tu avance, lo del ejercicio con Moka y, si lo activas, el historial del chat. Puedes borrarlo desde Perfil o desde la configuración de tu navegador.</p>

      <h3>12. Personas menores de edad</h3>
      <p>KAHY está pensado para personas de 18 años o más. Si eres menor de edad, por favor no crees una cuenta.</p>

      <h3>13. Cambios a este aviso</h3>
      <p>Si este aviso cambia, publicaremos la nueva versión en esta misma sección con su fecha. Si cambian las finalidades o los datos sensibles que tratamos, te pediremos de nuevo tu consentimiento antes de seguir respaldando tus datos.</p>

      <h3>14. Autoridad</h3>
      <p>Si consideras que se vulneró tu derecho a la protección de tus datos personales, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, autoridad en la materia conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
    </div>
  );
}
