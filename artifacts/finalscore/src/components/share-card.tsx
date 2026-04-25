import { forwardRef } from "react";
import type { GradesResponse } from "@workspace/api-client-react";
import {
  GraduationCap,
  Trophy,
  Award,
  Target,
  BookOpen,
  Sparkles,
  Building2,
  Layers,
} from "lucide-react";

interface ShareCardProps {
  grades: GradesResponse;
}

function fmt1(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  if (!Number.isFinite(v)) return "0.0";
  return v.toFixed(1);
}

function tierLabel(p: number) {
  if (p >= 85) return { label: "ممتاز", from: "#7c3aed", to: "#a855f7" };
  if (p >= 75) return { label: "جيد جداً", from: "#059669", to: "#10b981" };
  if (p >= 65) return { label: "جيد", from: "#0284c7", to: "#0ea5e9" };
  if (p >= 50) return { label: "مقبول", from: "#d97706", to: "#f59e0b" };
  return { label: "راسب", from: "#dc2626", to: "#ef4444" };
}

const YEAR_TR: Record<string, string> = {
  First: "أولى",
  Second: "ثانية",
  Third: "ثالثة",
  Fourth: "رابعة",
  Fifth: "خامسة",
};

/**
 * Pixel-perfect 1080×1350 (4:5) share card. Renders to PNG via html-to-image.
 * Uses inline styles + brand fonts to ensure deterministic rendering.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ grades }, ref) {
    const overall = parseFloat(fmt1(grades.statistics.overall_percentage));
    const tier = tierLabel(overall);

    const yearRows = Object.entries(grades.percentages_by_year)
      .filter(([year]) => YEAR_TR[year])
      .map(([year, pcts]) => ({
        year: YEAR_TR[year] ?? year,
        total: parseFloat(fmt1(pcts.total)),
      }))
      .filter((r) => r.total > 0);

    return (
      <div
        ref={ref}
        dir="rtl"
        lang="ar"
        style={{
          width: 1080,
          height: 1350,
          fontFamily: "'Cairo', sans-serif",
          background:
            "linear-gradient(160deg, #ffffff 0%, #f5f3ff 40%, #fff7ed 100%)",
          color: "#0f172a",
          position: "relative",
          overflow: "hidden",
          padding: 64,
          boxSizing: "border-box",
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -180,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.30) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 18px 40px -10px rgba(79,70,229,0.5)",
              }}
            >
              <GraduationCap size={38} color="#fff" />
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                FINALSCORE
              </div>
              <div
                style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}
              >
                نتائج طلاب المنيا
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(15,23,42,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: "#475569",
            }}
          >
            <Sparkles size={16} color="#f59e0b" />
            بطاقة النتائج
          </div>
        </div>

        {/* Profile + overall */}
        <div
          style={{
            marginTop: 60,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 100%)",
            border: "1.5px solid rgba(15,23,42,0.06)",
            borderRadius: 32,
            padding: 36,
            display: "flex",
            gap: 28,
            alignItems: "center",
            boxShadow: "0 24px 60px -20px rgba(15,23,42,0.18)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 28,
              overflow: "hidden",
              flexShrink: 0,
              border: "4px solid #fff",
              boxShadow: "0 14px 30px -10px rgba(15,23,42,0.25)",
              background:
                "linear-gradient(135deg, #e0e7ff 0%, #fef3c7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {grades.img_data_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                src={grades.img_data_url}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <GraduationCap size={64} color="#6366f1" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                color: "#64748b",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              الطالب
            </div>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.15,
                marginBottom: 14,
              }}
            >
              {grades.full_name || grades.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontFamily: "monospace",
                  direction: "ltr",
                }}
              >
                ID • {grades.student_code}
              </span>
              {grades.faculty && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  <Building2 size={14} />
                  {grades.faculty}
                </span>
              )}
              {grades.department && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "#dcfce7",
                    color: "#166534",
                  }}
                >
                  <Layers size={14} />
                  {grades.department}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overall percentage hero */}
        <div
          style={{
            marginTop: 32,
            background: `linear-gradient(135deg, ${tier.from} 0%, ${tier.to} 100%)`,
            borderRadius: 32,
            padding: 40,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: `0 24px 60px -16px ${tier.from}80`,
            position: "relative",
            zIndex: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -80,
              left: -80,
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                opacity: 0.9,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              المعدل العام التراكمي
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                direction: "ltr",
              }}
            >
              <div
                style={{
                  fontSize: 130,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -3,
                }}
              >
                {fmt1(grades.statistics.overall_percentage)}
              </div>
              <div style={{ fontSize: 50, fontWeight: 800, opacity: 0.85 }}>
                %
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                display: "inline-block",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.25)",
                border: "1.5px solid rgba(255,255,255,0.4)",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              التقدير: {tier.label}
            </div>
          </div>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            <Trophy size={68} color="#fff" />
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
            position: "relative",
            zIndex: 2,
          }}
        >
          {[
            {
              icon: <Award size={26} color="#7c3aed" />,
              bg: "#f5f3ff",
              label: "المعدل التراكمي",
              value: grades.statistics.gpa.toFixed(2),
            },
            {
              icon: <BookOpen size={26} color="#0284c7" />,
              bg: "#f0f9ff",
              label: "إجمالي المواد",
              value: String(grades.statistics.total_courses),
            },
            {
              icon: <Target size={26} color="#d97706" />,
              bg: "#fef3c7",
              label: "السنوات",
              value: String(grades.statistics.total_years),
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1.5px solid rgba(15,23,42,0.06)",
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 10px 30px -16px rgba(15,23,42,0.12)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#0f172a",
                  direction: "ltr",
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Per-year breakdown bars */}
        {yearRows.length > 0 && (
          <div
            style={{
              marginTop: 28,
              background: "#fff",
              border: "1.5px solid rgba(15,23,42,0.06)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 10px 30px -16px rgba(15,23,42,0.12)",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 18,
              }}
            >
              معدل كل سنة دراسية
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {yearRows.map((r) => {
                const t = tierLabel(r.total);
                return (
                  <div
                    key={r.year}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 90,
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      {r.year}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 18,
                        background: "#f1f5f9",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, r.total)}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${t.from}, ${t.to})`,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: 80,
                        textAlign: "left",
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#0f172a",
                        direction: "ltr",
                      }}
                    >
                      {r.total.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 64,
            right: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            stda.minia.edu.eg • finalscore
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#64748b",
              fontWeight: 600,
              direction: "ltr",
            }}
          >
            @rival_eg
          </div>
        </div>
      </div>
    );
  },
);
