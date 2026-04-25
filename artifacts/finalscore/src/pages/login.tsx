import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFetchGrades } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useGrades } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Instagram,
  IdCard,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "الرقم القومي مطلوب")
    .max(14, "الرقم القومي يجب أن يكون 14 رقماً")
    .regex(/^[0-9]+$/, "يجب إدخال أرقام إنجليزية فقط"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setGrades } = useGrades();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const fetchGrades = useFetchGrades();

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    fetchGrades.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setGrades(data);
          setLocation("/grades");
        },
        onError: (error: unknown) => {
          const e = error as { error?: string } | undefined;
          toast({
            variant: "destructive",
            title: "خطأ في تسجيل الدخول",
            description: e?.error || "حدث خطأ غير متوقع. حاول مرة أخرى.",
          });
        },
      },
    );
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-primary/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full bg-accent/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-sky-400/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="surface-soft glow-border rounded-3xl p-8 sm:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 14,
                delay: 0.1,
              }}
              className="relative animate-floaty"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-primary/80 flex items-center justify-center shadow-[0_18px_40px_-12px_hsl(var(--primary))]">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 text-[26px] sm:text-[30px] font-extrabold leading-tight"
            >
              <span className="text-gradient-primary">بوابة نتائج</span>{" "}
              <span className="text-foreground">طلاب المنيا</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              غير تابع لجهة رسمية
            </motion.p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold text-sm flex items-center gap-2">
                      <IdCard className="w-3.5 h-3.5 text-primary" />
                      الرقم القومي
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="14 رقم"
                        className="h-12 bg-white border-border text-lg tabular focus-visible:ring-primary"
                        maxLength={14}
                        data-testid="input-username"
                        dir="ltr"
                        autoComplete="username"
                        inputMode="numeric"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/[٠-٩]/.test(val)) {
                            toast({
                              title: "تنبيه",
                              description:
                                "يرجى كتابة الأرقام باللغة الإنجليزية",
                            });
                          }
                          field.onChange(val.replace(/[^0-9]/g, ""));
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold text-sm flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                      كلمة المرور
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="كلمة مرور البوابة"
                          className="h-12 bg-white border-border text-lg pr-12 focus-visible:ring-primary"
                          data-testid="input-password"
                          dir="ltr"
                          autoComplete="current-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="button-toggle-password"
                          aria-label="إظهار/إخفاء كلمة المرور"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-destructive font-medium" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="group w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary via-violet-500 to-primary/90 hover:brightness-110 text-primary-foreground shadow-[0_12px_30px_-10px_hsl(var(--primary))] transition-all"
                disabled={fetchGrades.isPending}
                data-testid="button-submit-login"
              >
                {fetchGrades.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري جلب النتائج...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    عرض النتائج
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="https://www.instagram.com/rival_eg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-foreground bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white hover:opacity-90 transition-opacity shadow-md"
              data-testid="link-instagram"
            >
              <Instagram className="w-4 h-4" />
              Follow
            </a>
            <a
              href="https://t.me/RefOoSami"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-telegram"
            >
              Made with ❤ by RefOo Sami
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
