// Reader for a GTM container's public gtm.js. Data in, data out: the fetch, the report
// and the exit code stay in scripts/verify-analytics-coverage.mjs.

// Only the fields this reader touches, all optional and all `unknown`: third-party
// JSON, so every value still has to be narrowed at the point of use.
export type Macro = { function?: unknown; vtp_name?: unknown }

export type Tag = { function?: unknown; vtp_eventName?: unknown; vtp_tagId?: unknown }

export type Predicate = { function?: unknown; arg0?: unknown; arg1?: unknown }

export type ContainerResource = {
  macros: Macro[]
  tags: Tag[]
  predicates: Predicate[]
  rules: unknown[][]
}

/** One GA4 event tag and the conditions that fire it. `unsupported` carries what this
 *  reader cannot interpret, so a partly skipped trigger is never reported understood. */
export type Trigger = {
  eventName: string
  firesOn: string[]
  selectors: string[]
  urlContains: string[]
  unsupported: string[]
}

type Clause = { op: unknown; args: unknown[] }

// GA4 event tag. The Google tag itself (`__googtag`) configures the property and
// fires on initialization — it tracks no surface, so it is not a trigger here.
const GA4_EVENT_TAG = '__gaawe'

// GTM's own bookkeeping: every native listener writes the trigger ids it fired
// for, and the tag re-reads them with a `_re`. Nothing to check on our side.
const INTERNAL_VARIABLE = 'gtm.triggers'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const records = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter(isRecord) : [])

const arrays = (value: unknown): unknown[][] => (Array.isArray(value) ? value.filter(Array.isArray) : [])

function matchingBrace(source: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) return index + 1
  }
  throw new Error('the container literal never closes — truncated download?')
}

/** The container ships as one JS file holding a single `var data = {…}` literal, and
 *  only string-aware brace matching isolates it: string values carry braces. */
export function parseContainerData(source: string): ContainerResource {
  const marker = source.indexOf('var data = {')
  if (marker === -1) throw new Error('no `var data = {` in the container — the reader is broken, not the container')

  const start = source.indexOf('{', marker)
  // The slice starts at a `{`, so JSON.parse either throws or hands back an object.
  const parsed = JSON.parse(source.slice(start, matchingBrace(source, start))) as { resource?: unknown }
  if (!isRecord(parsed.resource)) throw new Error('the container literal carries no `resource` — the reader is broken')

  const resource: { macros?: unknown; tags?: unknown; predicates?: unknown; rules?: unknown } = parsed.resource
  return {
    macros: records(resource.macros),
    tags: records(resource.tags),
    predicates: records(resource.predicates),
    rules: arrays(resource.rules),
  }
}

/** The container id as production serves it, inlined with `define:vars`. Public by
 *  construction, and the only answer to "which container runs on this host". */
export function extractGtmId(html: string): string {
  const at = html.indexOf('__rsAnalyticsConfig')
  const block = at === -1 ? '' : html.slice(Math.max(0, html.lastIndexOf('<script', at)), at)
  const id = /gtmId\s*=\s*"([^"]+)"/.exec(block)?.[1]
  if (id === undefined) throw new Error('no GTM id in the served markup — tracking is off on this host')
  return id
}

/** The GA4 properties the container configures. Without one every event tag fires
 *  into nothing, so an empty list is a failure, not a note. */
export function googleTagIds(container: ContainerResource): string[] {
  const ids = container.tags.filter((tag) => tag.function === '__googtag').map((tag) => tag.vtp_tagId)
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))]
}

const macroIndex = (arg: unknown): number | null => {
  if (!Array.isArray(arg) || arg[0] !== 'macro') return null
  const index: unknown = arg[1]
  return typeof index === 'number' ? index : null
}

/** What a predicate reads: `event` for the dataLayer event name (`__e`), otherwise
 *  the variable's own name (`gtm.element`, `gtm.elementUrl`, `gtm.triggers`). */
function macroKind(macros: Macro[], index: number | null): string | null {
  const macro = index === null ? undefined : macros[index]
  if (macro === undefined) return null
  if (macro.function === '__e') return 'event'
  const name = macro.vtp_name
  return typeof name === 'string' ? name : null
}

function applyPredicate(trigger: Trigger, container: ContainerResource, index: unknown): void {
  const predicate = typeof index === 'number' ? container.predicates[index] : undefined
  if (predicate === undefined) {
    trigger.unsupported.push(`predicate #${String(index)} does not exist`)
    return
  }

  const fn = predicate.function
  const kind = macroKind(container.macros, macroIndex(predicate.arg0))
  const value = predicate.arg1
  if (kind === INTERNAL_VARIABLE) return

  const label = `${String(fn)} on ${kind ?? 'an unreadable variable'}`
  if (fn === '_eq' && kind === 'event' && typeof value === 'string') trigger.firesOn.push(value)
  else if (fn === '_css' && kind === 'gtm.element' && typeof value === 'string') trigger.selectors.push(value)
  else if (fn === '_cn' && kind === 'gtm.elementUrl' && typeof value === 'string') trigger.urlContains.push(value)
  else trigger.unsupported.push(`${label} = ${JSON.stringify(value)}`)
}

const clausesOf = (rule: unknown[]): Clause[] =>
  rule.filter(Array.isArray).map((clause) => ({ op: clause[0], args: clause.slice(1) }))

const targets = (clauses: Clause[], op: string, tag: number): boolean =>
  clauses.some((clause) => clause.op === op && clause.args.includes(tag))

function conditionsOf(clauses: Clause[], container: ContainerResource, trigger: Trigger): void {
  for (const clause of clauses) {
    if (clause.op === 'add' || clause.op === 'block') continue
    // `unless` negates its predicates; reading them as requirements would invert
    // the meaning of the trigger, so the whole clause is declared unreadable.
    if (clause.op !== 'if') {
      trigger.unsupported.push(`\`${String(clause.op)}\` clause`)
      continue
    }
    for (const index of clause.args) applyPredicate(trigger, container, index)
  }
}

/** GTM keeps tags and conditions apart: a rule lists clauses, `if`/`unless` naming
 *  predicates and `add`/`block` naming tags. One trigger per rule that adds the tag. */
export function extractTriggers(container: ContainerResource): Trigger[] {
  const triggers: Trigger[] = []

  for (const [tag, definition] of container.tags.entries()) {
    if (definition.function !== GA4_EVENT_TAG) continue
    const name = definition.vtp_eventName
    const eventName = typeof name === 'string' ? name : `tag #${String(tag)}`
    const rules = container.rules.map(clausesOf)
    const blocked = rules.some((clauses) => targets(clauses, 'block', tag))

    for (const clauses of rules.filter((clauses) => targets(clauses, 'add', tag))) {
      const trigger: Trigger = { eventName, firesOn: [], selectors: [], urlContains: [], unsupported: [] }
      if (blocked) trigger.unsupported.push('a `block` rule targets this tag')
      conditionsOf(clauses, container, trigger)
      triggers.push(trigger)
    }
  }

  return triggers
}
