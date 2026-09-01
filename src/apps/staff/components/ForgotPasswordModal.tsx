import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, KeyRound, Lock, Eye, EyeOff, X, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../shared/services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'success'>('email');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Start 60s countdown timer
  const startTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send Reset OTP Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني أو اسم المستخدم.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { emailOrUsername: emailOrUsername.trim() });
      const email = response.data?.data?.email;
      if (email) {
        setMaskedEmail(email);
      }
      toast.success(response.data?.message || 'تم إرسال كود التحقق بنجاح إلى بريدك.');
      setStep('code');
      startTimer();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'تعذر إرسال كود التحقق. يرجى التحقق من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) {
      toast.error('يرجى إدخال كود التحقق المكون من 6 أرقام.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-reset-code', {
        emailOrUsername: emailOrUsername.trim(),
        code: code.trim(),
      });
      toast.success('تم التحقق من الكود بنجاح!');
      setStep('password');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'كود التحقق غير صالح أو انتهت صلاحيته.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        emailOrUsername: emailOrUsername.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep('success');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'فشلت إعادة تعيين كلمة المرور.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetModal = () => {
    setStep('email');
    setEmailOrUsername('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200"
        >
          {/* Close Button */}
          <button
            onClick={handleResetModal}
            className="absolute left-5 top-5 p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* STEP 1: Enter Email / Username */}
          {step === 'email' && (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">استرجاع كلمة المرور</h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                أدخل البريد الإلكتروني أو اسم المستخدم المرتبط بحسابك لإرسال رمز التحقق واسترجاع كلمة المرور.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">البريد الإلكتروني / اسم المستخدم</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="مثال: admin@restaurant.com أو اسم المستخدم"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-xs focus:border-[#801B2C] focus:ring-1 focus:ring-[#801B2C]/20 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#801B2C] hover:bg-[#801B2C]/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>إرسال كود التحقق</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Enter 6-digit OTP Code */}
          {step === 'code' && (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#801B2C]/10 text-[#801B2C] flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">أدخل رمز التحقق (OTP)</h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                تم إرسال كود مكوّن من 6 أرقام إلى {maskedEmail ? <strong className="text-zinc-800">{maskedEmail}</strong> : 'بريدك الإلكتروني'}.
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2 text-center">كود التحقق المكون من 6 أرقام</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full bg-[#FAF8F5] border-2 border-dashed border-[#801B2C]/40 text-center tracking-[12px] text-2xl font-black font-mono py-3 rounded-2xl focus:border-[#801B2C] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>لم يصلك الكود؟</span>
                  {resendTimer > 0 ? (
                    <span className="font-mono text-[#801B2C] font-bold">إعادة الإرسال بعد {resendTimer} ثانية</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="text-[#801B2C] font-bold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> إعادة الإرسال الآن
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#801B2C] hover:bg-[#801B2C]/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>تأكيد الرمز والمتابعة</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 'password' && (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">تعيين كلمة مرور جديدة</h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                اكتب كلمة مرور قوية لا تقل عن 6 خانات لتأمين حسابك.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FAF8F5] border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 pl-10 text-xs focus:border-[#801B2C] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">تأكيد كلمة المرور</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF8F5] border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-xs focus:border-[#801B2C] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>تحديث كلمة المرور وحفظ التغييرات</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: Success Message */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 mb-2">تم استرجاع الحساب بنجاح!</h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                تم تحديث كلمة المرور الخاصة بك بنجاح. يمكنك الآن تسجيل الدخول إلى لوحة التحكم بكلمة المرور الجديدة.
              </p>

              <button
                type="button"
                onClick={handleResetModal}
                className="w-full py-3.5 bg-[#801B2C] hover:bg-[#801B2C]/90 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                تسجيل الدخول الآن
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
