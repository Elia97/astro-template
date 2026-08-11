import { postGenAction } from './post-gen.mjs'

function pathSegments(plop, value) {
  const dash = plop.getHelper('dashCase')
  return String(value)
    .split('/')
    .map((segment) => dash(segment.trim()))
    .filter(Boolean)
}

export default function pageGenerator(plop) {
  const root = process.cwd()
  const tpl = 'scripts/templates/page'
  plop.setGenerator('page', {
    description: 'New Astro page (static, or dynamic [slug] with getStaticPaths)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Page path (e.g. about-us, or nested like legal/privacy):',
        // change-case strips punctuation, so '...' is non-empty yet dash-cases to ''.
        validate: (value) =>
          pathSegments(plop, value).length > 0 || 'Page path must contain at least one letter or digit',
      },
      {
        type: 'confirm',
        name: 'dynamic',
        message: 'Dynamic [slug] route with getStaticPaths?',
        default: false,
      },
    ],
    actions: (answers) => {
      const segments = pathSegments(plop, answers.name)
      const pagePath = segments.join('/')
      answers.pagePath = pagePath
      answers.pageTitle = plop.getHelper('sentenceCase')(segments.at(-1))
      return [
        {
          type: 'add',
          path: answers.dynamic ? `src/pages/${pagePath}/[slug].astro` : `src/pages/${pagePath}.astro`,
          templateFile: answers.dynamic ? `${tpl}/dynamic.astro.hbs` : `${tpl}/static.astro.hbs`,
        },
        postGenAction(root),
      ]
    },
  })
}
