# Design & Development Principles

Based on: https://github.com/ykdojo/claude-code-tips

## 1. Break Down Problems (Tip 3)
- Never try to solve large problems in one shot
- Decompose into the smallest independently testable pieces
- Build and verify each piece before combining
- A -> A1 -> A2 -> A3 -> B, not A -> B directly

## 2. Plan Before Code (Tip 39)
- Spend time on high-level decisions first: tech stack, project structure, file organization
- Use plan mode (Shift+Tab) for structured planning
- Prototype quickly to validate technology choices before committing
- Planning saves more time than it costs

## 3. Keep It Simple (Tip 40)
- Actively resist writing more code than needed
- After implementation, review and simplify
- Question every abstraction: "Is this necessary right now?"
- Three similar lines > premature abstraction

## 4. Write Tests Early (Tip 34)
- TDD works well with AI: write failing tests first, then implement
- Commit tests separately before implementation
- Always review tests to ensure they aren't trivially passing
- Tests let Claude verify its own work autonomously

## 5. Fresh Context, Better Results (Tip 5)
- Start new conversations for new topics
- Performance degrades with longer conversations
- If quality drops, start fresh rather than pushing through

## 6. Proactive Handoffs (Tip 8)
- Before context gets too long, write a HANDOFF.md summarizing:
  - What has been done
  - What worked and what didn't
  - What remains to be done
- Start fresh with that file as context

## 7. Iterative Problem Solving (Tip 35)
- Be brave tackling unfamiliar domains
- Go fast for exploration, slow down for understanding
- Use Claude Code to learn and iterate, not just to produce output

## 8. Right Level of Abstraction (Tip 32)
- Quick prototyping is fine for exploration
- Dig deeper for production-critical code
- Match the level of scrutiny to the importance of the code

## 9. Automate Repetition (Tip 41)
- When you repeat a task 3+ times, automate it
- Use CLAUDE.md instructions, skills, or scripts
- Invest in your own workflow

## 10. Complete the Loop (Tip 9)
- Every feature should have a write-test-verify cycle
- Don't consider work done until it's tested and verified
- Use browser testing tools (Playwright) for UI verification
