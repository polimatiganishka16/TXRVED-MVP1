'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AssessmentShell from './AssessmentShell';
import SubmitScreen from './SubmitScreen';

function normalizeQuestionType(rawType) {
  const simplified = String(rawType ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const typeMap = {
    short_text: 'short_text',
    shorttext: 'short_text',
    short: 'short_text',
    mcq: 'mcq',
    multiple_choice: 'mcq',
    multiplechoice: 'mcq',
    multiple_choice_question: 'mcq',
    yes_no: 'yes_no',
    yesno: 'yes_no',
    yes_no_reasoning: 'yes_no',
    multi_select: 'multi_select',
    multiselect: 'multi_select',
    multi_image: 'multi_select',
    multi_select_image: 'multi_select',
    drag_rank: 'drag_rank',
    draganddropranking: 'drag_rank',
    drag_drop: 'drag_rank',
    drag_drop_ranking: 'drag_rank',
    drag_and_drop: 'drag_rank',
    drag_and_drop_ranking: 'drag_rank',
    audio: 'audio',
    audio_response: 'audio',
    video: 'video',
    video_response: 'video',
  };

  return typeMap[simplified] || simplified || 'short_text';
}

function parseOptions(rawOptions) {
  if (Array.isArray(rawOptions)) {
    return rawOptions.map((option, optionIndex) => {
      if (typeof option === 'string') {
        const trimmed = option.trim();
        const keyMatch = trimmed.match(/^([A-Za-z])[\s.:-]*(.*)$/);
        return {
          key: keyMatch ? keyMatch[1].toUpperCase() : String.fromCharCode(65 + optionIndex),
          text: keyMatch ? (keyMatch[2] || trimmed).trim() : trimmed,
        };
      }

      if (option && typeof option === 'object') {
        const textValue = option.optionText ?? option.text ?? option.label ?? option.value ?? option.choice ?? option.labelText ?? `Option ${optionIndex + 1}`;
        const rawKey = option.key ?? option.value ?? option.id ?? String.fromCharCode(65 + optionIndex);
        const key = String(rawKey).trim().toUpperCase();

        return {
          key: key.length <= 1 ? key : key[0],
          text: typeof textValue === 'string' ? textValue.trim() : String(textValue),
          icon: option.icon ?? undefined,
          imageUrl: option.imageUrl ?? undefined,
        };
      }

      return {
        key: String.fromCharCode(65 + optionIndex),
        text: `Option ${optionIndex + 1}`,
      };
    });
  }

  if (typeof rawOptions === 'string') {
    const trimmed = rawOptions.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return parseOptions(parsed);
    } catch (error) {
      return trimmed
        .split(/\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
          key: String.fromCharCode(65 + index),
          text: line,
        }));
    }
  }

  if (rawOptions && typeof rawOptions === 'object') {
    if (Array.isArray(rawOptions.choices)) return parseOptions(rawOptions.choices);
    if (Array.isArray(rawOptions.options)) return parseOptions(rawOptions.options);
    if (Array.isArray(rawOptions.items)) return parseOptions(rawOptions.items);
  }

  return [];
}

function normalizeItems(rawItems, fallbackOptions = []) {
  const sourceItems = Array.isArray(rawItems) ? rawItems : [];
  const sourceOptions = Array.isArray(fallbackOptions) ? fallbackOptions : [];
  const normalized = [];

  const entries = sourceItems.length > 0 ? sourceItems : sourceOptions;

  entries.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const label = entry.trim();
      normalized.push({
        id: `item-${index + 1}`,
        label: label || `Item ${index + 1}`,
        icon: '🧩',
      });
      return;
    }

    if (entry && typeof entry === 'object') {
      const label = entry.label ?? entry.text ?? entry.optionText ?? entry.value ?? entry.title ?? entry.name ?? '';
      const rawId = entry.id ?? entry.key ?? entry.value ?? entry.slug ?? '';
      const id = String(rawId || `item-${index + 1}`).trim();
      const item = {
        id: id || `item-${index + 1}`,
        label: typeof label === 'string' ? label.trim() : String(label || `Item ${index + 1}`),
        icon: entry.icon ?? '🧩',
      };

      if (normalized.some((existing) => existing.id === item.id)) {
        item.id = `item-${index + 1}-${normalized.length + 1}`;
      }

      normalized.push(item);
    }
  });

  return normalized;
}

function normalizeQuestion(question, index) {
  const normalizedType = normalizeQuestionType(question.questionType || question.type || 'short_text');
  const baseQuestion = {
    id: question.id,
    scenarioId: question.scenarioId ?? question.scenario_id,
    number: question.orderNo ?? question.number ?? index + 1,
    type: normalizedType,
    question: question.questionText || question.question || question.prompt || 'Untitled question',
  };

  const placeholder = question.placeholder || question.meta?.placeholder || question.config?.placeholder;
  if (placeholder) {
    baseQuestion.placeholder = placeholder;
  }

  const reasoningPlaceholder = question.reasoningPlaceholder || question.meta?.reasoningPlaceholder || question.config?.reasoningPlaceholder;
  if (reasoningPlaceholder) {
    baseQuestion.reasoningPlaceholder = reasoningPlaceholder;
  }

  const maxSelections = question.maxSelections ?? question.meta?.maxSelections ?? question.config?.maxSelections ?? (normalizedType === 'multi_select' ? 2 : undefined);
  if (maxSelections !== undefined) {
    baseQuestion.maxSelections = maxSelections;
  }

  const optionsSource = question.options ?? question.meta?.options ?? question.config?.options ?? question.choices ?? question.rankItems ?? question.items ?? [];
  const mappedOptions = parseOptions(optionsSource);
  baseQuestion.options = mappedOptions;

  if (normalizedType === 'drag_rank') {
    const normalizedItems = normalizeItems(question.items ?? question.rankItems ?? question.meta?.items ?? question.config?.items ?? [], mappedOptions);
    baseQuestion.items = normalizedItems.length > 0
      ? normalizedItems
      : mappedOptions.map((option, optionIndex) => ({
        id: `item-${optionIndex + 1}`,
        label: option.text || `Item ${optionIndex + 1}`,
        icon: option.icon ?? '🧩',
      }));
  }

  if (normalizedType === 'audio') {
    // preserve raw candidate for logging and normalize to a usable URL on the client
    const rawAudio = question.audioSrc || question.audioUrl || question.src || question.url || question.mediaUrl || question.mediaSrc || question.meta?.audioSrc || question.config?.audioSrc;
    baseQuestion._rawAudio = rawAudio;
    baseQuestion.audioSrc = typeof rawAudio === 'string' && rawAudio.trim()
      ? rawAudio.trim()
      : (question.scenarioId || question.scenario_id) && (question.number || question.orderNo)
        ? `/audios/scenario${question.scenarioId ?? question.scenario_id}-q${question.number ?? question.orderNo}.mp3`
        : '/audios/default.mp3';
    baseQuestion.transcript = Array.isArray(question.transcript) ? question.transcript : [];
    baseQuestion.placeholder = baseQuestion.placeholder || 'Describe what you heard...';
  }

  if (normalizedType === 'video') {
    const rawVideo = question.videoSrc || question.videoUrl || question.src || question.url || question.mediaUrl || question.mediaSrc || question.meta?.videoSrc || question.config?.videoSrc;
    baseQuestion._rawVideo = rawVideo;
    baseQuestion.videoSrc = typeof rawVideo === 'string' && rawVideo.trim()
      ? rawVideo.trim()
      : (question.scenarioId || question.scenario_id) && (question.number || question.orderNo)
        ? `/videos/scenario${question.scenarioId ?? question.scenario_id}-q${question.number ?? question.orderNo}.mp4`
        : '/videos/default.mp4';
    baseQuestion.videoDescription = question.videoDescription || question.meta?.videoDescription || question.config?.videoDescription || 'Watch the scenario video to inform your response.';
    baseQuestion.videoNote = question.videoNote || question.meta?.videoNote || question.config?.videoNote || 'Scenario video reference';
    baseQuestion.placeholder = baseQuestion.placeholder || 'Describe what you observed...';
  }

  if (normalizedType === 'multi_select' && (question.imageSrc || question.imageUrl || question.meta?.imageSrc || question.config?.imageSrc)) {
    baseQuestion.imageSrc = question.imageSrc || question.imageUrl || question.meta?.imageSrc || question.config?.imageSrc;
    baseQuestion.imageCaption = question.imageCaption || question.meta?.imageCaption || question.config?.imageCaption;
  }

  if (normalizedType === 'short_text' && !baseQuestion.placeholder) {
    baseQuestion.placeholder = 'Share a thoughtful response in 15-40 meaningful words.';
  }

  if (normalizedType === 'yes_no' && !baseQuestion.reasoningPlaceholder) {
    baseQuestion.reasoningPlaceholder = 'Explain your reasoning in detail...';
  }

  return baseQuestion;
}

export default function DynamicAssessmentClient({ scenario, questions }) {
  const router = useRouter();
  const [phase, setPhase] = useState('assessment');
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [questionTimings, setQuestionTimings] = useState({});
  const [started, setStarted] = useState(false);

  const normalizedQuestions = [...questions]
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
    .map((question, index) => normalizeQuestion(question, index));

  useEffect(() => {
    if (started) return;

    const startExamAttempt = async () => {
      try {
        setStarted(true);
        const res = await fetch('/api/assessment/start', {
          method: 'POST',
        });

        const data = await res.json();
        setAttemptId(data.attemptId);
        sessionStorage.setItem('iecbp_attemptId', String(data.attemptId));
      } catch (error) {
        console.error('Start attempt failed:', error);
      }
    };

    startExamAttempt();
  }, [started]);

  const handleAnswer = (questionId, value) => {
    console.log('handleAnswer', questionId, value);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleFinish = async (data) => {
    try {
      setQuestionTimings(data.questionTimings);

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId,
          scenarioId: scenario.id,
          answers: data.answers,
          questionTimings: data.questionTimings,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPhase('submit');
      } else {
        alert('Failed to save submission');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Something went wrong');
    }
  };

  const handleRestart = () => {
    router.push('/dashboard/candidate');
  };

  const handleBackToAssessment = () => {
    setPhase('assessment');
  };

  const meta = {
    id: scenario.id,
    title: scenario.title,
    category: scenario.category,
    level: scenario.level || 'Intermediate',
    totalQuestions: normalizedQuestions.length,
    minutes: 45,
    icon: scenario.icon || '🧩',
    accent: scenario.levelColor || '#6366F1',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {phase === 'assessment' ? (
            <motion.div
              key="assessment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AssessmentShell
                meta={meta}
                questions={normalizedQuestions}
                answers={answers}
                onAnswer={handleAnswer}
                onFinish={handleFinish}
              />
            </motion.div>
          ) : (
            <motion.div
              key="submit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <SubmitScreen
                meta={meta}
                questions={normalizedQuestions}
                answers={answers}
                questionTimings={questionTimings}
                onRestart={handleRestart}
                onBack={handleBackToAssessment}
                attemptId={attemptId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
