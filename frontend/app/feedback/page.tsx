'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const SOURCES = [
  'Google Search',
  'LinkedIn',
  'Friend or colleague',
  'Reddit',
  'Facebook / expat group',
  'Other',
];

function FeedbackForm() {
  const params = useSearchParams();
  const uid = params.get('uid') ?? undefined;

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    source: '',
    most_useful: '',
    missing: '',
    nps_score: null as number | null,
    name: '',
    email: '',
  });

  const set = (k: keyof typeof form, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const steps = [
    {
      id: 'source',
      question: 'How did you hear about Valryn?',
      content: (
        <div className="flex flex-col gap-3 mt-6">
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => { set('source', s); next(); }}
              className={`text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all
                ${form.source === s
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      ),
      canSkip: true,
    },
    {
      id: 'most_useful',
      question: "What's been the most useful part of Valryn so far?",
      content: (
        <div className="mt-6">
          <textarea
            autoFocus
            rows={4}
            value={form.most_useful}
            onChange={e => set('most_useful', e.target.value)}
            placeholder="e.g. the checklist, document validation, IND appointment tracker…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <button
            onClick={next}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            Continue →
          </button>
        </div>
      ),
      canSkip: true,
    },
    {
      id: 'missing',
      question: "What's missing, or what could be better?",
      content: (
        <div className="mt-6">
          <textarea
            autoFocus
            rows={4}
            value={form.missing}
            onChange={e => set('missing', e.target.value)}
            placeholder="Be honest — it helps us build something that actually works for you."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <button
            onClick={next}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            Continue →
          </button>
        </div>
      ),
      canSkip: true,
    },
    {
      id: 'nps',
      question: 'How likely are you to recommend Valryn to someone moving to the Netherlands?',
      content: (
        <div className="mt-6">
          <div className="flex gap-2 flex-wrap justify-center">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => { set('nps_score', i); next(); }}
                className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all border
                  ${form.nps_score === i
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 px-1">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      ),
      canSkip: true,
    },
    {
      id: 'contact',
      question: 'Last step — your name and email',
      subtitle: 'One person who completes this survey wins free full access to Valryn (worth €19.99). We\'ll reach out if you\'re picked.',
      content: (
        <div className="mt-6 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            {submitting ? 'Submitting…' : 'Submit feedback 🎁'}
          </button>
          <button onClick={submit} className="text-xs text-gray-400 hover:text-gray-500 text-center mt-1">
            Skip and submit anonymously
          </button>
        </div>
      ),
      canSkip: false,
    },
  ];

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1);
  }

  async function submit() {
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid ?? null,
          email: form.email || null,
          name: form.name || null,
          source: form.source || null,
          most_useful: form.most_useful || null,
          missing: form.missing || null,
          nps_score: form.nps_score,
        }),
      });
    } catch {
      // best-effort — show thank-you regardless
    }
    setDone(true);
    setSubmitting(false);
  }

  const current = steps[step];
  const progress = ((step) / steps.length) * 100;

  if (done) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Thank you!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed mb-8">
          Your feedback means a lot. We'll be in touch if you're selected for the free subscription.
        </p>
        <a
          href="https://valryn.nl"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
        >
          Back to Valryn →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-10">
        <div
          className="h-1 bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step counter */}
      <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">
        Question {step + 1} of {steps.length}
      </p>

      {/* Question */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {current.question}
      </h2>
      {current.subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          {current.subtitle}
        </p>
      )}

      {current.content}

      {/* Skip */}
      {current.canSkip && step < steps.length - 1 && (
        <button
          onClick={next}
          className="mt-4 text-xs text-gray-400 hover:text-gray-500 w-full text-center block"
        >
          Skip this question
        </button>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4">
        <a href="/" className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          Valryn
        </a>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-5 pt-16 pb-12">
        <Suspense fallback={<div />}>
          <FeedbackForm />
        </Suspense>
      </div>
    </div>
  );
}
