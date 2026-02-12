'use client';

import { useState } from 'react';
import { ConversationList, ChatWindow } from '@/components/dashboard';

// Mock data
const conversations = [
    { id: '1', customerPhone: '+971 55 423 4421', customerName: 'Fatima Al Rashid', language: 'Arabic', channel: 'whatsapp' as const, status: 'active' as const, lastMessage: 'شكراً جزيلاً! موعدي يوم الخميس الساعة 4', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), unread: 0 },
    { id: '2', customerPhone: '+971 50 882 8837', customerName: 'Sarah Johnson', language: 'English', channel: 'messenger' as const, status: 'resolved' as const, lastMessage: 'Thank you! Just sent you my booking confirmation', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), unread: 0 },
    { id: '3', customerPhone: '+971 52 771 1199', customerName: 'Priya Sharma', language: 'Hindi', channel: 'instagram_dm' as const, status: 'active' as const, lastMessage: 'Do you have any appointments for Saturday?', timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), unread: 2 },
    { id: '4', customerPhone: '', customerName: 'Noor Ahmed', language: 'Arabic', channel: 'instagram_comment' as const, status: 'active' as const, lastMessage: '😍 Love this look! How much for bridal?', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), unread: 1, isPublic: true },
    { id: '5', customerPhone: '+971 52 999 8888', customerName: 'Layla Hassan', language: 'Arabic', channel: 'voice' as const, status: 'escalated' as const, lastMessage: 'Called about rescheduling - needs human', timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), unread: 0 },
];

const selectedMessages = [
    { id: '1', role: 'user' as const, content: 'السلام عليكم، هل عندكم مواعيد بكره؟', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { id: '2', role: 'assistant' as const, content: 'وعليكم السلام! 😊 أهلاً وسهلاً\nنعم عندنا مواعيد بكره. أي خدمة تحتاجين؟\n\n💇‍♀️ قص شعر - 80 درهم\n💅 مناكير وبديكير - 120 درهم\n💆‍♀️ مساج - 200 درهم', timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
    { id: '3', role: 'user' as const, content: 'قص شعر الساعة 4 العصر', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
    { id: '4', role: 'assistant' as const, content: 'تمام! حجزت لك قص شعر بكره الخميس الساعة 4 العصر ✅\n\n📍 موقعنا: JLT Cluster D، جنب سبينيس\n\nنشوفك بكره إن شاء الله! 💕', timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString() },
    { id: '5', role: 'user' as const, content: 'شكراً جزيلاً! موعدي يوم الخميس الساعة 4', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
];

export default function ConversationsPage() {
    const [selectedId, setSelectedId] = useState<string | null>('1');
    const selectedConversation = conversations.find(c => c.id === selectedId) || null;

    const handleSendMessage = (text: string) => {
        console.log('Send message:', text);
    };

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
