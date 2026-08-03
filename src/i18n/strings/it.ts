// Default-locale UI strings — the source of truth for the `UIKey` union.
// Additional locales provide every key (`Record<UIKey, string>` in
// ./strings/<locale>.ts — the compiler enforces completeness). Keys group by
// surface: `a11y.*` assistive labels, `nav.*` chrome navigation, `legal.*`
// legal links, `footer.*` footer copy.
export const it = {
  'a11y.skipToContent': 'Salta al contenuto',
  'a11y.primaryNav': 'Navigazione principale',
  'a11y.toggleTheme': 'Cambia tema',
  'a11y.openMenu': 'Apri menu',
  'a11y.closeMenu': 'Chiudi menu',
  'a11y.legalNav': 'Link legali',

  'nav.home': 'Home',
  'nav.contact': 'Contatti',
  'nav.cta': 'Contattaci',

  'legal.privacy': 'Privacy',
  'legal.cookies': 'Cookie Policy',
  'legal.terms': 'Termini e Condizioni',
  'legal.cookiePreferences': 'Preferenze cookie',

  'error.404title': 'Pagina non trovata',
  'error.404description': 'La pagina che cerchi non esiste o è stata spostata.',
  'error.500title': 'Errore del server',
  'error.500description': 'Si è verificato un problema imprevisto. Riprova tra poco.',
  'error.backHome': 'Torna alla home',

  'contact.pageTitle': 'Contatti',
  'contact.pageDescription': 'Raccontaci il tuo progetto: ti rispondiamo al più presto.',
  'contact.formTitle': 'Richiesta informazioni',
  'contact.formIntro': 'Compila il form e ti ricontatteremo al più presto.',
  'contact.firstName': 'Nome',
  'contact.lastName': 'Cognome',
  'contact.email': 'Email',
  'contact.message': 'Messaggio',
  'contact.consent': 'Acconsento al trattamento dei miei dati personali secondo la',
  'contact.privacyPolicy': 'Privacy Policy',
  'contact.submit': 'Invia richiesta',
  'contact.sending': 'Invio…',
  'contact.success': 'Richiesta inviata. Ti ricontatteremo a breve.',
  'contact.error': 'Invio non riuscito. Riprova tra poco.',
  'contact.genericFieldError': 'Controlla i dati inseriti.',

  // Validation messages: emitted by the Zod schemas (src/lib/forms/form-fields.ts)
  // and printed raw into each field's error slot. They read as instructions, not
  // as diagnostics — the user is being told what to do, not what went wrong.
  'forms.error.firstNameRequired': 'Inserisci il tuo nome.',
  'forms.error.firstNameTooLong': 'Il nome è troppo lungo (massimo 100 caratteri).',
  'forms.error.lastNameRequired': 'Inserisci il tuo cognome.',
  'forms.error.lastNameTooLong': 'Il cognome è troppo lungo (massimo 100 caratteri).',
  'forms.error.emailInvalid': 'Inserisci un indirizzo email valido.',
  'forms.error.emailTooLong': 'L’indirizzo email è troppo lungo (massimo 254 caratteri).',
  'forms.error.messageTooLong': 'Il messaggio è troppo lungo (massimo 2000 caratteri).',
  'forms.error.consentRequired': 'Devi acconsentire al trattamento dei dati per inviare la richiesta.',

  'footer.legalHeading': 'Legale',
  'footer.allRightsReserved': 'Tutti i diritti riservati.',
} as const

export type UIKey = keyof typeof it
