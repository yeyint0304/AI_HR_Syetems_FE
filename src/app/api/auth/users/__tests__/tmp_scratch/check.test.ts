// QA scratch file used to manually verify a totalCount/search-filter
// interaction while reviewing the `bugs/exchange-rate` diff. The actual
// regression coverage now lives in the sibling `route.test.ts`
// ("passes through the backend's unfiltered totalCount even when the search
// filter narrows the returned items"). Not part of the feature — the
// sandboxed review environment does not permit deleting files, only
// overwriting content, so this file is intentionally left as a no-op.
describe.skip("scratch (superseded by ../route.test.ts)", () => {
  it("no-op", () => {
    expect(true).toBe(true);
  });
});
