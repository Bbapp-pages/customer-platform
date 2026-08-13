import { useEffect, useState } from 'react';
import api from '../api/client';
import { toISODateOnly, toTimeSelectValue, HALF_HOUR_TIME_OPTIONS } from '../lib/date';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const inputStyle = {
  borderColor: 'var(--border)',
  color: 'var(--ink)',
  background: 'var(--surface)',
};

export default function AppointmentModal({
  mode,
  initialDate,
  appointment,
  onClose,
  onSaved,
}) {
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [customerMode, setCustomerMode] = useState('search');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', documentId: '' });

  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [dateValue, setDateValue] = useState(toISODateOnly(initialDate || new Date()));
  const [timeValue, setTimeValue] = useState(toTimeSelectValue(initialDate || new Date()));
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/agenda/services'), api.get('/agenda/employees')]).then(
      ([servicesRes, employeesRes]) => {
        setServices(servicesRes.data.data);
        setEmployees(employeesRes.data.data);
      }
    );
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !appointment) {
      return;
    }

    setSelectedCustomer(appointment.customer);
    setServiceId(appointment.service?._id || '');
    setEmployeeId(appointment.employee?._id || '');
    setDateValue(toISODateOnly(new Date(appointment.startTime)));
    setTimeValue(toTimeSelectValue(new Date(appointment.startTime)));
    setStatus(appointment.status);
    setNotes(appointment.notes || '');
  }, [mode, appointment]);

  useEffect(() => {
    if (customerMode !== 'search' || customerQuery.trim().length < 2) {
      setCustomerResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      api
        .get('/agenda/customers', { params: { q: customerQuery } })
        .then((res) => setCustomerResults(res.data.data));
    }, 250);

    return () => clearTimeout(timeout);
  }, [customerMode, customerQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'create' && !selectedCustomer && !newCustomer.phone) {
      setError('Selecciona un cliente existente o completa uno nuevo');
      return;
    }

    if (!serviceId) {
      setError('Selecciona un servicio');
      return;
    }

    setSubmitting(true);

    const startTime = new Date(`${dateValue}T${timeValue}:00`).toISOString();

    try {
      if (mode === 'create') {
        await api.post('/agenda/appointments', {
          customerId: selectedCustomer?._id,
          customer: selectedCustomer ? undefined : newCustomer,
          serviceId,
          employeeId: employeeId || undefined,
          startTime,
          notes,
        });
      } else {
        await api.patch(`/agenda/appointments/${appointment._id}`, {
          serviceId,
          employeeId: employeeId || null,
          startTime,
          status,
          notes,
        });
      }

      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          {mode === 'create' ? 'Nueva cita' : 'Editar cita'}
        </h2>

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
            Cliente
          </p>

          {mode === 'edit' ? (
            <div
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ ...inputStyle, color: 'var(--ink-secondary)' }}
            >
              <p className="font-medium" style={{ color: 'var(--ink)' }}>
                {appointment.customer?.name}
              </p>
              <p>Cédula: {appointment.customer?.documentId || 'Sin registrar'}</p>
              <p>Teléfono: {appointment.customer?.phone}</p>
              <p>Correo: {appointment.customer?.email || 'Sin registrar'}</p>
            </div>
          ) : selectedCustomer ? (
            <div
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            >
              <span>
                {selectedCustomer.name} · {selectedCustomer.phone}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                style={{ color: 'var(--status-critical)' }}
              >
                Quitar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomerMode('search')}
                  className="rounded-full px-2.5 py-1 font-medium"
                  style={{
                    background:
                      customerMode === 'search' ? 'var(--accent-bg)' : 'transparent',
                    color: customerMode === 'search' ? 'var(--accent)' : 'var(--ink-muted)',
                  }}
                >
                  Buscar existente
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className="rounded-full px-2.5 py-1 font-medium"
                  style={{
                    background:
                      customerMode === 'new' ? 'var(--accent-bg)' : 'transparent',
                    color: customerMode === 'new' ? 'var(--accent)' : 'var(--ink-muted)',
                  }}
                >
                  Cliente nuevo
                </button>
              </div>

              {customerMode === 'search' ? (
                <div>
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Buscar por nombre o teléfono"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  {customerResults.length > 0 && (
                    <div
                      className="mt-1 max-h-32 overflow-y-auto rounded-lg border text-sm"
                      style={inputStyle}
                    >
                      {customerResults.map((c) => (
                        <button
                          type="button"
                          key={c._id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerResults([]);
                            setCustomerQuery('');
                          }}
                          className="block w-full px-3 py-2 text-left hover:opacity-80"
                        >
                          {c.name} · {c.phone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    required
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer((c) => ({ ...c, name: e.target.value }))
                    }
                    placeholder="Nombre"
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    required
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                    placeholder="Teléfono"
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    value={newCustomer.documentId}
                    onChange={(e) =>
                      setNewCustomer((c) => ({ ...c, documentId: e.target.value }))
                    }
                    placeholder="Cédula (opcional)"
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer((c) => ({ ...c, email: e.target.value }))
                    }
                    placeholder="Correo (opcional)"
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Servicio
        </label>
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Selecciona un servicio</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} ({s.durationMinutes} min)
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Profesional
        </label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Sin asignar</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Fecha y hora
        </label>
        <div className="mb-4 flex gap-2">
          <input
            required
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-1/2 rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <select
            required
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="w-1/2 rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            {HALF_HOUR_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {mode === 'edit' && (
          <>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        {error && (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear cita' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
