---
sidebar_position: 30
---

# CI/CD 
Das CI/CD (Continuous Integration/Continuous Deployment) ist ein wichtiger Bestandteil des Entwicklungsprozesses. Es ermöglicht eine automatisierte Bereitstellung von Codeänderungen und Tests, um die Qualität und Stabilität der Software zu gewährleisten.

## CI/CD Pipeline
Da dieses Projekt über Vercel deployed ist wird das Verwalten der Pipeline von Vercel übernommen. Hierbei verwendet dieses Projekt die standart Pipeline von Vercel. 

## Ablauf der Pipeline
Um die Pipeline zu starten, muss ein Commit in den `main`-Branch gepusht werden. Die Pipeline kann jedoch auch manuell gestartet werden. 
Die Pipeline baut nur bei Commits auf dem `main`-Branch, damit nicht bei jedem Push auf den verschiedenen Branches baut, sondern nur bei relevanten Branches. Dies dient dem sparen von Zeit und Ressourcen. 