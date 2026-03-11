---
name: style-guide
description: A style guide for writing code and documentation.
---

# Style Guide

In this project, we follow these conventions for writing code and documentation:

- Only document complex functions and classes. Simple functions should have clear and descriptive names.
- Use regions to organize code into logical sections.
- Use consistent naming conventions for variables, functions, and classes.
- Try to architect code using SOLID principles.
- Never leave any TODOs.
- file names are in snake_case
- Instead of returning Response objects, use the `json` helper from SvelteKit to return JSON responses. Also use the `error` helper and others.
- Error and info messages must be in German and should be full sentences.
