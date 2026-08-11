import collectionGenerator from './scripts/gen/collection.mjs'
import componentGenerator from './scripts/gen/component.mjs'
import pageGenerator from './scripts/gen/page.mjs'
import sectionGenerator from './scripts/gen/section.mjs'

export default function (plop) {
  sectionGenerator(plop)
  pageGenerator(plop)
  componentGenerator(plop)
  collectionGenerator(plop)
}
