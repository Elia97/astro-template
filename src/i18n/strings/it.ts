// Default-locale UI strings — the source of truth for the `UIKey` union.
// Additional locales provide every key (`Record<UIKey, string>` in
// ./strings/<locale>.ts — the compiler enforces completeness). Keys group by
// surface: `a11y.*` assistive labels, `nav.*` chrome navigation, `legal.*`
// legal links, `footer.*` footer copy.
export const it = {
  'a11y.skipToContent': 'Salta al contenuto',
  'a11y.primaryNav': 'Navigazione principale',
  'a11y.toggleTheme': 'Cambia tema',
  'a11y.legalNav': 'Link legali',

  'nav.home': 'Home',
  'nav.cta': 'Call to action',

  'legal.privacy': 'Privacy',
  'legal.cookies': 'Cookie Policy',

  'footer.legalHeading': 'Legale',
  'footer.allRightsReserved': 'Tutti i diritti riservati.',
} as const

export type UIKey = keyof typeof it
