
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BackgroundFX } from '@/components/background/BackgroundFX';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { api } from '@/lib/axios';

export default function Careers() {
  useDocumentTitle('Careers | Proxima');

  const startAuth = (intent: 'login' | 'signup') => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google?intent=${intent}`;
  };
  const handleSignup = () => startAuth('signup');

  return (
    <BackgroundFX id="top" intensity="low" ambient mesh beams particles spotlight grain className="min-h-screen overflow-x-hidden flex flex-col">
      <LandingNav onSignup={handleSignup} />
      
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 sm:px-8 pt-36 pb-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-6 mb-20">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-text-primary">
            Careers at Proxima
          </h1>
          <p className="max-w-2xl font-sans text-lg text-text-secondary leading-relaxed">
            Help us build the next generation of AI-native document intelligence.
          </p>
        </div>

        {/* Current Status */}
        <section className="mb-12">
          <div className="bg-surface/50 border border-border p-8 rounded-2xl">
            <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">Current Status</h2>
            <p className="font-sans text-base text-text-secondary leading-relaxed mb-4">
              We are currently in the early stages of building Proxima and are <strong>not actively hiring</strong> for full-time roles at this moment. Proxima is actively being built and iterated upon to refine our core product experience.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              As we scale and expand our capabilities, future opportunities across engineering, product, and go-to-market will open up.
            </p>
          </div>
        </section>

        {/* Collaboration */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4 border-b border-border/50 pb-2">Collaboration & Open Source</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed mb-4">
            Even though we aren't hiring full-time right now, we are always open to connecting with passionate individuals interested in:
          </p>
          <ul className="list-disc pl-5 font-sans text-base text-text-secondary space-y-2 mb-6">
            <li>Internships and academic partnerships</li>
            <li>Open-source collaboration</li>
            <li>Future engineering and design roles</li>
          </ul>
          
          <div className="flex justify-start">
            <Link to="/contact" tabIndex={-1}>
              <Button variant="primary">
                Contact Us
              </Button>
            </Link>
          </div>
        </section>

      </main>

      <LandingFooter />
    </BackgroundFX>
  );
}
