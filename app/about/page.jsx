'use client';

export default function AboutPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #16203a 75%, #1a2540 100%)',
      color: '#E5E7EB',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '3rem 1.5rem',
      position: 'relative',
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
        <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)', color: '#E2E8F0', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>← Back to Home</button>
      </div>

      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: 88,
              height: 88,
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(148,163,184,0.18)',
              display: 'grid',
              placeItems: 'center',
            }}>
              <img src="/logo.jpeg" alt="txrV.ed logo" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '14px' }} />
            </div>
            <div style={{ minWidth: 260 }}>
              <p style={{
                margin: 0,
                color: '#A5B4FC',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontSize: '0.85rem',
              }}>
                About txrV.ed
              </p>
              <h1 style={{
                margin: '0.8rem 0 0',
                fontSize: '3rem',
                lineHeight: 1.03,
                color: '#FFFFFF',
              }}>
                Engineering Capability Building Platform
              </h1>
            </div>
          </div>

          <div style={{
            marginTop: '1.75rem',
            padding: '2rem',
            borderRadius: '32px',
            background: 'rgba(15,22,35,0.94)',
            border: '1px solid rgba(148,163,184,0.14)',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.14)',
          }}>
            <p style={{
              margin: 0,
              color: '#CBD5E1',
              fontSize: '1rem',
              lineHeight: 1.85,
              maxWidth: '780px',
            }}>
              txrV.ed is an engineering capability development platform focused on bridging the gap between academic learning and industry expectations through structured capability-building programs, practical assessments, and trusted evaluation.
            </p>
          </div>
        </section>

        <section style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          marginBottom: '2rem',
        }}>
          <article style={{
            padding: '1.85rem',
            borderRadius: '28px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}>
            <p style={{
              margin: 0,
              color: '#A5B4FC',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: '0.78rem',
            }}>
              Mission
            </p>
            <h2 style={{
              margin: '0.85rem 0 0.9rem',
              color: '#F8FAFC',
              fontSize: '1.35rem',
              lineHeight: 1.3,
            }}>
              Build capability for real-world engineering performance.
            </h2>
            <p style={{ margin: 0, color: '#94A3B8', lineHeight: 1.75 }}>
              To develop industry-ready engineering talent through structured learning, practical assessments, and continuous capability development.
            </p>
          </article>

          <article style={{
            padding: '1.85rem',
            borderRadius: '28px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}>
            <p style={{
              margin: 0,
              color: '#A5B4FC',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: '0.78rem',
            }}>
              Vision
            </p>
            <h2 style={{
              margin: '0.85rem 0 0.9rem',
              color: '#F8FAFC',
              fontSize: '1.32rem',
              lineHeight: 1.3,
            }}>
             Shape the future of engineering through innovation and capability excellence.
            </h2>
            <p style={{ margin: 0, color: '#94A3B8', lineHeight: 1.75 }}>
              To create a future where every engineer is empowered with the skills, confidence, and mindset to solve real-world challenges and drive meaningful innovation.
            </p>
          </article>
        </section>

        <section style={{
          padding: '2rem',
          borderRadius: '28px',
          background: 'rgba(15,22,35,0.92)',
          border: '1px solid rgba(148,163,184,0.12)',
          marginBottom: '2rem',
        }}>
          <p style={{
            margin: 0,
            color: '#A5B4FC',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: '0.8rem',
          }}>
            Contributors
          </p>
          <div style={{
            display: 'grid',
            gap: '0.9rem',
            marginTop: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}>
            {[
              'Ramapuram Niharika',
              'Pitani Mounika',
              'Pranitha Goli',
              'Sajani Manimala',
              'Srilekha Vutukuru',
              'Polimati Ganishka',
            ].map((name) => (
              <div key={name} style={{
                padding: '1rem',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(148,163,184,0.08)',
              }}>
                <p style={{ margin: 0, color: '#F8FAFC', fontWeight: 600 }}>{name}</p>
              </div>
            ))}
          </div>
        </section>

     <section
  style={{
    marginTop: '2.5rem',
    padding: '2.5rem',
    borderRadius: '30px',
    background: 'rgba(15,22,35,0.92)',
    border: '1px solid rgba(148,163,184,0.12)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
  }}
>
  <div
    style={{
      textAlign: 'center',
      marginBottom: '2rem',
    }}
  >
    <p
      style={{
        margin: 0,
        color: '#A5B4FC',
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        fontSize: '0.8rem',
      }}
    >
      GET IN TOUCH
    </p>

    <h2
      style={{
        margin: '0.8rem 0',
        color: '#FFFFFF',
        fontSize: '2rem',
      }}
    >
      Contact Us
    </h2>

    <p
      style={{
        margin: 0,
        color: '#94A3B8',
        lineHeight: 1.8,
        maxWidth: '600px',
        marginInline: 'auto',
      }}
    >
      We'd love to hear from you. For enquiries, support, or feedback,
      feel free to reach out using the contact details below.
    </p>
  </div>

  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '1.5rem',
      flexWrap: 'wrap',
    }}
  >
    <div
      style={{
        flex: 1,
        minWidth: '260px',
        padding: '1.5rem',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(148,163,184,0.08)',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#A5B4FC',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        Website
      </p>

      <a
        href="https://www.txrved.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: '0.8rem',
          color: '#FFFFFF',
          fontSize: '1.1rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        www.txrved.com
      </a>
    </div>

    <div
      style={{
        flex: 1,
        minWidth: '260px',
        padding: '1.5rem',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(148,163,184,0.08)',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#A5B4FC',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        Email
      </p>

      <a
        href="mailto:support@txrved.com"
        style={{
          display: 'block',
          marginTop: '0.8rem',
          color: '#FFFFFF',
          fontSize: '1.1rem',
          textDecoration: 'underline',
textUnderlineOffset: '4px',
          fontWeight: 600,
        }}
      >
        support@txrved.com
      </a>
    </div>
  </div>

  <div
    style={{
      marginTop: '2rem',
      textAlign: 'center',
    }}
  >
    <a
      href="mailto:support@txrved.com?subject=Support%20Request"
      style={{
        display: 'inline-block',
        padding: '14px 34px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
        color: '#FFFFFF',
        textDecoration: 'none',
        fontWeight: 600,
        boxShadow: '0 10px 25px rgba(99,102,241,0.35)',
      }}
    >
      Connect With Us
    </a>
  </div>
</section>
      </div>
    </main>
  );
}
