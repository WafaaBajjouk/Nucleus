# Checkpoint A — Claims, context and evidence

## Project claim

Nucleus is a local launcher for developers and small teams. It automates local deployment by letting a developer select projects from a graph and launch them in isolated Docker Compose environments.

## Claim type

This is primarily a behaviour claim: under local conditions, a supported project can be selected, launched and shown as healthy.

## Problem claim

Developers lose time and confidence when they must manually start local services, resolve project configuration and verify that they are testing the correct app.

## Behaviour claim

If a project is in the supported catalogue and has a valid Compose setup, the launcher can start it in an isolated local instance and report its state.

## Outcome claim

If this works reliably, local setup should become simpler and less error-prone for a developer working on a supported project.

## Context

- User: local developer or small team member
- Conditions: Node.js, Docker Compose, supported project structure, loopback-only launch
- Non-goal: multi-user access, remote deployment, broad monitoring or permissions
- Uncertainty: imported repositories may use unsupported or unusual Compose patterns

## Evidence that could challenge the claim

- A launch may fail if the project is unsupported or badly configured
- A project may appear ready even when Docker health is weak or incomplete
- A single local demo does not prove faster setup or adoption across users

## Evidence collected

- Automated tests cover catalogue browsing, import validation, launch, removal and API checks
- A live TaskNest demo confirmed a project launched, reported healthy state and could be removed
- These checks support the behaviour claim within the tested boundary, not a wider user outcome claim

## Decision

The project should continue with one clear launch path: validated project selection, isolated instance creation and health verification before the instance is treated as ready.
