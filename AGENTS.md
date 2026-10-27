# Agent Directives

1. **Keep records honest.** Every `REQ` cites its grounds in `because`. Never mark a requirement `active` while it rests on an open assumption. Run `python tools/spec.py check --strict` before committing.
2. **Keep records stack-agnostic.** Describe behaviour, not languages, frameworks, databases or vendors.
3. **Keep it small.** Four record types, one folder, one script. Add a renderer to `tools/spec.py` instead of a new record type.
4. **Diagrams in Markdown use Mermaid**, with labels that contain special characters quoted.
