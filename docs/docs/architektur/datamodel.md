---
sidebar_position: 2
---

# Datenmodelle
## Fachliches Datenmodell

```mermaid
classDiagram
    class User {
        - Id: Text
        - Username: Text
        - Firstname: Text
        - Lastname: Text
        - Email: Text
        - Password: EncryptedPassword
        - Language: "de" | "en" | "es"
        - Mode: "light" | "dark" | "system"
        - ProfilePicture: Image
        - Emailverified: Timestamp
        - CreatedAt: Timestamp
        - UpdatedAt: Timestamp
    }

    class Session {
        - UserId: Text
        - SessionToken: Text
        - Expires: Timestamp
        - CreatedAt: Timestamp
        - UpdatedAt: Timestamp
    }

    class VerificationToken {
        - Token: Text
        - Identifier: Text
        - Expires: Timestamp
    }

    class EmailVerificationToken {
        - Id: Text
        - Email: Text
        - Token: Text
        - CreatedAt: Timestamp
        - Expires: Timestamp
    }

    class PasswordResetToken {
        - Id: Text
        - Token: Text
        - Email: Text
        - CreatedAt: Timestamp
        - Expires: Timestamp
    }

    class Account {
        - Id: Text
        - UserId: Text
        - Name: Text
        - Icon: Icon
        - Balance: Number
        - CreatedAt: Timestamp
        - UpdatedAt: Timestamp
    }

    class Transaction {
        - Id: Text
        - UserId: Text
        - Amount: Number
        - Notes: Text
        - Interval: "Once" | "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"
        - Type: "Expense" | "Income" | "Transfer"
        - Category: Text
        - CreatedAt: Timestamp
        - UpdatedAt: Timestamp
        - Expires: Timestamp
    }

%%--------------------------------------------
User "1" -- "n" Account : has
User "1" -- "n" Session : has
User "1" -- "n" Transaction : has
```

### **Begründung des Datenmodells**



## Datenbankmodell (ERD-Modell)

```mermaid
erDiagram

    User {

    }
```