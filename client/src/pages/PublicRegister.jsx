import { useEffect, useState } from 'react';
import api from '../api/client';

const COLORS = {
  page: '#0d0d0d',
  card: '#161616',
  field: '#1f1f1f',
  border: 'rgba(255, 255, 255, 0.12)',
  ink: '#f5f5f5',
  inkSecondary: '#a3a3a3',
  inkMuted: '#6b6b6b',
};

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </svg>
);

const GiftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="8" width="18" height="13" rx="1" />
    <path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

const COUNTRIES = [
  { code: '1', name: 'Canadá' },
  { code: '1', name: 'Estados Unidos' },
  { code: '52', name: 'México' },
  { code: '501', name: 'Belice' },
  { code: '502', name: 'Guatemala' },
  { code: '503', name: 'El Salvador' },
  { code: '504', name: 'Honduras' },
  { code: '505', name: 'Nicaragua' },
  { code: '506', name: 'Costa Rica' },
  { code: '507', name: 'Panamá' },
  { code: '57', name: 'Colombia' },
  { code: '58', name: 'Venezuela' },
  { code: '592', name: 'Guyana' },
  { code: '597', name: 'Surinam' },
  { code: '593', name: 'Ecuador' },
  { code: '51', name: 'Perú' },
  { code: '55', name: 'Brasil' },
  { code: '591', name: 'Bolivia' },
  { code: '595', name: 'Paraguay' },
  { code: '56', name: 'Chile' },
  { code: '54', name: 'Argentina' },
  { code: '598', name: 'Uruguay' },
];

const inputStyle = {
  background: COLORS.field,
  borderColor: COLORS.border,
  color: COLORS.ink,
};

const labelStyle = {
  color: COLORS.inkSecondary,
};

export default function PublicRegister() {
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [countryCode, setCountryCode] = useState('506');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceId, setServiceId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get('/campaigns/active')
      .then((res) => {
        setCampaign(res.data.data);
        setServiceId(res.data.data.services[0]?.id || '');
      })
      .catch((err) =>
        setLoadError(
          err.response?.data?.message || 'No se pudo cargar la campaña'
        )
      );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/campaigns/active/register', {
        name,
        documentId,
        phone: `${countryCode}${phone.replace(/\D/g, '')}`,
        email,
        serviceId,
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ background: COLORS.page }}
      >
        <p style={{ color: '#e66767' }}>{loadError}</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ background: COLORS.page }}
      >
        <p style={{ color: COLORS.inkSecondary }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 sm:p-10"
      style={{ background: COLORS.page, color: COLORS.ink }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: COLORS.border, color: COLORS.inkSecondary }}
          >
            <GiftIcon /> 100% gratuito
          </span>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            {campaign.name}
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: COLORS.inkSecondary }}>
            {campaign.description ||
              'Regístrate para reclamar tu beneficio y agenda tu cita por WhatsApp.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2" style={{ color: COLORS.inkSecondary }}>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border"
                style={{ borderColor: COLORS.border }}
              >
                <PinIcon />
              </span>
              {campaign.address}
            </div>
            <div className="flex items-center gap-2" style={{ color: COLORS.inkSecondary }}>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border"
                style={{ borderColor: COLORS.border }}
              >
                <ChatIcon />
              </span>
              Atención por WhatsApp
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          {result ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold">¡Listo!</h2>
              <p className="mt-2 text-sm" style={{ color: COLORS.inkSecondary }}>
                Ya quedaste registrado. Muy pronto te vamos a contactar por WhatsApp o por correo
                para coordinar tu cita.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={labelStyle}>
                Nombre
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />

              <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={labelStyle}>
                Documento de identidad
              </label>
              <input
                required
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Número de documento"
                className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />

              <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={labelStyle}>
                Teléfono (WhatsApp)
              </label>
              <div className="mb-4 flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-32 shrink-0 rounded-lg border px-2 py-2.5 text-sm"
                  style={inputStyle}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.code}>
                      {c.name} (+{c.code})
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Número sin código de país"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={labelStyle}>
                Correo
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />

              <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={labelStyle}>
                Servicio
              </label>
              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="mb-5 w-full rounded-lg border px-3 py-2.5 text-sm"
                style={inputStyle}
              >
                {campaign.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {error && (
                <p
                  className="mb-4 rounded-lg px-3 py-2 text-sm"
                  style={{ color: '#e66767', background: 'rgba(230, 103, 103, 0.1)' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50"
                style={{ background: COLORS.ink, color: COLORS.page }}
              >
                {submitting ? 'Enviando...' : 'Registrarme'} {!submitting && <ArrowIcon />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
