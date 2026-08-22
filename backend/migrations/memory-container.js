// An in-memory stand-in for the Cosmos SDK's container, supporting only the query
// shapes the migrations actually use.
//
// It exists so migrations can be run against a copy of real data without writing
// anything: the dry run uses it to show what would change, and the snapshot
// generator uses it to preview what the anonymous snapshot will look like once
// pending migrations have been applied.
//
// It deliberately throws 404 on a missing delete, exactly as Cosmos does, so a
// migration that assumes a document is still there fails here instead of in
// production.

export function memoryContainer(documents) {
  const store = new Map(documents.map((doc) => [doc.id, structuredClone(doc)]));
  const operations = [];

  const matches = (doc, sql, parameters) => {
    const p = Object.fromEntries(parameters.map(({ name, value }) => [name, value]));

    // The migrations parameterise the type; the snapshot generator writes it as a
    // literal. Both shapes have to filter, or a preview silently returns everything.
    const literalType = sql.match(/c\.type = "([^"]+)"/);
    if (literalType && doc.type !== literalType[1]) return false;

    if (sql.includes('c.type = @type') && doc.type !== p['@type']) return false;
    if (sql.includes('c.id = @id') && doc.id !== p['@id']) return false;
    if (sql.includes('c.userId = @userId') && doc.userId !== p['@userId']) return false;
    if (sql.includes('c.active = true') && doc.active !== true) return false;
    if (sql.includes('NOT IS_DEFINED(c.daySlug)') && doc.daySlug !== undefined) return false;
    if (sql.includes('IS_DEFINED(c.sourceWorkoutDay)') && doc.sourceWorkoutDay === undefined) return false;
    if (sql.includes('NOT IS_DEFINED(c.sourceWorkoutDaySlug)') && doc.sourceWorkoutDaySlug !== undefined) return false;
    if (sql.includes('NOT IS_DEFINED(c.currentDaySlug)') && doc.currentDaySlug !== undefined) return false;
    return true;
  };

  const container = {
    items: {
      // The SDK accepts either a bare SQL string or a { query, parameters } spec,
      // and both shapes are used in this repo.
      query: (spec) => ({
        fetchAll: async () => {
          const query = typeof spec === 'string' ? spec : spec.query;
          const parameters = typeof spec === 'string' ? [] : spec.parameters ?? [];
          return {
            resources: [...store.values()]
              .filter((doc) => matches(doc, query, parameters))
              .map((doc) => structuredClone(doc))
          };
        }
      }),
      upsert: async (doc) => {
        operations.push([store.has(doc.id) ? 'update' : 'create', doc.id]);
        store.set(doc.id, structuredClone(doc));
      },
      create: async (doc) => {
        operations.push(['create', doc.id]);
        store.set(doc.id, structuredClone(doc));
      }
    },
    item: (id) => ({
      delete: async () => {
        if (!store.has(id)) {
          const error = new Error(`Document ${id} not found`);
          error.code = 404;
          throw error;
        }
        operations.push(['delete', id]);
        store.delete(id);
      }
    })
  };

  return { container, store, operations, documents: () => [...store.values()] };
}
