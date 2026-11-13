
'use client';

import { useState } from 'react';
import { toast, Toaster } from 'sonner';
import { adminLogin } from '@/services/auth.service';
import TextInput from '@/components/admin/common/form/TextInput';
import BrandMark from "@/components/brand/BrandMark";
import { useRouter } from 'next/navigation';


export default function AdminLoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
    adminLogin(formData.email, formData.password)
      .then((response) => {
        console.log('Login successful:', response);
        if (response && response.token) {
          localStorage.setItem('authToken', response.token);
        }
        toast.success('Login successful!');
        // Handle successful login (e.g., redirect to dashboard)
        router.push('/admin'); // Replace with your dashboard route
      })
      .catch((error) => {
        setErrors(error.errors || {});
        toast.error(error?.message || 'Login failed. Please check your credentials.');
      });
  }; 

  return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-[var(--surface)] shadow-[0_30px_100px_rgba(15,23,42,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-[var(--ink)] p-8 text-[var(--cream)] lg:block xl:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,_rgba(59,130,246,0.28),_transparent_35%),linear-gradient(315deg,_rgba(16,185,129,0.2),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-[2px] bg-[var(--noir)] shadow-black/20">
                  <BrandMark size={32} className="text-[var(--gold)]" />
                </div>
                <div>
                  <p className="font-display text-[18px] font-semibold tracking-[3px]">ROYAL ZAAD</p>
                  <p className="text-sm text-white/70">Admin access portal</p>
                </div>
              </div>

              <div className="max-w-md space-y-5">
                <p className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                  Sign in to manage your store.
                </p>
                <p className="text-sm leading-7 text-white/70">
                  Secure access to your dashboard, product management, inventory, orders, and reports.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10 xl:p-12">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-2 text-center lg:text-left">
                <p className="font-body text-[10px] font-bold uppercase tracking-[3px] text-[var(--gold-deep)]">
                  Admin Login
                </p>
                <h1 className="font-display text-[28px] font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
                  Welcome back
                </h1>
                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                  Sign in to access the dashboard and manage your store.
                </p>
              </div>
              <Toaster position="top-right" richColors />

              <form className="space-y-5" onSubmit={handleSubmit}>
                <TextInput 
                  label="Email" 
                  type="email" 
                  name="email"
                  value={formData.email}
                  error={errors.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: '' });
                  }}
                  placeholder="you@royalzaad.com" 
                />

                <TextInput 
                  label="Password" 
                  type="password" 
                  name="password"
                  value={formData.password}
                  error={errors.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: '' });
                  }}
                  placeholder="Enter your password" 
                />
               
                <button type="button" className="font-body text-[11px] text-[var(--ink-muted)] hover:text-[var(--gold-deep)] cursor-pointer">
                      Forgot password?
                </button>

                {/* <label className="flex items-center gap-3 font-body text-[11.5px] text-[var(--ink-muted)]">
                  <input type="checkbox" className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--ink)] focus:ring-slate-950" />
                  Keep me signed in
                </label> */}

                <button className="flex w-full items-center justify-center rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-4 py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06]">
                  SIGN IN TO THE SUITE
                </button>

                {/* <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-[var(--cream-2)]" />
                  <span className="text-xs uppercase tracking-[0.24em] text-[var(--ink-muted)]">or</span>
                  <div className="h-px flex-1 bg-[var(--cream-2)]" />
                </div> */}
              </form>

              {/* <p className="text-center font-body text-[11.5px] text-[var(--ink-muted)] lg:text-left">
                Need an account? <span className="font-medium text-[var(--ink)]">Contact your store admin.</span>
              </p> */}
            </div>
          </div>
        </div>
      </div>
  );
}