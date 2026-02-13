'use client';

import { useState, useEffect } from 'react';
import { Spin, Empty, message } from 'antd';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';
import { ConversationList, ChatWindow } from '@/components/dashboard';

function detectLanguageFromMessages(messages: { role: string; content: string }[]): string {
    if (!messages || messages.length === 0) return 'Unknown';
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return 'Unknown';
    if (/[\u0600-\u06FF]/.test(lastUserMsg.content)) return 'Arabic';
    if (/[\u0900-\u097F]/.test(lastUserMsg.content)) return 'Hindi';
    return 'English';
}

export default function ConversationsPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Real-time listener for conversations list
    useEffect(() => {
        if (!user?.businessId || !db) {
            setLoading(false);
            return;
        }

        const convsRef = collection(db, 'businesses', user.businessId, 'conversations');
        const q = query(convsRef, orderBy('lastMessageAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const convs = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    timestamp:
                        d.data().lastMessageAt?.toDate?.()?.toISOString() ||
                        new Date().toISOString(),
                    lastMessage:
                        d.data().messages?.slice(-1)?.[0]?.content || 'No messages yet',
                    unread: 0,
                    language: detectLanguageFromMessages(d.data().messages || []),
                }));
                setConversations(convs);
                setLoading(false);
            },
            (err) => {
                console.error('Conversations listener error:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.businessId]);

    // When a conversation is selected, extract its messages
    useEffect(() => {
        if (!selectedId) {
            setSelectedMessages([]);
            return;
        }
        const conv = conversations.find((c) => c.id === selectedId);
        if (conv?.messages) {
            setSelectedMessages(
                conv.messages.map((m: any, i: number) => ({
                    id: String(i),
                    role: m.role === 'model' ? 'assistant' : m.role,
                    content: m.content,
                    timestamp:
                        m.timestamp?.toDate?.()?.toISOString() ||
                        new Date().toISOString(),
                }))
            );
        } else {
            setSelectedMessages([]);
        }
    }, [selectedId, conversations]);

    // Send a human reply (take over)
    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !selectedId || !user?.businessId || !db) return;
        setSending(true);

        try {
            const conv = conversations.find((c) => c.id === selectedId);
            if (!conv?.customerPhone) {
                message.error('No phone number for this conversation');
                return;
            }

            // Send via Twilio API
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: conv.customerPhone,
                    message: text,
                    businessId: user.businessId,
                    conversationId: selectedId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to send');
            }

            // Update conversation in Firestore (mark as human-handled)
            const convRef = doc(
                db,
                'businesses',
                user.businessId,
                'conversations',
                selectedId
            );
            const existingMessages = conv.messages || [];
            await updateDoc(convRef, {
                messages: [
                    ...existingMessages,
                    { role: 'model', content: text, timestamp: Timestamp.now() },
                ],
                handledBy: 'human',
                lastMessageAt: Timestamp.now(),
            });

            message.success('Message sent');
        } catch (err: any) {
            console.error('Send error:', err);
            message.error(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const selectedConversation =
        conversations.find((c) => c.id === selectedId) || null;

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
                <Empty
                    description="No conversations yet. Send a WhatsApp message to your Twilio number to get started!"
                />
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
