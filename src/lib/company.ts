// Company registry data: feeds the homepage JSON-LD Organization schema and
// the legal pages ("titolare del trattamento", VAT number, …). Placeholder
// values — replace per project alongside src/lib/site.ts.
export const COMPANY = {
  legalName: '<LEGAL_NAME>',
  phone: '+39 000 0000000',
  email: 'info@example.com',
  address: {
    streetAddress: '<STREET>',
    postalCode: '00000',
    addressLocality: '<CITY>',
    addressRegion: '<PROVINCE>',
    addressCountry: 'IT',
  },
  vatNumber: '<VAT_NUMBER>',
} as const
