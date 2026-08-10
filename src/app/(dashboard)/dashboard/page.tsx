'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { backendFetch } from '@/lib/backend-fetch';
import { Row, Col, Typography } from 'antd';
import {
    MessageOutlined,
    CalendarOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import { StatsCard, RecentConversationsList, UpcomingBookingsList } from '@/components/dashboard';

const { Title, Text } = Typography;

function detectLanguageFromText(text: string | null): string {
    if (!text) return 'Unknown';
    if (/[؀-ۿ]/.test(text)) return 'Arabic';
    if (/[ऀ-ॿ]/.test(text)) return 'Hindi';
    return 'English';
}

function formatBookingDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (isSameDay(d, today)) return 'Today';
    if (isSameDay(d, tomorrow)) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
    const [conversationsToday, setConversationsToday] = useState(0);
    const [bookingsToday, setBookingsToday] = useState(0);
    const [revenueToday, setRevenueToday] = useState(0);

    // Polls the 4 most recent conversations — replaces Firestore's
    // onSnapshot real-time listener (Postgres has no built-in equivalent).
    useEffect(() => {
        if (!user?.businessId) return;

        async function fetchConversations() {
            try {
                const res = await backendFetch('/conversations?limit=4');
                if (!res.ok) return;
                const data = await res.json();
                const todayStr = new Date().toDateString();
                let todayCount = 0;

                const convs = (data.conversations || []).map((c: any) => {
                    if (c.startedAt && new Date(c.startedAt).toDateString() === todayStr) todayCount += 1;
                    return {
                        id: c.id,
                        ...c,
                        timestamp: c.lastMessageAt || new Date().toISOString(),
                        lastMessage: c.lastMessage || 'No messages yet',
                        language: detectLanguageFromText(c.lastMessage),
                    };
                });

                setConversations(convs);
                setConversationsToday(todayCount);
            } catch (err) {
                console.error('[Overview] Conversations fetch error:', err);
            }
        }

        fetchConversations();
        const interval = setInterval(fetchConversations, 15000);
        return () => clearInterval(interval);
    }, [user?.businessId]);

    // Upcoming bookings + today's booking stats
    useEffect(() => {
        async function fetchBookings() {
            if (!user?.businessId) return;
            try {
                const res = await backendFetch('/calendar/book');
                if (!res.ok) return;
                const data = await res.json();
                const now = new Date();
                const todayStr = now.toDateString();
                const all = (data.bookings || []) as any[];

                setBookingsToday(all.filter((b) => b.startTime && new Date(b.startTime).toDateString() === todayStr).length);
                setRevenueToday(
                    all
                        .filter((b) => b.startTime && new Date(b.startTime).toDateString() === todayStr)
                        .reduce((sum, b) => sum + (b.price || 0), 0)
                );

                const upcoming = all
                    .filter((b) => b.startTime && new Date(b.startTime).getTime() >= now.getTime())
                    .slice(0, 4)
                    .map((b) => ({
                        id: b.id,
                        customerName: b.customerName,
                        service: b.service,
                        time: new Date(b.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        date: formatBookingDate(b.startTime),
                    }));
                setUpcomingBookings(upcoming);
            } catch (err) {
                console.error('[Overview] Bookings fetch error:', err);
            }
        }
        fetchBookings();
    }, [user?.businessId]);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Dashboard</Title>
                <Text type="secondary">Welcome back! Here&apos;s what&apos;s happening today.</Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}>
                    <StatsCard
                        title="Conversations Today"
                        value={conversationsToday}
                        icon={<MessageOutlined style={{ color: '#10b981', marginRight: 8 }} />}
                    />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <StatsCard
                        title="Bookings Today"
                        value={bookingsToday}
                        icon={<CalendarOutlined style={{ color: '#2563eb', marginRight: 8 }} />}
                        valueStyle={{ color: '#2563eb' }}
                    />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <StatsCard
                        title="Revenue Today"
                        value={revenueToday}
                        icon={<RiseOutlined style={{ color: '#f59e0b', marginRight: 8 }} />}
                        formatter={formatCurrency}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <RecentConversationsList conversations={conversations} />
                </Col>
                <Col xs={24} lg={8}>
                    <UpcomingBookingsList bookings={upcomingBookings} />
                </Col>
            </Row>
        </div>
    );
}
