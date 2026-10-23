## Project Claim

Nucleus aims to automate local deployment for developers in companies and teams. Developers select a project from an interactive graph and launch it in an isolated Docker Compose environment, reducing manual setup.

## Software Development Lifecycle

Nucleus follows a proposed **incremental and iterative lifecycle**: deliver usable capabilities in stages and improve them through testing and feedback.

While working in this project , I act as the developer, tester, client and project owner...

1. **Define requirements:** "With my client hat on, I define the expected behaviour": an authorised developer can select a supported project from the graph, launch it and access the application.
2. **Design and build:** "With my developer hat on, I implement a usable increment": first a complete launch workflow, including validation, isolation and failure cleanup; later, instance controls, monitoring and verification.
3. **Test and revise:** "With my tester hat on, I check functionality, permissions and failure handling" and record the results.
4. **Deploy and operate:** "With my developer hat on, I release a tested version" and verify its behaviour on a compatible Docker Compose host.
5. **Review feedback and maintain:** "With my client hat on, I assess whether the workflow reduces manual setup. With my project owner hat on, I use that evidence to keep, change or stop planned work. With my developer hat on, I implement the agreed improvements."


**Current state**:

Currently, Nucleus provides a dashboard and an interactive graph displaying demo projects or configured GitHub repositories, including accessible private repositories.
Docker Compose launching, instance controls, monitoring and verification are not yet implemented