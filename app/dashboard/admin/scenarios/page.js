'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';



const TYPE_META = {
  'MCQ':                  { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.3)'  },
  'Short Text':           { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)'   },
  'Yes / No + Reasoning': { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.3)'  },
  'Multi-Select':         { color: '#818CF8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)'  },
  'Multi-Select + Image': { color: '#818CF8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)'  },
  'Drag & Drop Ranking':  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'   },
  'Audio':                { color: '#34D399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)'   },
  'Video':                { color: '#FB923C', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.3)'   },
};
const DISPLAY_TYPE = {
  mcq: "MCQ",
  short_text: "Short Text",
  yes_no: "Yes / No + Reasoning",
  multi_select: "Multi-Select",
  multi_image: "Multi-Select + Image",
  drag_rank: "Drag & Drop Ranking",
  audio: "Audio",
  video: "Video",
};
function TypeBadge({ type }) {
  const m = TYPE_META[type] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' };
  return (
    <span style={{
      padding: '2px 9px', borderRadius: '999px',
      background: m.bg, border: `1px solid ${m.border}`,
      fontSize: '10px', fontWeight: 600, color: m.color, letterSpacing: '0.4px',
      whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>{type.toUpperCase()}</span>
  );
}

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState(null);
  const router = useRouter();

  const fetchScenarios = async () => {
  try {
    const response = await fetch("/api/admin/scenarios");
    const data = await response.json();

    setScenarios(data);
    setSelected(data[0] || null);
  } catch (error) {
    console.error("Failed to fetch scenarios:", error);
  }
};

  useEffect(() => {
    const timeoutId = setTimeout(fetchScenarios, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  const deleteScenario = async (id) => {
  try {
    const response = await fetch(`/api/admin/scenarios/${id}`, {
      method: "DELETE",
    });

    if (response.status === 404) {
      await fetchScenarios();
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to delete");
    }

    await fetchScenarios();
  } catch (error) {
    console.error(error);
    alert("Failed to delete scenario");
  }
};
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* PAGE HEADER */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '999px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '0.75rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1', boxShadow: '0 0 8px #6366F1' }} />
            <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 600, letterSpacing: '0.5px' }}>SCENARIO MANAGEMENT</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.85rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '-0.3px' }}>Scenarios</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Manage all evaluation scenarios — view questions, types, and options.</p>
        </div>
        <motion.button whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(99,102,241,0.4)' }} whileTap={{ scale: 0.97 }}
onClick={() => router.push('/dashboard/admin/scenarios/create')}          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Scenario
        </motion.button>
      </motion.div>

      {/* SPLIT LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT — list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {scenarios.map((s, i) => {
            const isActive = selected?.id === s.id;
            const isHov = hoveredId === s.id;
            return (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}
                onMouseEnter={() => setHoveredId(s.id)} onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelected(s)}
                style={{
                  background: isActive ? 'linear-gradient(145deg, #243350, #2a3d5e)' : 'linear-gradient(145deg, #1B273A, #22314A)',
                  border: isActive ? '1.5px solid rgba(99,102,241,0.45)' : isHov ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px', padding: '1rem 1.1rem', cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: isActive ? '0 0 28px rgba(99,102,241,0.18), 0 8px 24px rgba(0,0,0,0.25)' : isHov ? '0 8px 24px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.15)',
                  position: 'relative', overflow: 'hidden',
                }}>
                {isActive && <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)' }} />}
                {isActive && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '3px', borderRadius: '0 2px 2px 0', background: 'linear-gradient(180deg, #6366F1, #7C3AED)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{s.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isActive ? '#F8FAFC' : '#94A3B8', lineHeight: 1.35, fontFamily: "'Plus Jakarta Sans', sans-serif", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    S{i+1}. {s.title}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: `${s.levelColor}18`, border: `1px solid ${s.levelColor}35`, color: s.levelColor }}>{s.level}</span>
                    <span style={{ fontSize: '10px', color: '#475569' }}>{s.questions.length}Q</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { color: '#60A5FA', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>, action: () => router.push(`/dashboard/admin/scenarios/edit/${s.id}`) },
                      { color: '#F87171', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>, action: () => {
    setScenarioToDelete(s);
    setShowDeleteModal(true);
  } },
                    ].map((btn, bi) => (
                      <motion.button key={bi} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); btn.action(); }}
                        style={{ width: '26px', height: '26px', borderRadius: '7px', background: `${btn.color}12`, border: `1px solid ${btn.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: btn.color }}>
                        {btn.icon}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* RIGHT — detail */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.35 }}>

              {/* Scenario header */}
              <div style={{ background: 'linear-gradient(145deg, #1E2A40, #24324A)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '20px', padding: '1.75rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{selected.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#6366F1', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selected.category.toUpperCase()}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: `${selected.levelColor}18`, border: `1px solid ${selected.levelColor}35`, color: selected.levelColor }}>{selected.level}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818CF8' }}>{selected.questions.length} Questions</span>
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', margin: 0, lineHeight: 1.35 }}>{selected.title}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {[
                      { label: 'Edit', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', action: () => router.push(`/dashboard/admin/scenarios/edit/${selected.id}`) },
                      { label: 'Delete', color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', action: () => {
    setScenarioToDelete(selected);
    setShowDeleteModal(true);
  } },
                    ].map((btn) => (
                      <motion.button key={btn.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={btn.action}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', background: btn.bg, border: `1px solid ${btn.border}`, cursor: 'pointer', color: btn.color, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', fontWeight: 600 }}>
                        {btn.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 1rem' }} />
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#475569', marginBottom: '0.5rem' }}>DESCRIPTION</div>
                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.75, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selected.description}</p>
              </div>

              {/* Questions */}
              <div style={{ background: 'linear-gradient(145deg, #1B273A, #22314A)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', color: '#475569', marginBottom: '3px' }}>ALL QUESTIONS</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', fontFamily: "'Playfair Display', serif" }}>{selected.questions.length} Questions in this Scenario</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[...selected.questions]
  .sort((a, b) => a.orderNo - b.orderNo)
  .map((q, i) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(99,102,241,0.3)' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>Q{i + 1}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: '6px' }}><TypeBadge
  type={DISPLAY_TYPE[q.questionType] || q.questionType}
/></div>
                          <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{q.questionText}</p>
                          {q.options && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {q.options.map((opt, oi) => {
                                const optKey = typeof opt === 'string' ? opt.charAt(0) : '';
                                const isCorrect = q.correct && q.correct === optKey;
                                return (
                                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '8px', background: isCorrect ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.02)', border: isCorrect ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.04)' }}>
                                    {isCorrect && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                    <span style={{ fontSize: '12px', color: isCorrect ? '#4ADE80' : '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: isCorrect ? 500 : 400 }}>{opt.optionText}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
   {showDeleteModal && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.78)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      style={{
        width: '500px',
        borderRadius: '24px',
        overflow: 'hidden',
        background:
          'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))',
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow:
          '0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(99,102,241,0.2)',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: '4px',
          background: 'linear-gradient(90deg,#6366F1,#8B5CF6)',
        }}
      />

      <div style={{ padding: '32px' }}>
        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '22px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
          }}
        >
          🗑️
        </div>

        {/* Title */}
        <h2
          style={{
            textAlign: 'center',
            color: '#F8FAFC',
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Delete Scenario
        </h2>

        {/* Description */}
        <p
          style={{
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '15px',
            lineHeight: 1.8,
            marginBottom: '28px',
          }}
        >
          You are about to permanently remove this scenario from the
          evaluation system.
        </p>

        {/* Warning Box */}
        <div
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#F87171',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            ⚠️ Warning
          </div>

          <div
            style={{
              color: '#CBD5E1',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            This action cannot be undone once confirmed.
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowDeleteModal(false);
              setScenarioToDelete(null);
            }}
            style={{
              height: '54px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#CBD5E1',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.02,
              boxShadow: '0 0 30px rgba(99,102,241,0.4)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
  await deleteScenario(scenarioToDelete.id);

  setShowDeleteModal(false);
  setScenarioToDelete(null);
}}
            style={{
              height: '54px',
              border: 'none',
              borderRadius: '14px',
              background:
                'linear-gradient(135deg,#6366F1,#8B5CF6)',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete Scenario
          </motion.button>
        </div>
      </div>
    </motion.div>
  </div>
)}

</div>
);
}