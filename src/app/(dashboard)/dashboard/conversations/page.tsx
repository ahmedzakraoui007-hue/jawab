'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spin, Empty, message } from 'antd';
import { useAuth } from '@/lib/auth-context';
import { backendFetch } from '@/lib/backend-fetch';
import { ConversationList, ChatWindow } from '@/components/dashboard';

function detectLanguageFromText(text: string | null): string {
    if (!text) return 'Unknown';
    if (/[؀-ۿ]/.test(text)) return 'Arabic';
    if (/[ऀ-ॿ]/.test(text)) return 'Hindi';
    return 'English';
}

export default function ConversationsPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Polls the conversation list — replaces Firestore's onSnapshot
    // real-time listener.
    const fetchConversations = useCallback(async () => {
        if (!user?.businessId) {
            setLoading(false);
            return;
        }
        try {
            const res = await backendFetch('/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(
                    (data.conversations || []).map((c: any) => ({
                        ...c,
                        timestamp: c.lastMessageAt || new Date().toISOString(),
                        lastMessage: c.lastMessage || 'No messages yet',
                        unread: 0,
                        language: detectLanguageFromText(c.lastMessage),
                    }))
                );
            }
        } catch (err) {
            console.error('Conversations fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.businessId]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    // Fetch the full message thread whenever a conversation is selected.
    useEffect(() => {
        if (!selectedId) {
            setSelectedMessages([]);
            return;
        }

        let cancelled = false;
        backendFetch(`/conversations/${selectedId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                setSelectedMessages(
                    (data.conversation?.messages || []).map((m: any) => ({
                        id: m.id,
                        role: m.role === 'model' ? 'assistant' : m.role,
                        content: m.content,
                        timestamp: m.timestamp,
                    }))
                );
            })
            .catch((err) => console.error('Conversation detail fetch error:', err));

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    // Send a human reply (take over) — the backend resolves the recipient
    // phone number from the conversation record itself and marks it
    // handled_by: human.
    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !selectedId) return;
        setSending(true);

        try {
            const res = await backendFetch('/send/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: selectedId, message: text }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to send');
            }

            setSelectedMessages((prev) => [...prev, { id: String(Date.now()), role: 'assistant', content: text, timestamp: new Date().toISOString() }]);
            fetchConversations();
            message.success('Message sent');
        } catch (err: any) {
            console.error('Send error:', err);
            message.error(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 160px)' }}>
                <Spin size="large" tip="Loading conversations..." />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 160px)' }}>
                <Empty description="No conversations yet. Send a WhatsApp message to your Twilio number to get started!" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 160px)' }}>
            <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={selectedMessages}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
}
