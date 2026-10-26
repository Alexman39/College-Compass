---
course: cn4001
title: "2η Εβδομαδιαία Εργασία (Κοσμίδης)"
teaser: "20 ερωτήματα συμπλήρωσης κενών: αριθμητικοί, σχεσιακοί και λογικοί τελεστές, και συνθήκες if."
type: exercise
week: 2
released:
due:
weight:
link:
submission:
---

## Ερώτημα 1

Συμπληρώστε το κενό για να υπολογίσετε το άθροισμα δύο ακεραίων αριθμών.

```java
int a = 5;
int b = 3;
int sum = ________;
System.out.println("The sum is: " + sum);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The sum is: 8
```

## Ερώτημα 2

Υπολογίστε το γινόμενο δύο αριθμών.

```java
int x = 4;
int y = 7;
int product = ________;
System.out.println("The product is: " + product);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The product is: 28
```

## Ερώτημα 3

Υπολογίστε το υπόλοιπο μιας πράξης διαίρεσης.

```java
int num = 10;
int divisor = 3;
int remainder = ________;
System.out.println("The remainder is: " + remainder);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The remainder is: 1
```

## Ερώτημα 4

Συγκρίνετε δύο αριθμούς και εκτυπώστε αν ο ένας είναι μεγαλύτερος.

```java
int a = 15;
int b = 10;
boolean isGreater = a ________ b;
System.out.println("Is a greater than b? " + isGreater);
```

*Αναμενόμενο αποτέλεσμα:*

```text
Is a greater than b? true
```

## Ερώτημα 5

Προσδιορίστε αν δύο αριθμοί είναι ίσοι.

```java
int a = 5;
int b = 5;
boolean isEqual = a ________ b;
System.out.println("Are a and b equal? " + isEqual);
```

*Αναμενόμενο αποτέλεσμα:*

```text
Are a and b equal? true
```

## Ερώτημα 6

Αυξήστε έναν αριθμό κατά 1 χρησιμοποιώντας τον τελεστή increment.

```java
int number = 9;
number ________;
System.out.println("The incremented number is: " + number);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The incremented number is: 10
```

## Ερώτημα 7

Μείωση ενός αριθμού κατά 1 χρησιμοποιώντας τον τελεστή μείωσης.

```java
int number = 7;
number ________;
System.out.println("The decremented number is: " + number);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The decremented number is: 6
```

## Ερώτημα 8

Ανάθεση ενός μηνύματος με βάση μια συνθήκη.

```java
int age = 20;
String message = (age ________) ? "Adult" : "Minor";
System.out.println("The person is: " + message);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The person is: Adult
```

## Ερώτημα 9

Αρνηση (αντιστροφή) μιας boolean τιμής.

```java
boolean isTrue = true;
boolean isFalse = ________;
System.out.println("The negated value is: " + isFalse);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The negated value is: false
```

## Ερώτημα 10

Αποτιμήστε μια λογική πράξη AND.

```java
boolean condition1 = true;
boolean condition2 = false;
boolean result = condition1 ________ condition2;
System.out.println("The AND result is: " + result);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The AND result is: false
```

## Ερώτημα 11

Αποτιμήστε μια λογική πράξη OR.

```java
boolean condition1 = true;
boolean condition2 = false;
boolean result = condition1 ________ condition2;
System.out.println("The OR result is: " + result);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The OR result is: true
```

## Ερώτημα 12

Προσδιορίστε αν ένας αριθμός είναι ζυγός χρησιμοποιώντας τον τελεστή modulo.

```java
int number = 6;
boolean isEven = number ________ 2 == 0;
System.out.println("Is the number even? " + isEven);
```

*Αναμενόμενο αποτέλεσμα:*

```text
Is the number even? true
```

## Ερώτημα 13

Υπολογίστε το άθροισμα τριών αριθμών.

```java
int a = 2;
int b = 3;
int c = 4;
int sum = ________;
System.out.println("The sum of three numbers is: " + sum);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The sum of three numbers is: 9
```

## Ερώτημα 14

Χρησιμοποιήστε τον τελεστή σύνθετης πρόσθεσης.

```java
int number = 5;
number ________ 3;
System.out.println("The updated number is: " + number);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The updated number is: 8
```

## Ερώτημα 15

Χρησιμοποιήστε τον τελεστή σύνθετου πολλαπλασιασμού.

```java
int number = 4;
number ________ 2;
System.out.println("The updated number is: " + number);
```

*Αναμενόμενο αποτέλεσμα:*

```text
The updated number is: 8
```

## Ερώτημα 16

Γράψτε ένα πρόγραμμα που να ελέγχει αν ένας μαθητής πέρασε ή απέτυχε με βάση τη βαθμολογία του. Μια βαθμολογία 50 ή περισσότερο θεωρείται επιτυχία.

```java
int score = 45;
if (score ________ 50) {
    System.out.println("You passed!");
} else {
    System.out.println("You failed.");
}
```

*Αναμενόμενο αποτέλεσμα:*

```text
You failed.
```

## Ερώτημα 17

Γράψτε ένα πρόγραμμα για να ελέγξετε αν ένας αριθμός είναι μεταξύ 10 και 20 (συμπεριλαμβανομένου).

```java
int number = 15;
if (number ________ 10 ________ number ________ 20) {
    System.out.println("The number is within the range.");
} else {
    System.out.println("The number is outside the range.");
}
```

*Αναμενόμενο αποτέλεσμα:*

```text
The number is within the range.
```

## Ερώτημα 18

Γράψτε ένα πρόγραμμα για να ελέγξετε αν ένα άτομο έχει δικαίωμα ψήφου. Η επιλεξιμότητα βασίζεται στο ότι πρέπει να είναι 18 ετών και άνω και να έχει την ιθαγένεια.

```java
int age = 19;
boolean isCitizen = true;
if (age ________ 18 ________ isCitizen) {
    System.out.println("You are eligible to vote.");
} else {
    System.out.println("You are not eligible to vote.");
}
```

*Αναμενόμενο αποτέλεσμα:*

```text
You are eligible to vote.
```

## Ερώτημα 19

Γράψτε ένα πρόγραμμα για να ελέγξετε αν ένα έτος είναι δίσεκτο. Ένα δίσεκτο έτος διαιρείται με το 4 αλλά δεν διαιρείται με το 100, εκτός αν διαιρείται με το 400.

```java
int year = 2024;
if ( (year ________ 4 == 0 ________ year ________ 100 != 0) ________ year ________ 400 == 0) {
    System.out.println("It is a leap year.");
} else {
    System.out.println("It is not a leap year.");
}
```

*Αναμενόμενο αποτέλεσμα:*

```text
It is a leap year.
```

## Ερώτημα 20

Γράψτε ένα πρόγραμμα για να προσδιορίσετε αν ένας μαθητής είναι επιλέξιμος για να
δώσει εξετάσεις για προχωρημένους. Τα κριτήρια για την επιλεξιμότητα είναι τα
εξής:

1. Ο μαθητής πρέπει να έχει βαθμό 60 ή μεγαλύτερο.
2. Εάν ο βαθμός του μαθητή είναι μεταξύ 50 και 59 (συμπεριλαμβανομένου), πρέπει
   να έχει παρακολουθήσει πάνω από το 80% των μαθημάτων για να είναι επιλέξιμος.
3. Εάν ο βαθμός του μαθητή είναι κάτω από 50, δεν είναι επιλέξιμος, ανεξάρτητα
   από την παρακολούθηση.

*Αρχικές μεταβλητές:*

```java
int grade = 55; // Example grade, you can change it
double attendancePercentage = 85.0; // Example attendance percentage, you can change it
```

*Αναμενόμενο αποτέλεσμα (Για τις δεδομένες αρχικές μεταβλητές):*

```text
Eligible for advanced exam.
```
