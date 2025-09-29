---
sidebar_position: 2
---

# Datenmodelle
## Fachliches Datenmodell

```mermaid
classDiagram
    class User {
        - Username: Text
        - Email: Text
        - Password: EncryptedPassword
        - Language: "de" | "en"
        - ProfilePicture: Image
    }
```