# Core Agent Directives (`asdlc-meta-specs`)

1. **Always Use Mermaid for Diagrams**
   - Whenever creating or updating diagrams in documentation, specifications, records, or responses, **always use Mermaid (` ```mermaid `) code blocks**.
   - Never use ASCII box-drawing diagrams (`┌──┐`, `│`, `└──┘`).
   - Quote Mermaid node labels that contain parentheses, brackets, or special characters (e.g., `ID["Label (Detail)"]`) and avoid HTML tags inside labels.

2. **Tech-Stack Agnostic Specifications (PIM vs. PSM)**
   - Keep canonical specifications (`SPC`, `CHG`), normative records (`CON`, `REQ`, `ACR`), architectural pattern decisions (`DEC`), and domain epistemic records (`ASM`, `FCT`) **strictly tech-stack agnostic**.
   - Concrete technology stacks (languages, frameworks, databases, wire protocols, cryptographic cipher suites) belong in external Tech-Stack Profiles and target projection adapters (`adapters/` -> `dist/`).

3. **Graph Integrity & Verification**
   - After creating or modifying any record or schema, always run:
     - `python3 tools/validate.py --strict`
     - `python3 tools/build_index.py`
     - `python3 -m unittest discover -s tests -v`
