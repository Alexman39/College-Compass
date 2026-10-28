---
course: cn4001
week: 4
title: Είσοδος από τον χρήστη με τον Scanner
description: "Είσοδος από τον χρήστη στη Java με τον Scanner: ποια μέθοδος για κάθε τύπο, έλεγχος εισόδου, δεκαδικοί με Locale και πολλές τιμές σε μία γραμμή."
date:
tags: [java, scanner, input-validation, locale]
---

Σημειώσεις μελέτης βασισμένες στο «Learn Programming with Java – Scanner».
Οι διαφάνειες, με τα 13 παραδείγματα και τις ασκήσεις τους, βρίσκονται στο
Moodle.

Ως τώρα οι τιμές ήταν «καρφωμένες» μέσα στον κώδικα. Για να ρωτά το πρόγραμμα
τον χρήστη, η Java έχει την κλάση **`Scanner`**, που διαβάζει ό,τι πληκτρολογεί
κάποιος στην κονσόλα.

## Το βασικό σχήμα

```java
import java.util.Scanner;

public class Greeting {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.print("Πώς σε λένε; ");
        String name = input.nextLine();

        System.out.println("Γεια σου, " + name + "!");
        input.close();
    }
}
```

- Το `import java.util.Scanner;` φέρνει την κλάση στο πρόγραμμα.
- Το `new Scanner(System.in)` φτιάχνει έναν Scanner που διαβάζει από το
  πληκτρολόγιο. Αρκεί **ένας** για όλο το πρόγραμμα.
- Το `input.close()` τον κλείνει στο τέλος.

## Ποια μέθοδος για τι

| Μέθοδος | Διαβάζει | Παράδειγμα εισόδου → τιμή |
| --- | --- | --- |
| `nextLine()` | όλη τη γραμμή, με τα κενά | `Οδός Ακαδημίας 10` → `"Οδός Ακαδημίας 10"` |
| `next()` | την επόμενη «λέξη», ως το πρώτο κενό | `Harry Potter` → `"Harry"` |
| `nextInt()` | έναν ακέραιο | `25` → `25` |
| `nextDouble()` | έναν δεκαδικό | `19,99` ή `19.99` (βλ. παρακάτω) |
| `nextBoolean()` | `true` ή `false` | `true` → `true` |

> **Η παγίδα του nextLine.** Το `nextInt()` διαβάζει τον αριθμό αλλά αφήνει το
> Enter στην είσοδο. Αν μετά καλέσεις `nextLine()`, θα διαβάσει αυτό το κενό
> υπόλοιπο και θα επιστρέψει αμέσως `""`. Η λύση: ένα επιπλέον `nextLine()` για
> να «καταναλώσει» το Enter.
>
> ```java
> int age = input.nextInt();
> input.nextLine();                 // πετάει το Enter που περίσσεψε
> String address = input.nextLine();
> ```

Για να καθαρίσεις κενά στην αρχή και στο τέλος του κειμένου, χρησιμοποίησε
`trim()`· για σύγκριση χωρίς διάκριση κεφαλαίων, `equalsIgnoreCase()`:

```java
String colour = input.nextLine().trim();   // "  Blue " → "Blue"
if (colour.equalsIgnoreCase("blue")) {
    System.out.println("Ήρεμο χρώμα.");
}
```

## Έλεγχος εισόδου

Αν ζητήσεις `nextInt()` και ο χρήστης γράψει «είκοσι», το πρόγραμμα σταματά με
`InputMismatchException`. Για να το αποφύγεις, **ρωτάς πρώτα** αν η επόμενη τιμή
είναι του σωστού τύπου, με τις μεθόδους `hasNextInt()`, `hasNextDouble()` κ.λπ.:

```java
System.out.print("Πόσα τεμάχια θέλεις; ");

if (input.hasNextInt()) {
    int quantity = input.nextInt();
    if (quantity > 0) {
        System.out.println("Παρήγγειλες " + quantity + " τεμάχια.");
    } else {
        System.out.println("Η ποσότητα πρέπει να είναι θετική.");
    }
} else {
    System.out.println("Δώσε αριθμό, όχι κείμενο.");
}
```

Για να ζητάς ξανά μέχρι να πάρεις έγκυρη τιμή, βάζεις τον έλεγχο σε έναν βρόχο
`while`:

```java
int number;
while (true) {
    System.out.print("Δώσε αριθμό από 1 έως 10: ");
    if (input.hasNextInt()) {
        number = input.nextInt();
        if (number >= 1 && number <= 10) break;   // έγκυρη τιμή: βγαίνουμε
        System.out.println("Εκτός ορίων.");
    } else {
        System.out.println("Αυτό δεν είναι αριθμός.");
        input.next();                              // πετάμε τη λάθος είσοδο
    }
}
```

Χωρίς το `input.next()` στο `else`, η λάθος λέξη θα έμενε στην είσοδο και ο
βρόχος θα έτρεχε για πάντα.

## Δεκαδικοί και Locale

Ο Scanner διαβάζει τους δεκαδικούς με βάση τις **τοπικές ρυθμίσεις** (*locale*)
του υπολογιστή. Σε έναν υπολογιστή με ελληνικές ρυθμίσεις, το διαχωριστικό
είναι το **κόμμα** (`19,99`)· σε αγγλικές ΗΠΑ, η **τελεία** (`19.99`). Αν ο
χρήστης χρησιμοποιήσει το άλλο, η είσοδος θεωρείται άκυρη.

Για να δουλεύει το πρόγραμμα ίδια παντού, ορίζεις ρητά το locale:

```java
import java.util.Locale;

Scanner usInput = new Scanner(System.in).useLocale(Locale.US);       // 19.99
Scanner grInput = new Scanner(System.in).useLocale(Locale.of("el", "GR")); // 19,99
```

Το `Locale.of` υπάρχει από τη Java 19· σε παλιότερες εκδόσεις γράφεις
`new Locale("el", "GR")`.

## Πολλές τιμές σε μία γραμμή

Ο Scanner χωρίζει την είσοδο σε κομμάτια (*tokens*) με βάση τα **κενά**. Έτσι, ο
χρήστης μπορεί να γράψει τρεις αριθμούς στην ίδια γραμμή:

```java
System.out.print("Δώσε τρεις αριθμούς: ");   // π.χ. 4 7 9
int a = input.nextInt();
int b = input.nextInt();
int c = input.nextInt();
System.out.println("Άθροισμα: " + (a + b + c));   // Άθροισμα: 20
```

Αν θέλεις άλλο διαχωριστικό, π.χ. κόμματα (`4,7,9`), το ορίζεις με
`useDelimiter`:

```java
Scanner csv = new Scanner(System.in).useDelimiter("[,\\s]+");
```

Η έκφραση `[,\\s]+` σημαίνει «ένα ή περισσότερα κόμματα ή κενά», ώστε να
λειτουργεί και το Enter στο τέλος της γραμμής.

Τέλος, το **`skip()`** προσπερνά ένα συγκεκριμένο κομμάτι κειμένου. Αν κάθε γραμμή
ξεκινά με μια ετικέτα, π.χ. `Όνομα: Άννα`, το `input.skip("Όνομα: ")` την
προσπερνά και το `nextLine()` διαβάζει μόνο την τιμή.

## Ερωτήσεις αυτοαξιολόγησης

<details>
<summary>1. Ο χρήστης γράφει «Άννα Παππά». Τι επιστρέφει το next() και τι το nextLine();</summary>

Το `next()` επιστρέφει «Άννα» (ως το πρώτο κενό). Το `nextLine()` επιστρέφει όλη
τη γραμμή, «Άννα Παππά».

</details>

<details>
<summary>2. Γιατί το πρόγραμμα παραλείπει την ερώτηση για τη διεύθυνση μετά από ένα nextInt();</summary>

Γιατί το `nextInt()` αφήνει το Enter στην είσοδο, και το επόμενο `nextLine()` το
διαβάζει αμέσως ως κενή γραμμή. Ένα επιπλέον `nextLine()` μετά το `nextInt()`
λύνει το πρόβλημα.

</details>

<details>
<summary>3. Τι κάνει το hasNextInt() και γιατί είναι χρήσιμο;</summary>

Ελέγχει, χωρίς να «καταναλώσει» την είσοδο, αν η επόμενη τιμή είναι ακέραιος.
Έτσι αποφεύγεις το `InputMismatchException` όταν ο χρήστης γράψει κείμενο.

</details>

<details>
<summary>4. Σε έναν υπολογιστή με ελληνικές ρυθμίσεις ο χρήστης γράφει 19.99 για nextDouble(). Τι γίνεται;</summary>

Η είσοδος θεωρείται άκυρη, γιατί με ελληνικό locale ο Scanner περιμένει κόμμα
(`19,99`). Για να δέχεται τελεία, ορίζεις `useLocale(Locale.US)`.

</details>

---

**Πηγές:** «Learn Programming with Java – Scanner» του μαθήματος·
[τεκμηρίωση της κλάσης Scanner](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Scanner.html).
