import type {
  Course,
  GradesByYear,
  Statistics,
  Semester,
} from "@workspace/api-zod";

function pctToGpa(pct: number): number {
  if (pct >= 90) return 4.0;
  if (pct >= 85) return 3.7;
  if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0;
  if (pct >= 70) return 2.7;
  if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0;
  if (pct >= 55) return 1.7;
  if (pct >= 50) return 1.0;
  return 0.0;
}

export function calculateStatistics(gradesByYear: GradesByYear): Statistics {
  const stats: Statistics = {
    total_courses: 0,
    total_years: 0,
    overall_percentage: 0,
    gpa: 0,
    grade_distribution: {
      excellent: 0,
      very_good: 0,
      good: 0,
      pass: 0,
      fail: 0,
    },
    year_statistics: {},
    average_by_semester: {},
    best_subject: null,
    worst_subject: null,
  };

  const allCourses: Course[] = [];
  let totalScoreSum = 0;
  let totalMaxSum = 0;

  const years = ["First", "Second", "Third", "Fourth", "Fifth"] as const;
  for (const year of years) {
    const semesters = gradesByYear[year] as Semester | undefined;
    if (!semesters) continue;

    let yearTotal = 0;
    let yearMax = 0;
    let yearCourseCount = 0;

    for (const semesterName of ["first_semester", "second_semester"] as const) {
      const semCourses = semesters[semesterName] ?? [];
      stats.total_courses += semCourses.length;

      let semTotal = 0;
      let semMax = 0;

      for (const course of semCourses) {
        allCourses.push(course);
        const total = Number(course.total_score) || 0;
        const max = Number(course.max_score) || 0;
        totalScoreSum += total;
        totalMaxSum += max;
        yearTotal += total;
        yearMax += max;
        semTotal += total;
        semMax += max;
        yearCourseCount += 1;

        const pct = course.percentage ?? 0;
        if (pct >= 85) stats.grade_distribution.excellent += 1;
        else if (pct >= 75) stats.grade_distribution.very_good += 1;
        else if (pct >= 65) stats.grade_distribution.good += 1;
        else if (pct >= 50) stats.grade_distribution.pass += 1;
        else stats.grade_distribution.fail += 1;
      }

      if (semCourses.length > 0) {
        stats.average_by_semester[`${year}_${semesterName}`] = {
          percentage: semMax > 0 ? (semTotal / semMax) * 100 : 0,
          courses_count: semCourses.length,
        };
      }
    }

    if (yearCourseCount > 0 && yearMax > 0) {
      stats.year_statistics[year] = {
        percentage: (yearTotal / yearMax) * 100,
        courses_count: yearCourseCount,
        average: yearTotal / yearMax,
      };
      stats.total_years += 1;
    }
  }

  if (totalMaxSum > 0) {
    stats.overall_percentage = (totalScoreSum / totalMaxSum) * 100;
  }

  if (allCourses.length > 0) {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const course of allCourses) {
      const points = pctToGpa(course.percentage ?? 0);
      const credits = 3;
      totalPoints += points * credits;
      totalCredits += credits;
    }
    stats.gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    const best = allCourses.reduce((a, b) =>
      (b.percentage ?? 0) > (a.percentage ?? 0) ? b : a,
    );
    const worst = allCourses.reduce((a, b) =>
      (b.percentage ?? 0) < (a.percentage ?? 0) ? b : a,
    );
    stats.best_subject = {
      name: best.course_name ?? "",
      percentage: best.percentage ?? 0,
      grade: best.grade ?? "",
    };
    stats.worst_subject = {
      name: worst.course_name ?? "",
      percentage: worst.percentage ?? 0,
      grade: worst.grade ?? "",
    };
  }

  return stats;
}
