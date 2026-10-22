/**
 * Sample deadlines and classes for the hero design previews ONLY. Every
 * title starts with "Δείγμα" and the preview pages carry a banner, so this
 * can't be mistaken for real coursework. Times are relative to the build so
 * the views always look populated. (The leading underscore keeps this file
 * from becoming a page.)
 */
import { courseRef, getAnnouncements, getCourses } from '~/lib/content';
import { weekTimetable, workloadForecast, type ClassSlot, type DeadlineItem } from '~/lib/derive';
import { addDays, athensDateKey, parseAthensDateTime } from '~/lib/time';

export async function sampleDesktop(now: Date) {
  const courses = await getCourses();
  const pick = (id: string) => courseRef(courses.find((c) => c.id === id)!);
  const [web, uml, net] = [pick('cn4003'), pick('cn4000'), pick('cn4002')];

  const today = athensDateKey(now);
  const at = (days: number, time: string) => {
    const r = parseAthensDateTime(`${addDays(today, days)}T${time}`);
    if (!r.ok) throw new Error(r.reason);
    return r.date;
  };

  const deadlines: DeadlineItem[] = [
    { id: 'sample/1', title: 'Δείγμα: Εργασία 1 — Στατική ιστοσελίδα', type: 'coursework', due: at(1, '23:59'), weight: 20, course: web },
    { id: 'sample/2', title: 'Δείγμα: Κουίζ UML', type: 'quiz', due: at(3, '12:00'), weight: 5, course: uml },
    { id: 'sample/3', title: 'Δείγμα: Άσκηση υποδικτύωσης', type: 'exercise', due: at(6, '23:59'), course: net },
    { id: 'sample/4', title: 'Δείγμα: Διάγραμμα κλάσεων', type: 'coursework', due: at(10, '23:59'), weight: 25, course: uml },
    { id: 'sample/5', title: 'Δείγμα: Εργασία 2 — Responsive', type: 'coursework', due: at(17, '23:59'), weight: 30, course: web },
    { id: 'sample/6', title: 'Δείγμα: Εξέταση εργαστηρίου', type: 'exam', due: at(24, '10:00'), weight: 40, course: net },
  ];

  const slots: ClassSlot[] = [
    { day: 'tue', start: '09:10', end: '13:00', room: 'Δείγμα · Αίθουσα 2.1', course: uml },
    { day: 'wed', start: '15:10', end: '18:00', course: net },
    { day: 'thu', start: '08:30', end: '12:00', room: 'Δείγμα · Εργαστήριο 1', course: web },
  ];

  return {
    deadlines,
    week: weekTimetable(slots, now),
    forecast: workloadForecast(deadlines, now, 6),
    announcements: await getAnnouncements(),
    courses,
  };
}
