# Core Agent Directives (`asdlc-meta-specs`)

1. **Always Use Mermaid for Diagrams in Markdown (`.md`) Files**
   - Whenever creating or updating diagrams inside Markdown (`.md`) files (documentation, specifications, records, or artifacts), **always use Mermaid (` ```mermaid `) code blocks**.
   - Never use ASCII box-drawing diagrams (`┌──┐`, `│`, `└──┘`) in `.md` files.
   - Quote Mermaid node labels that contain parentheses, brackets, or special characters (e.g., `ID["Label (Detail)"]`) and avoid HTML tags inside labels.

2. **Tech-Stack Agnostic Specifications (PIM vs. PSM)**
   - Keep canonical specifications (`SPC`, `CHG`), normative records (`CON`, `REQ`, `ACR`), architectural pattern decisions (`DEC`), and domain epistemic records (`ASM`, `FCT`) **strictly tech-stack agnostic**.
   - Concrete technology stacks (languages, frameworks, databases, wire protocols, cryptographic cipher suites) belong in external Tech-Stack Profiles and target projection adapters (`adapters/` -> `dist/`).

3. **Walking Skeleton vs. Feature Flesh Decomposition (Greenfield & Reverse Engineering)**
   - Never bundle an entire application into a single monolithic specification (`SPC`). Always decompose capabilities into small, cohesive specifications across two tiers:
     - **Walking Skeleton (`tier: skeleton`, `toggleable: false`)**: The minimal, end-to-end structural foundation and core domain pipeline that must exist first for the system to function (`depends_on` forms the root DAG).
     - **Feature Flesh (`tier: feature`, `toggleable: true`, `depends_on: [SPC-xxxx]`)**: Focused, independently toggleable capability specifications that layer onto the walking skeleton via explicit `depends_on` links.
   - When prompted to **reverse-engineer an existing application** or discover records from a codebase, always extract the **Core MVP / Walking Skeleton (`tier: skeleton`)** specifications first, followed by layered **Feature (`tier: feature`)** specifications so the skeleton can be rebuilt independently and feature specs can be toggled or rebuilt in topological order when facts (`FCT`) or assumptions (`ASM`) change (`python3 tools/project.py --impacted-by <ID> --rebuild-plan`).

4. **Graph Integrity & Verification**
   - After creating or modifying any record, schema, or adapter template, always run:
     - `python3 tools/validate.py --strict`
     - `python3 tools/project.py`
     - `python3 tools/build_index.py`
     - `python3 -m unittest discover -s tests -v`
