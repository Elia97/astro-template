// Minimal stub of astro:content for unit tests — the real module is a virtual
// module that only exists inside the Astro runtime. Tests that need specific
// collection data replace this via vi.mock / vi.mocked.
export async function getCollection(): Promise<unknown[]> {
  return []
}
