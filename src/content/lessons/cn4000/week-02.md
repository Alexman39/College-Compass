---
course: cn4000
week: 2
title: Κατανόηση των Τροποποιητών Πρόσβασης και των Μεθόδων
date:
tags: [java, access-modifiers, final, abstract, static]
---

## 1. Εισαγωγή

Αφού μάθαμε πώς να διαβάζουμε ένα διάγραμμα UML, ήρθε η ώρα να καταλάβουμε πώς
αυτό μεταφράζεται σε κώδικα.

- Τι σημαίνει ένα +, - ή # δίπλα σε μια μέθοδο ή ιδιότητα;
- Τι ρόλο παίζουν οι λέξεις-κλειδιά public, private, abstract, final στον
  κώδικα;
- Πώς διασφαλίζουμε ότι μια μέθοδος δέχεται έγκυρα δεδομένα;

## 2. Τροποποιητές Πρόσβασης (Access Modifiers)

Οι τροποποιητές πρόσβασης καθορίζουν ποιος μπορεί να έχει πρόσβαση στις
μεθόδους και στα πεδία μιας κλάσης.

| Σύμβολο | Ορατότητα | Περιγραφή |
| --- | --- | --- |
| + | Public (Δημόσιο) | Προσβάσιμο από όλες τις κλάσεις. |
| - | Private (Ιδιωτικό) | Προσβάσιμο μόνο μέσα στην ίδια κλάση. |
| # | Protected (Προστατευμένο) | Προσβάσιμο μόνο από υποκλάσεις (κληρονομικότητα). |
| ~ | Package (Προστασία Πακέτου) | Προσβάσιμο μόνο από κλάσεις του ίδιου πακέτου. |

<!-- TODO: "### Παράδειγμα στο UML" — add a screenshot from Draw.io, then restore this heading. -->

### Μετατροπή σε Κώδικα (Java)

```java
public class User {
    private String username;  // Μόνο η ίδια η κλάση μπορεί να το διαβάσει/τροποποιήσει

    public void setUsername(String username) {
        this.username = username;
    }
}
```

### Παρατηρήσεις:

- Το username είναι ιδιωτικό (private), γιατί δεν θέλουμε να αλλάζει απευθείας
  από έξω.
- Η setUsername είναι δημόσια (public), ώστε να μπορούμε να αλλάξουμε το
  username με έναν ελεγχόμενο τρόπο.

## 3. final, abstract και static

Εκτός από τους τροποποιητές πρόσβασης, υπάρχουν και άλλες σημαντικές
λέξεις-κλειδιά.

### final

Χρησιμοποιείται για να δηλώσουμε ότι:

- Μια μεταβλητή δεν αλλάζει (final int MAX_AGE = 100;).
- Μια μέθοδος δεν μπορεί να γίνει override από υποκλάσεις.
- Μια κλάση δεν μπορεί να κληρονομηθεί (final class User).

```java
final class Account {
// Δεν μπορεί να αλλάξει μετά την αρχικοποίηση
    private final String accountId;

    public Account(String accountId) {
        this.accountId = accountId;
    }
}
```

### abstract

Χρησιμοποιείται για να ορίσουμε αφηρημένες κλάσεις και μεθόδους.

- Μια αφηρημένη κλάση δεν μπορεί να δημιουργήσει αντικείμενα από μόνη της.
- Μια αφηρημένη μέθοδος δεν έχει σώμα και πρέπει να υλοποιηθεί από τις
  υποκλάσεις.

```java
abstract class Animal {
// Υποχρεωτικά υλοποιείται στις υποκλάσεις
    abstract void makeSound();
}

class Dog extends Animal {
    @Override
    void makeSound() {
        System.out.println("Bark!");
    }
}
```

### static

Χρησιμοποιείται για μεταβλητές και μεθόδους που ανήκουν στην κλάση και όχι σε
ένα αντικείμενο.

```java
class MathUtils {
    public static int add(int a, int b) {
        return a + b;
    }
}

// Κλήση χωρίς αντικείμενο
int result = MathUtils.add(5, 10);
```

## 4. Έλεγχος Δεδομένων στις Μεθόδους

Σε πολλές περιπτώσεις, δεν θέλουμε να επιτρέψουμε σε μια μέθοδο να δεχτεί μη
έγκυρα δεδομένα.

<!-- TODO: "### Παράδειγμα στο UML" — add a screenshot from Draw.io, then restore this heading. -->

<!-- TODO: the example below does not check anything yet — write the validation, then un-hide it.

### Υλοποίηση με Έλεγχο στη Java

```java
public class User {
    private String username;  // Μόνο η ίδια η κλάση μπορεί να το διαβάσει/τροποποιήσει

    public void setUsername(String username) {
        this.username = username;
    }
}
```

-->
