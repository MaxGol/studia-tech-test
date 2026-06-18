Review the current implementation for the following practices and apply fixes where needed:

**KISS (Keep It Simple, Stupid)**
- Remove unnecessary abstractions — if something can be done in fewer steps, do it
- Prefer built-in language/framework behaviour over manual workarounds (e.g. Prisma ignores `undefined` in `where`, use it)
- Avoid over-engineering for hypothetical future requirements

**READABILITY**
- Extract complex inline expressions (nested ternaries, long conditions) into named variables
- Name things after what they represent, not how they are implemented
- Keep functions and components focused on a single responsibility
- Comments must explain WHY, not WHAT — remove any comment that just restates the code

**DRY (Don't Repeat Yourself)**
- Extract values or objects that are constructed identically in multiple places
- Consolidate related state (e.g. two `useState` values that always change together should be one)
- Merge duplicate conditional render blocks that check the same condition

After identifying issues, apply the fixes directly. Then run `npm test` to confirm nothing is broken.
