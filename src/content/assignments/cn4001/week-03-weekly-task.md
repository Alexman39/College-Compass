---
course: cn4001
title: "3rd Weekly Task"
teaser: "Συμπλήρωση κώδικα με if-else, switch statements και switch expressions, και δύο προαιρετικά προχωρημένα ερωτήματα."
type: exercise
week: 3
released:
due:
weight:
link:
submission:
---

Σε αυτές τις ασκήσεις θα χρειαστεί να συμπληρώσετε τα κενά σημεία στον κώδικα που σας δίνεται. Χρησιμοποιήστε τις εντολές if-else, switch statements και switch expressions για να κάνετε τον κώδικα πλήρως λειτουργικό, σύμφωνα με τις οδηγίες που περιλαμβάνονται στην εκφώνηση της κάθε άσκησης.

## Ερώτημα 1

Γράψτε ένα πρόγραμμα που να ελέγχει την κατάσταση μιας παραγγελίας βάσει του κωδικού κατάστασης (1: Επεξεργασία, 2: Σε Αναμονή, 3: Αποστολή, 4: Ολοκλήρωση).

```java
int status = 3;
switch (status) {
        System.out.println("Order is being processed");
        System.out.println("Order is on hold");
        System.out.println("Order has been shipped");
        System.out.println("Order is completed");
        System.out.println("Unknown status code");
}
```

## Ερώτημα 2

Δημιουργήστε ένα πρόγραμμα που να ελέγχει αν ένας αριθμός (μέσος όρος θερμοκρασίας) αντιστοιχεί σε ζεστό, κρύο ή μέτριο καιρό. (30+ = ζεστό, 15+ = χλιαρό)

```java
int temperature = 25;
if () {
    System.out.println("Hot weather");
    System.out.println("Moderate weather");
    System.out.println("Cold weather");
}
```

## Ερώτημα 3

Γράψτε ένα πρόγραμμα που να ελέγχει το επίπεδο προσβασιμότητας ενός χρήστη με βάση έναν κωδικό πρόσβασης (1: Διαχειριστής, 2: Συντάκτης, 3: Αναγνώστης).

```java
int accessLevel = 2;
switch () {
    case 1:
        System.out.println("Administrator access");
        System.out.println("Editor access");
        System.out.println("Reader access");
        System.out.println("Unknown access level");
}
```

## Ερώτημα 4

Δημιουργήστε ένα πρόγραμμα που να κατατάσσει μια ημέρα ως εργάσιμη ή αργία (Δευτέρα έως Παρασκευή: εργάσιμη, Σάββατο και Κυριακή: αργία).

```java
String day = "Saturday";
switch (day) {
        System.out.println("Weekday");
        System.out.println("Weekend");
        System.out.println("Unknown day");
}
```

## Ερώτημα 5

Δημιουργήστε ένα πρόγραμμα που να εκτιμά το επίπεδο εμπειρίας ενός χρήστη βάσει των πόντων εμπειρίας που έχει (0-100: Νέος, 101-500: Μέτριος, 501+ : Προχωρημένος).

```java
int experiencePoints = 120;
if () {
    System.out.println("Beginner");
    System.out.println("Intermediate");
    System.out.println("Advanced");
}
```

## Ερώτημα 6

Δημιουργήστε ένα πρόγραμμα που να ελέγχει την προσβασιμότητα ενός χρήστη σε μία πλατφόρμα ανάλογα με το ρόλο και την ηλικία του (π.χ. Admins με ηλικία κάτω των 18 δεν επιτρέπονται).

```java
String role = "Admin";
int age = 17;

if (role.equals()) {
    if () {
        System.out.println("Access granted to Admin");
        System.out.println("Access denied to Admin under 18");
    }
} else if () {
    System.out.println("Access granted to User");
    System.out.println("Unknown role");
}
```

## Ερώτημα 7

Γράψτε ένα πρόγραμμα που να εκτιμά την προτεινόμενη ταχύτητα ενός οχήματος με βάση τον τύπο του δρόμου (αυτοκινητόδρομος, επαρχιακός δρόμος, εντός πόλης) και την ώρα (π.χ. βράδυ/μέρα).

```java
String roadType = "Highway";
String timeOfDay = "Night";

switch (roadType) {
    case "Highway":
        if (timeOfDay.equals) {
            System.out.println("Recommended speed: 120 km/h");
        } else {
            System.out.println("Recommended speed: 100 km/h");
        }
        break;
    case "City":
        System.out.println("Recommended speed: 50 km/h");
    case "Rural":
        if (timeOfDay.equals("Day")) {
            System.out.println("Recommended speed: 80 km/h");
        } else {
            System.out.println("Recommended speed: 60 km/h");
        }
        System.out.println("Unknown road type");
}
```

## Ερώτημα 8

Γράψτε ένα πρόγραμμα που να καθορίζει τον τύπο ενός αθλητή (ερασιτέχνης, ημι-επαγγελματίας, επαγγελματίας) ανάλογα με την εμπειρία του και την ηλικία του.

```java
int experienceYears = 5;
int age = 24;

if (experienceYears > 8) {
    System.out.println("Professional player");
} else if (experienceYears > 3) {
    if () { // bellow 30
        System.out.println("Semi-professional player");
        System.out.println("Professional player");
    }
    System.out.println("Amateur player");
}
```

## Ερώτημα 9

Δημιουργήστε ένα πρόγραμμα που να επιστρέφει την τιμή έκπτωσης για ένα προϊόν βάσει της κατηγορίας του (A, B, C). Για παράδειγμα, 20% για κατηγορία A, 15% για κατηγορία B, 10% για κατηγορία C, και 5% για άλλες κατηγορίες. Χρησιμοποιήστε switch expression.

```java
char category = 'A';
int discount = switch (category) {

};
System.out.printf("The discount for the category %c is %d%%%n", category, discount);
```

## Ερώτημα 10

Γράψτε ένα πρόγραμμα που καθορίζει την περιγραφή της ζώνης ενός αθλητή στο Brazilian Jiu-Jitsu βάσει της βαθμίδας (white, blue, purple, brown, black) και του επιπέδου (1-4 για white, 1-3 για blue, purple, και brown, 1-6 για black). Χρησιμοποιήστε switch expression για να επιστρέψετε τη σωστή περιγραφή.

```java
String beltColor = "blue";
int rank = 2;

String beltDescription = switch (beltColor) {
    case "white" -> switch (rank) {
        case 1 -> /* "White Belt - Beginner" */;
        case 2 -> /* "White Belt - Intermediate" */;
        case 3 -> /* "White Belt - Advanced" */;
        case 4 -> /* "White Belt - Experienced" */;
        default -> /* "Invalid rank for White Belt" */;
    };
    case "blue" -> switch (rank) {
        // Fill in cases here
    };
    case "purple" -> switch (rank) {
        // Fill in cases here
    };
    case "brown" -> switch (rank) {
        // Fill in cases here
    };
    case "black" -> switch (rank) {
        // Fill in cases here
    };
    default -> /* "Unknown belt color" */;
};

System.out.println(beltDescription);
```

## Προχωρημένα Ερωτήματα (προαιρετικά)

Οι παρακάτω ασκήσεις είναι προαιρετικές και απευθύνονται σε όσους από εσάς επιθυμούν να εμβαθύνουν τις γνώσεις τους στην Java και να δοκιμάσουν τις δεξιότητές τους σε πιο σύνθετα προβλήματα. Αυτές οι ασκήσεις αποτελούν μια πολύ καλή ευκαιρία να αξιολογήσετε τις γνώσεις σας, αλλά και να αναπτύξετε ικανότητες έρευνας για την επίλυση ζητημάτων που ίσως περιλαμβάνουν έννοιες και τεχνικές που δεν έχουμε καλύψει ακόμη. Σας ενθαρρύνω να τις δοκιμάσετε, καθώς η ενασχόληση με πιο απαιτητικά προβλήματα θα σας βοηθήσει να διευρύνετε το εύρος των γνώσεών σας στον προγραμματισμό και να αποκτήσετε περισσότερη αυτοπεποίθηση.

### Προχωρημένo Ερώτημα 1

Δημιουργήστε ένα πρόγραμμα που ταξινομεί τους συμμετέχοντες σε προγράμματα εκπαίδευσης με βάση την ηλικία τους. Το πρόγραμμα θα ζητά από τον χρήστη να εισάγει την ηλικία του και θα εμφανίζει την κατάλληλη κατηγορία, με βάση τους εξής κανόνες:

- Παιδί (Child): 6 - 12 ετών
- Έφηβος (Teenager): 13 - 17 ετών
- Νεαρός Ενήλικας (Young Adult): 18 - 25 ετών
- Ενήλικας (Adult): 26 - 60 ετών
- Ηλικιωμένος (Senior): 61 και άνω

Το πρόγραμμα θα πρέπει να χρησιμοποιεί ένα σύνθετο if-else σύστημα για να ελέγξει τις συνθήκες και να εμφανίζει την κατηγορία με κατάλληλο μήνυμα.

### Προχωρημένo Ερώτημα 2

Γράψτε ένα πρόγραμμα που υπολογίζει το κόστος ενοικίασης ενός αυτοκινήτου με βάση τη διάρκεια χρήσης του. Το πρόγραμμα θα ζητά από τον χρήστη να εισάγει τον αριθμό των ημερών που χρειάζεται το αυτοκίνητο. Ο υπολογισμός του κόστους γίνεται ως εξής:

- Για ενοικίαση μέχρι 3 ημέρες, το κόστος είναι 50 ευρώ ανά ημέρα.
- Για ενοικίαση από 4 έως 7 ημέρες, το κόστος είναι 40 ευρώ ανά ημέρα.
- Για ενοικίαση πάνω από 7 ημέρες, το κόστος είναι 30 ευρώ ανά ημέρα.

Το πρόγραμμα πρέπει να χρησιμοποιεί ένα switch ή και ένα if-else σύστημα για να καθορίσει την τιμή ανάλογα με τις ημέρες και να εμφανίζει το συνολικό κόστος στον χρήστη.
