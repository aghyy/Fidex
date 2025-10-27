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

    class Category {
        - Id: Text
        - UserId: Text
        - Name: Text
        - Color: Text
        - Icon: Icon
    }

    class Document {
        - Id: Text
        - UserId: Text
        - CategoryId: Text
        - Name: Text
        - Content: Image
    }

%%--------------------------------------------
User "1" -- "n" Account : has
User "1" -- "n" Session : has
User "1" -- "n" Transaction : has
User "1" -- "n" Category : has
User "1" -- "n" Document : has
Category "1" -- "n" Transaction : contains
```

### Begründung des Datenmodells

Das gezeigte Datenmodell wurde basierend auf den Anforderungen der Anwendung entworfen, um die wichtigsten Funktionalitäten wie Benutzerverwaltung, Accountmanagement, Transaktionen, Dokumente und Kategorien zu unterstützen. 

Hierbei dient dieses Modell als Grundlage, um die fachlichen Zusammenhänge zu verstehen und die Anforderungen klar definieren zu können. Dieses Modell stellt dar, welche Informationen benötigt werden, wie diese miteinander verknüpft sind und welche Daten durch die Anwendung verarbeitet werden sollen.

Es gilt jedoch zu beachten, dass es sich hierbei noch nicht um das technische Datenbankschema handelt. Das fachliche Modell hilft zunächst dabei, alle relevanten Entitäten und ihre Beziehungen zu klären, bevor die eigentliche Implementierung in einer konkreten Datenbank erfolgt. Dadurch können spätere Anpassungen oder Optimierungen im technischen Design besser berücksichtigt werden.

## Datenbankmodell (ERD-Modell)

```mermaid
erDiagram

    User {
        varchar(255) id PK
        varchar(255) username
        varchar(255) firstname
        varchar(255) lastname
        varchar(255) email
        varchar(255) password
        smallint language
        smallint mode
        varchar(255) profilepicture
        timestamp(6) emailverified
        timestamp(6) createdAt
        timestamp(6) updatedAt
    }

    Session {
        varchar(255) userId FK
        varchar(255) sessionToken
        timestamp(6) expires
        timestamp(6) createdAt
        timestamp(6) updatedAt
    }

    EmailVerificationToken {
        varchar(255) id PK
        varchar(255) email
        varchar(255) token
        timestamp(6) createdAt
        timestamp(6) expires
    }

    PasswordResetToken {
        varchar(255) id PK
        varchar(255) email
        varchar(255) token
        timestamp(6) createdAt
        timestamp(6) expires
    }

    Account {
        varchar(255) id PK
        varchar(255) userId FK
        varchar(255) name
        varchar(255) accountNumber
        varchar(50) icon
        bigint balance
        timestamp(6) createdAt
        timestamp(6) updatedAt
    }

    Transaction {
        varchar(255) id PK
        varchar(255) userId FK
        varchar(255) originAccountId FK
        varchat(255) targetAccountId FK
        bigint amount
        varchar(255) notes
        smallint interval
        smallint type
        varchar(255) category
        timestamp(6) createdAt
        timestamp(6) updatedAt
        timestamp(6) expires
    }

    Category {
        varchar(255) id PK
        varchar(255) userId FK
        varchar(255) name
        varchar(10) color
        varchar(50) icon
    }

    Document {
        varchar(255) id PK
        varchar(255) userId FK
        varchar(255) categoryId FK
        varchar(255) name
        varchar(255) content
    }

    User ||--|{ Account : "has"
    User ||--|{ Session : "has"
    User ||--|{ Transaction : "has"
    User ||--|{ Category : "has"
    User ||--|{ Document : "has"
    Category ||--|{ Transaction : "contains"
```

### Begründung des Datenbankschemas

Das technische Datenbankschema wurde auf Basis des fachlichen Modells entworfen, um Modularität, Erweiterbarkeit und eine effiziente Datenverwaltung sicherzustellen. Es bildet die Grundlage für die Speicherung und Verarbeitung der Daten in der Anwendung und wurde mit folgenden Designentscheidungen umgesetzt:

1. **Modularität und Erweiterbarkeit**  
   Die Struktur des Schemas erlaubt eine einfache Anpassung und Erweiterung.

2. **Entkopplung und Trennung von Verantwortlichkeiten**  
   Die Tabellen sind klar voneinander getrennt und repräsentieren jeweils eine bestimmte Domäne (z. B. Benutzer, Dashboard, Accounts oder Transaktionen). Dadurch wird die Übersichtlichkeit erhöht, und redundante Daten werden vermieden.

3. **Strukturierte Hierarchie und Verknüpfung**  
   Das Schema zeigt eine klare Verknüpfung zwischen den verschiedenen Elementen. Zum Beispiel:
   - Ein Benutzer (`User`) besitzt Dokumente (`Document`), die wiederum zu einer Kategorie (`Category`) gehören. 
   - Ein Benutzer (`User`) hat Transaktionen (`Transaction`) ausgeführt und diese wiederum verweisen auf ein Konto (`Account`). 

## Zusammenfassung

