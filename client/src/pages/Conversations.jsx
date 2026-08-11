import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';

const MESSAGE_TYPE_LABEL = {
  text: '',
  image: '📷 ',
  audio: '🎤 ',
  document: '📄 ',
  other: '',
};

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setPagination((p) => ({ ...p, page: 1 })), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/conversations', {
        params: { page: pagination.page, limit: 20, q: search || undefined },
      })
      .then((res) => {
        setConversations(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [pagination.page, search]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }

    setThreadLoading(true);
    api
      .get(`/admin/conversations/${selectedId}/messages`)
      .then((res) => setThread(res.data.data))
      .finally(() => setThreadLoading(false));
  }, [selectedId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Conversaciones
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Revisa exactamente lo que la IA le está respondiendo a cada cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div
          className="flex flex-col overflow-hidden rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="border-b p-3" style={{ borderColor: 'var(--border)' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'var(--page)' }}
            />
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            {!loading && conversations.length === 0 && (
              <p className="p-4 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
                Sin conversaciones.
              </p>
            )}

            {conversations.map((conversation) => {
              const isActive = conversation._id === selectedId;
              const preview = conversation.lastMessage;

              return (
                <button
                  key={conversation._id}
                  onClick={() => setSelectedId(conversation._id)}
                  className="block w-full border-b px-4 py-3 text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: isActive ? 'var(--accent-bg, rgba(0,0,0,0.04))' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {conversation.customer?.name || conversation.customer?.phone || 'Desconocido'}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                      style={{ color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
                    >
                      {conversation.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
                    {conversation.customer?.phone}
                  </p>
                  {preview && (
                    <p
                      className="mt-1.5 truncate text-xs"
                      style={{ color: 'var(--ink-secondary)' }}
                    >
                      {preview.sender === 'customer' ? '' : '🤖 '}
                      {MESSAGE_TYPE_LABEL[preview.messageType] || ''}
                      {preview.message}
                    </p>
                  )}
                  {conversation.lastMessageAt && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      {new Date(conversation.lastMessageAt).toLocaleString()}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            onChange={(page) => setPagination((p) => ({ ...p, page }))}
          />
        </div>

        <div
          className="flex flex-col overflow-hidden rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {!selectedId && (
            <p className="p-6 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
              Selecciona una conversación para ver el historial completo.
            </p>
          )}

          {selectedId && threadLoading && (
            <p className="p-6 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
              Cargando...
            </p>
          )}

          {selectedId && !threadLoading && thread && (
            <>
              <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {thread.conversation.customer?.name || 'Desconocido'}
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  {thread.conversation.customer?.phone}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
                {thread.messages.length === 0 && (
                  <p className="text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
                    Sin mensajes en esta conversación.
                  </p>
                )}

                {thread.messages.map((message) => {
                  const isCustomer = message.sender === 'customer';

                  return (
                    <div
                      key={message._id}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm"
                        style={{
                          background: isCustomer ? 'var(--page)' : 'var(--accent)',
                          color: isCustomer ? 'var(--ink)' : '#ffffff',
                          border: isCustomer ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <p className="whitespace-pre-wrap">
                          {MESSAGE_TYPE_LABEL[message.messageType] || ''}
                          {message.message}
                        </p>
                        <p
                          className="mt-1 text-[10px] opacity-70"
                          style={{ color: isCustomer ? 'var(--ink-muted)' : 'rgba(255,255,255,0.8)' }}
                        >
                          {message.sender === 'assistant'
                            ? 'IA'
                            : message.sender === 'human'
                              ? 'Asesor'
                              : 'Cliente'}
                          {' · '}
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
