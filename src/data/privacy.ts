/**
 * Datos del aviso de privacidad de KAHY (el texto completo está en
 * src/components/PrivacyNotice.tsx).
 *
 * PRIVACY_VERSION es la fecha de la versión vigente: cada cuenta guarda cuál
 * aceptó y cuándo (prueba del consentimiento expreso). Si cambian las
 * finalidades o los datos que se recaban, se cambia la fecha y se vuelve a
 * pedir el consentimiento.
 *
 * PRIVACY_CONTACT: quién es responsable de los datos y dónde se le contacta
 * (art. 15, fracción I de la LFPDPPP). Si algún campo se deja vacío, el
 * aviso lo marca como pendiente en lugar de inventar un dato.
 */

export const PRIVACY_VERSION = "2026-10-24";
export const PRIVACY_VERSION_LABEL = "24 de octubre de 2026";

export const PRIVACY_CONTACT = {
  /** Persona, equipo o institución responsable del tratamiento. */
  responsible: "",
  /** Domicilio para oír y recibir notificaciones (puede ser el de la institución). */
  address: "",
  /** Correo donde se atienden las solicitudes de privacidad (derechos ARCO y revocación). */
  email: "",
};

/** Enlace (con #) que abre el aviso desde cualquier pantalla de la app. */
export const PRIVACY_HASH = "#aviso-de-privacidad";
