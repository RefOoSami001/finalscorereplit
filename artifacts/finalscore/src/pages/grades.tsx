import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGrades } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Download,
  Trophy,
  Target,
  BookOpen,
  Layers,
  User,
  Award,
  AlertTriangle,
  PartyPopper,
  GraduationCap,
  TrendingUp,
  ChevronDown,
  Building2,
  BookMarked,
  Share2,
  Image as ImageIcon,
  FileJson,
  Sparkles,
  Loader2,
  Copy,
  CheckCheck,
  Mail,
  CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { GradesResponse } from "@workspace/api-client-react";
import { ShareCard } from "@/components/share-card";

type Course =
  GradesResponse["grades_by_year"]["First"]["first_semester"][number];

const YEAR_TRANSLATIONS: Record<string, string> = {
  First: "الفرقة الأولى",
  Second: "الفرقة الثانية",
  Third: "الفرقة الثالثة",
  Fourth: "الفرقة الرابعة",
  Fifth: "الفرقة الخامسة",
};

function fmt1(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  if (!Number.isFinite(v)) return "0.0";
  return v.toFixed(1);
}

function tierMeta(p: number) {
  if (p >= 85)
    return {
      label: "ممتاز",
      bg: "bg-violet-100",
      text: "text-violet-700",
      ring: "ring-violet-200",
      bar: "from-violet-500 to-fuchsia-500",
      dot: "bg-violet-500",
    };
  if (p >= 75)
    return {
      label: "جيد جداً",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      bar: "from-emerald-500 to-teal-500",
      dot: "bg-emerald-500",
    };
  if (p >= 65)
    return {
      label: "جيد",
      bg: "bg-sky-100",
      text: "text-sky-700",
      ring: "ring-sky-200",
      bar: "from-sky-500 to-cyan-500",
      dot: "bg-sky-500",
    };
  if (p >= 50)
    return {
      label: "مقبول",
      bg: "bg-amber-100",
      text: "text-amber-700",
      ring: "ring-amber-200",
      bar: "from-amber-500 to-orange-500",
      dot: "bg-amber-500",
    };
  return {
    label: "راسب",
    bg: "bg-rose-100",
    text: "text-rose-700",
    ring: "ring-rose-200",
    bar: "from-rose-500 to-red-500",
    dot: "bg-rose-500",
  };
}

const CHART_COLORS = {
  excellent: "#7c3aed",
  very_good: "#10b981",
  good: "#0ea5e9",
  pass: "#f59e0b",
  fail: "#ef4444",
};

export default function GradesDashboard() {
  const [, setLocation] = useLocation();
  const { grades, setGrades } = useGrades();
  const { toast } = useToast();
  const [showCongrats, setShowCongrats] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!grades) {
      setLocation("/");
    } else if (grades.congrats_message) {
      setShowCongrats(true);
    }
  }, [grades, setLocation]);

  const pieData = useMemo(() => {
    if (!grades) return [];
    return [
      { name: "ممتاز", value: grades.statistics.grade_distribution.excellent, color: CHART_COLORS.excellent },
      { name: "جيد جداً", value: grades.statistics.grade_distribution.very_good, color: CHART_COLORS.very_good },
      { name: "جيد", value: grades.statistics.grade_distribution.good, color: CHART_COLORS.good },
      { name: "مقبول", value: grades.statistics.grade_distribution.pass, color: CHART_COLORS.pass },
      { name: "راسب", value: grades.statistics.grade_distribution.fail, color: CHART_COLORS.fail },
    ].filter((d) => d.value > 0);
  }, [grades]);

  const barData = useMemo(() => {
    if (!grades) return [];
    return Object.entries(grades.statistics.year_statistics).map(
      ([year, stats]) => ({
        name: YEAR_TRANSLATIONS[year] || year,
        percentage: Number(fmt1(stats.percentage)),
      }),
    );
  }, [grades]);

  if (!grades) return null;

  const handleLogout = () => {
    setGrades(null);
    setLocation("/");
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(grades.grades_by_year, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades_${grades.student_code}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "تم التحميل", description: "تم تحميل ملف JSON بنجاح" });
  };

  /** Render the offscreen ShareCard to a PNG data URL. */
  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: false,
        backgroundColor: "#ffffff",
      });
      return dataUrl;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const openShareDialog = async () => {
    setShareOpen(true);
    if (!imgUrl) {
      setGenerating(true);
      const url = await generateImage();
      setImgUrl(url);
      setGenerating(false);
      if (!url) {
        toast({
          variant: "destructive",
          title: "تعذر إنشاء الصورة",
          description: "حدث خطأ أثناء توليد بطاقة النتائج",
        });
      }
    }
  };

  const handleDownloadImage = async () => {
    let url = imgUrl;
    if (!url) {
      setGenerating(true);
      url = await generateImage();
      setImgUrl(url);
      setGenerating(false);
    }
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `finalscore_${grades.student_code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "تم التحميل", description: "تم حفظ بطاقة النتائج كصورة" });
  };

  const handleNativeShare = async () => {
    let url = imgUrl;
    if (!url) {
      setGenerating(true);
      url = await generateImage();
      setImgUrl(url);
      setGenerating(false);
    }
    if (!url) return;

    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `finalscore_${grades.student_code}.png`, {
        type: "image/png",
      });
      const shareText = `معدلي العام: ${fmt1(grades.statistics.overall_percentage)}% — بوابة نتائج طلاب المنيا`;
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "بطاقة نتائجي",
          text: shareText,
          files: [file],
        });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "بطاقة نتائجي", text: shareText });
        return;
      }
      // Fallback: copy text
      await navigator.clipboard.writeText(shareText);
      toast({ title: "تم النسخ", description: "تم نسخ نص المشاركة" });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({
          variant: "destructive",
          title: "تعذرت المشاركة",
          description: "متصفحك لا يدعم المشاركة المباشرة",
        });
      }
    }
  };

  const handleCopySummary = async () => {
    const lines = [
      `🎓 ${grades.full_name || grades.name}`,
      grades.faculty ? `🏛️ ${grades.faculty}` : null,
      grades.department ? `📚 ${grades.department}` : null,
      `📊 المعدل العام: ${fmt1(grades.statistics.overall_percentage)}%`,
      `🏆 المعدل التراكمي: ${grades.statistics.gpa.toFixed(2)}`,
      `📖 إجمالي المواد: ${grades.statistics.total_courses}`,
      `— FinalScore`,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: "تم النسخ", description: "تم نسخ ملخص النتائج" });
  };

  const overall = Number(fmt1(grades.statistics.overall_percentage));
  const overallTier = tierMeta(overall);

  const renderCourseRow = (course: Course, idx: number) => {
    const t = tierMeta(course.percentage);
    return (
      <motion.div
        key={`${course.course_name}-${idx}`}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.025 }}
        className="grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border transition-colors"
      >
        <div className="col-span-12 sm:col-span-6 font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
          <BookMarked className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span className="truncate">{course.course_name}</span>
        </div>
        <div
          className="col-span-4 sm:col-span-2 text-center text-muted-foreground tabular text-sm"
          dir="ltr"
        >
          {course.total_score} / {course.max_score}
        </div>
        <div className="col-span-4 sm:col-span-2 text-center text-foreground/90 font-bold text-sm">
          {course.grade}
        </div>
        <div className="col-span-4 sm:col-span-2 flex justify-center">
          <span
            className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full ring-1 ${t.bg} ${t.text} ${t.ring} font-bold tabular text-sm`}
            dir="ltr"
          >
            {course.percentage}%
          </span>
        </div>
      </motion.div>
    );
  };

  const renderSemesterBlock = (
    title: string,
    courses: Course[],
    pct: string | undefined,
  ) => {
    if (!courses || courses.length === 0) return null;
    return (
      <div className="rounded-2xl bg-background border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b border-border">
          <h4 className="font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            {title}
          </h4>
          <Badge
            variant="outline"
            className="bg-white text-foreground/90 font-bold tabular border-border"
            dir="ltr"
          >
            {fmt1(pct)}%
          </Badge>
        </div>
        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
          <div className="col-span-6">المادة</div>
          <div className="col-span-2 text-center">الدرجة</div>
          <div className="col-span-2 text-center">التقدير</div>
          <div className="col-span-2 text-center">النسبة</div>
        </div>
        <div className="p-2 space-y-1.5">{courses.map(renderCourseRow)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Offscreen share-card source */}
      <div
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <ShareCard ref={cardRef} grades={grades} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] text-muted-foreground font-semibold tracking-wider">
                FINALSCORE
              </p>
              <h1 className="font-extrabold text-foreground text-sm">
                نتائج طلاب المنيا
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={openShareDialog}
              size="sm"
              className="bg-gradient-to-r from-primary to-violet-500 hover:brightness-110 text-primary-foreground rounded-xl font-bold shadow-md"
              data-testid="button-share-results"
            >
              <Share2 className="w-4 h-4 ml-1.5" />
              <span className="hidden sm:inline">شارك النتائج</span>
              <span className="sm:hidden">شارك</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground/80 hover:bg-muted rounded-xl"
                  data-testid="button-more-actions"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDownloadImage} data-testid="menu-download-image">
                  <ImageIcon className="w-4 h-4 ml-2" />
                  تحميل كصورة
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJson} data-testid="menu-download-json">
                  <FileJson className="w-4 h-4 ml-2" />
                  تحميل كـ JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopySummary} data-testid="menu-copy-summary">
                  {copied ? (
                    <CheckCheck className="w-4 h-4 ml-2 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 ml-2" />
                  )}
                  نسخ ملخص النتائج
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Hero bento: profile + overall */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid lg:grid-cols-5 gap-4"
        >
          {/* Profile */}
          <div className="lg:col-span-3 surface glow-border rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
                className="relative shrink-0"
              >
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-white shadow-xl">
                  {grades.img_data_url ? (
                    <AvatarImage
                      src={grades.img_data_url}
                      alt={grades.name}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center shadow-md">
                  <CheckCheck className="w-3.5 h-3.5 text-white" />
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-1 font-medium">
                  مرحباً،
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                  {grades.full_name || grades.name}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono tabular font-semibold"
                    dir="ltr"
                  >
                    <span className="text-primary/60">ID</span>
                    {grades.student_code}
                  </span>

                  {grades.faculty && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 font-semibold"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {grades.faculty}
                    </motion.span>
                  )}

                  {grades.department && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {grades.department}
                    </motion.span>
                  )}

                  {grades.program && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-100 border border-sky-200 text-sky-800 font-semibold"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      {grades.program}
                    </motion.span>
                  )}

                  {grades.current_study_year && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-800 font-semibold"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      {grades.current_study_year}
                    </motion.span>
                  )}

                  {grades.email && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-100 border border-rose-200 text-rose-800 font-semibold"
                      dir="ltr"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {grades.email}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Overall percentage hero */}
          <div className="lg:col-span-2 surface rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                المعدل العام
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${overallTier.bg} ${overallTier.text} ring-1 ${overallTier.ring}`}
              >
                {overallTier.label}
              </span>
            </div>
            <div className="flex items-end gap-2 mt-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-6xl sm:text-7xl font-black text-gradient-primary tabular leading-none"
                dir="ltr"
              >
                {fmt1(grades.statistics.overall_percentage)}
              </motion.div>
              <div className="text-2xl font-bold text-muted-foreground mb-2">
                %
              </div>
            </div>
            <div className="mt-5 h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overall)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                className={`h-full rounded-full bg-gradient-to-r ${overallTier.bar}`}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span>
                {grades.statistics.total_courses} مادة على مدار{" "}
                {grades.statistics.total_years} سنوات
              </span>
            </div>
          </div>
        </motion.section>

        {/* KPI mini cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            {
              icon: <Target className="w-5 h-5" />,
              label: "النسبة المئوية",
              value: `${fmt1(grades.statistics.overall_percentage)}%`,
              tint: "text-violet-600 bg-violet-100",
            },
            {
              icon: <Trophy className="w-5 h-5" />,
              label: "المعدل التراكمي",
              value: grades.statistics.gpa.toFixed(2),
              tint: "text-emerald-600 bg-emerald-100",
            },
            {
              icon: <BookOpen className="w-5 h-5" />,
              label: "إجمالي المواد",
              value: String(grades.statistics.total_courses),
              tint: "text-sky-600 bg-sky-100",
            },
            {
              icon: <Layers className="w-5 h-5" />,
              label: "السنوات المسجلة",
              value: String(grades.statistics.total_years),
              tint: "text-amber-600 bg-amber-100",
            },
          ].map((k, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ y: -3 }}
              className="surface rounded-2xl p-4 sm:p-5 flex items-center gap-3"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.tint}`}
              >
                {k.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {k.label}
                </p>
                <p
                  className="text-lg sm:text-xl font-extrabold text-foreground tabular truncate"
                  dir="ltr"
                >
                  {k.value}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* Best / Worst */}
        {(grades.statistics.best_subject || grades.statistics.worst_subject) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="grid md:grid-cols-2 gap-4"
          >
            {grades.statistics.best_subject && (
              <motion.div
                whileHover={{ y: -3 }}
                className="surface rounded-2xl p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm">أفضل مادة</h3>
                  </div>
                  <Badge
                    className="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 font-bold tabular"
                    dir="ltr"
                  >
                    {fmt1(grades.statistics.best_subject.percentage)}%
                  </Badge>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-foreground">
                  {grades.statistics.best_subject.name}
                </h4>
                <p className="text-emerald-700/90 text-sm font-medium mt-1">
                  التقدير: {grades.statistics.best_subject.grade}
                </p>
              </motion.div>
            )}
            {grades.statistics.worst_subject && (
              <motion.div
                whileHover={{ y: -3 }}
                className="surface rounded-2xl p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-rose-500 to-red-500" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-rose-700 font-bold">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm">أقل مادة</h3>
                  </div>
                  <Badge
                    className="bg-rose-100 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 font-bold tabular"
                    dir="ltr"
                  >
                    {fmt1(grades.statistics.worst_subject.percentage)}%
                  </Badge>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-foreground">
                  {grades.statistics.worst_subject.name}
                </h4>
                <p className="text-rose-700/90 text-sm font-medium mt-1">
                  التقدير: {grades.statistics.worst_subject.grade}
                </p>
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Charts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                توزيع التقديرات
              </h3>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={900}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      background: "white",
                      border: "1px solid hsl(220 22% 90%)",
                      borderRadius: 12,
                      color: "hsl(224 47% 12%)",
                      boxShadow: "0 8px 24px -8px rgba(15,23,42,0.15)",
                    }}
                    formatter={(value: number) => [`${value} مادة`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-xs text-foreground/85 font-medium"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}{" "}
                  <span className="text-muted-foreground">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                تطور النسبة المئوية
              </h3>
            </div>
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 16, right: 8, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(220 22% 92%)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(220 12% 42%)", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(220 12% 42%)", fontSize: 11 }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(220 30% 95% / 0.6)" }}
                    contentStyle={{
                      background: "white",
                      border: "1px solid hsl(220 22% 90%)",
                      borderRadius: 12,
                      color: "hsl(224 47% 12%)",
                      boxShadow: "0 8px 24px -8px rgba(15,23,42,0.15)",
                    }}
                    formatter={(value: number) => [`${fmt1(value)}%`, "النسبة"]}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="url(#barGrad)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.section>

        {/* Year accordions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              السنوات الدراسية
            </h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              اضغط على السنة لعرض المواد
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(grades.grades_by_year)
              .filter(
                ([, data]) =>
                  data.first_semester.length > 0 ||
                  data.second_semester.length > 0,
              )
              .map(([yearKey, yearData]) => {
                const yearName = YEAR_TRANSLATIONS[yearKey] || yearKey;
                const totalPercentRaw =
                  grades.percentages_by_year[yearKey]?.total ?? "0";
                const totalPercent = fmt1(totalPercentRaw);
                const t = tierMeta(parseFloat(totalPercent));

                return (
                  <Accordion
                    key={yearKey}
                    type="single"
                    collapsible
                    className="surface rounded-2xl overflow-hidden"
                  >
                    <AccordionItem value={yearKey} className="border-none">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline group hover:bg-muted/30 [&>svg]:hidden"
                        data-testid={`accordion-year-${yearKey}`}
                      >
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.bg} ${t.text} ring-1 ${t.ring}`}
                            >
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <span className="block font-extrabold text-foreground text-base">
                                {yearName}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {yearData.first_semester.length +
                                  yearData.second_semester.length}{" "}
                                مادة
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full ring-1 ${t.bg} ${t.text} ${t.ring} font-bold tabular text-sm`}
                              dir="ltr"
                            >
                              {totalPercent}%
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-1">
                        <div className="space-y-4">
                          {renderSemesterBlock(
                            "الفصل الدراسي الأول",
                            yearData.first_semester,
                            grades.percentages_by_year[yearKey]?.first_semester,
                          )}
                          {renderSemesterBlock(
                            "الفصل الدراسي الثاني",
                            yearData.second_semester,
                            grades.percentages_by_year[yearKey]?.second_semester,
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              })}
          </div>
        </motion.section>
      </main>

      {/* Share dialog with image preview */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          <DialogHeader className="p-5 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Share2 className="w-5 h-5 text-primary" />
              شارك بطاقة نتائجك
            </DialogTitle>
          </DialogHeader>

          <div className="bg-muted/30 p-4 flex items-center justify-center min-h-[280px]">
            <AnimatePresence mode="wait">
              {generating || !imgUrl ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-8 text-muted-foreground"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">جاري إنشاء البطاقة...</p>
                </motion.div>
              ) : (
                <motion.img
                  key="preview"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  src={imgUrl}
                  alt="بطاقة النتائج"
                  className="max-h-[420px] w-auto rounded-xl shadow-lg border border-border"
                />
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-border bg-background">
            <Button
              onClick={handleNativeShare}
              disabled={!imgUrl || generating}
              className="bg-gradient-to-r from-primary to-violet-500 hover:brightness-110 text-primary-foreground font-bold rounded-xl"
              data-testid="button-native-share"
            >
              <Share2 className="w-4 h-4 ml-2" />
              مشاركة
            </Button>
            <Button
              onClick={handleDownloadImage}
              disabled={!imgUrl || generating}
              variant="outline"
              className="rounded-xl font-bold"
              data-testid="button-download-image"
            >
              <Download className="w-4 h-4 ml-2" />
              تحميل
            </Button>
            <Button
              onClick={handleCopySummary}
              variant="outline"
              className="rounded-xl font-bold"
              data-testid="button-copy-summary"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4 ml-2 text-emerald-600" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ ملخص
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Congrats Modal */}
      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="sm:max-w-md text-center p-8 border-border bg-gradient-to-b from-white to-amber-50 text-foreground rounded-3xl shadow-2xl">
          <DialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_15px_40px_-10px_hsl(var(--accent))] pulse-ring"
            >
              <PartyPopper className="w-10 h-10 text-amber-950" />
            </motion.div>
            <DialogTitle className="text-2xl font-extrabold text-foreground mb-1 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              تهانينا!
              <Sparkles className="w-5 h-5 text-amber-500" />
            </DialogTitle>
          </DialogHeader>
          <p className="text-base font-medium text-foreground/90 leading-relaxed py-4">
            {grades.congrats_message}
          </p>
          <Button
            onClick={() => setShowCongrats(false)}
            className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-amber-950 border-none mt-2"
          >
            شكراً لك
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
