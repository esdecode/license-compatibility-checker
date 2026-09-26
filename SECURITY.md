# Security Policy

## Supported versions

Only the latest published minor version receives fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through GitHub's "Report a vulnerability" (Security Advisories) on this repository.

Include a description, affected version, and a minimal reproduction. You should receive an acknowledgement within 5 working days.

## Scope

This package parses untrusted input (licence strings, `package-lock.json`, `composer.lock`, `yarn.lock`). Relevant issues include crashes or excessive resource use on crafted input, and prototype pollution.

An incorrect licence conclusion is a correctness bug, not a security vulnerability. Please report it as a regular issue with links to authoritative sources.
