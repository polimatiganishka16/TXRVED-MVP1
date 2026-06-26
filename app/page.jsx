'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchSession } from '../components/auth/auth';
import { motion } from 'framer-motion';
import { Info } from "lucide-react";

export default function Home() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const checkSession = async () => {
            try {
                const session = await fetchSession();
                if (session) {
                    // User is already logged in, redirect to their dashboard
                    if (session.role === 'ADMIN') router.push('/dashboard/admin');
                    else if (session.role === 'EVALUATOR') router.push('/dashboard/evaluator');
                    else router.push('/dashboard/candidate');
                }
            } catch (error) {
                // No active session, show landing page
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, [router]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    fontSize: '18px',
                    color: '#9CA3AF',
                }}>Loading...</div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
        },
    };

    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.05 },
        tap: { scale: 0.98 },
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            overflowX: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <link
                href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
            />

            {/* Animated background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <motion.div
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.05, 0.08, 0.05],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        top: '-10%',
                        left: '-5%',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
                <motion.div
                    animate={{
                        y: [0, 30, 0],
                        opacity: [0.06, 0.1, 0.06],
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 0.5 }}
                    style={{
                        position: 'absolute',
                        bottom: '10%',
                        right: '-10%',
                        width: '700px',
                        height: '700px',
                        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
            </div>

            {/* Content */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    padding: '2rem',
                    maxWidth: '700px',
                }}
            >
                {/* Logo/Title */}
                <motion.div variants={itemVariants}>
                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #6366F1 0%, #60A5FA 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '1rem',
                        letterSpacing: '-0.02em',
                    }}>
                        IECBP Evaluation System
                    </h1>
                </motion.div>

                {/* Subtitle */}
                <motion.p variants={itemVariants} style={{
                    fontSize: '18px',
                    color: '#D1D5DB',
                    marginBottom: '3rem',
                    lineHeight: '1.6',
                }}>
                    Comprehensive scenario-based assessment platform for evaluating decision-making, problem-solving, and critical thinking skills.
                </motion.p>

                {/* Button Group */}
                <motion.div
                    variants={itemVariants}
                    style={{
                        display: 'flex',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '3rem',
                    }}
                >
                    {/* Sign In Button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => router.push('/login')}
                        style={{
                            padding: '14px 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: '#FFFFFF',
                            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.3)';
                        }}
                    >
                        Sign In
                    </motion.button>

                    {/* Sign Up Button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => router.push('/signup')}
                        style={{
                            padding: '14px 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: '2px solid #6366F1',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: 'transparent',
                            color: '#6366F1',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                            e.currentTarget.style.borderColor = '#60A5FA';
                            e.currentTarget.style.color = '#60A5FA';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#6366F1';
                            e.currentTarget.style.color = '#6366F1';
                        }}
                    >
                        Create Account
                    </motion.button>
                </motion.div>

                {/* Features */}
                <motion.div variants={itemVariants} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1.5rem',
                    marginTop: '3rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(99,102,241,0.2)',
                }}>
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '10px',
                        background: 'rgba(99,102,241,0.05)',
                        border: '1px solid rgba(99,102,241,0.1)',
                    }}>
                        <div style={{
                            fontSize: '28px',
                            marginBottom: '0.5rem',
                        }}>📊</div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#E5E7EB',
                            marginBottom: '0.25rem',
                        }}>6 Complex Scenarios</h3>
                        <p style={{
                            fontSize: '12px',
                            color: '#9CA3AF',
                        }}>Real-world challenges</p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '10px',
                        background: 'rgba(124,58,237,0.05)',
                        border: '1px solid rgba(124,58,237,0.1)',
                    }}>
                        <div style={{
                            fontSize: '28px',
                            marginBottom: '0.5rem',
                        }}>🤖</div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#E5E7EB',
                            marginBottom: '0.25rem',
                        }}>AI Evaluation</h3>
                        <p style={{
                            fontSize: '12px',
                            color: '#9CA3AF',
                        }}>Smart feedback</p>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '10px',
                        background: 'rgba(96,165,250,0.05)',
                        border: '1px solid rgba(96,165,250,0.1)',
                    }}>
                        <div style={{
                            fontSize: '28px',
                            marginBottom: '0.5rem',
                        }}>📈</div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#E5E7EB',
                            marginBottom: '0.25rem',
                        }}>Detailed Analytics</h3>
                        <p style={{
                            fontSize: '12px',
                            color: '#9CA3AF',
                        }}>Track progress</p>
                    </div>
                </motion.div>

                {/* Footer */}
               <motion.p
  variants={itemVariants}
  style={{
    marginTop: '3rem',
    fontSize: '12px',
    color: '#6B7280',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  }}
>
  <span>© 2026 IECBP Evaluation System. All rights reserved.</span>

  <a
    href="/about"
    style={{
      color: '#6B7280',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}
  >
    <Info size={13} />
    About Us
  </a>
</motion.p>
            </motion.div>
        </div>
    );
}
