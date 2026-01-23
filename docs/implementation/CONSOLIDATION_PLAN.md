# Documentation Consolidation Plan

## Current State
- 9 root-level .md files (various sizes)
- Multiple review documents with potential overlap
- Process flows scattered
- No clear documentation structure

## Proposed Structure

```
docs/
├── README.md                    # Main documentation index
├── guides/                      # User-facing guides
│   ├── STORY_EXPORT_IMPORT_GUIDE.md
│   └── ...
├── processes/                   # Technical process flows
│   ├── REGISTRATION_PROCESS.md
│   ├── PASSWORD_RESET_EMAIL_FLOW.md
│   └── COLLABORATION_REQUEST_FLOW.md
├── reviews/                     # Analysis and review documents
│   ├── CART_CHECKOUT_REVIEW.md
│   ├── USER_COMMUNICATIONS_REVIEW.md (consolidated)
│   └── PRODUCT_PAGES_TEST_PLAN.md
├── testing/                     # Test documentation
│   ├── INTEGRATION_TESTS.md
│   └── ...
└── implementation/             # Implementation logs
    └── TECHNICAL_IMPROVEMENTS_IMPLEMENTED.md
```

## Consolidation Actions

### 1. Merge Duplicate Reviews
- [ ] Archive `USER_COMMUNICATIONS_REVIEW.md` (old version)
- [ ] Keep `USER_COMMUNICATIONS_REVIEW_UPDATED.md` as the single source
- [ ] Rename to `USER_COMMUNICATIONS_REVIEW.md` (remove "_UPDATED")

### 2. Organize by Category
- [ ] Move process flows to `docs/processes/`
- [ ] Move reviews to `docs/reviews/`
- [ ] Move test docs to `docs/testing/`
- [ ] Move implementation logs to `docs/implementation/`

### 3. Create Documentation Index
- [ ] Create `docs/README.md` with links to all documentation
- [ ] Update root `README.md` to point to docs structure

### 4. Keep Separate (Don't Consolidate)
- ✅ Process flows (each is a specific reference)
- ✅ Manual test docs (component-specific)
- ✅ README files (location-specific)
- ✅ User guides (topic-specific)

## Benefits
- Clear organization by purpose
- Easier to find relevant documentation
- Reduced duplication
- Better maintainability
- Professional structure

