'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Typography, Space, Row, Col, Statistic, Segmented, Spin } from 'antd';
import { PlusOutlined, RobotOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import { BookingsTable, BookingsCalendar } from '@/components/dashboard';

const { Title, Text } = Typography;

interface BookingItem {
    id: string;
    customerName: string;
    customerPhone: string;
    service: string;
    price: number;
    date: string;
    time: string;
    duration: number;
    status: 'confirmed' | 'pending' | 'cancelled';
    source: string;
    [key: string]: unknown;
}

function toDateAndTime(iso: string | null) {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    return {
        date: d.toISOString().slice(0, 10),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
}

export default function BookingsPage() {
    const { user } = useAuth();
    const [view, setView] = useState<'List' | 'Calendar'>('List');
    const [bookings, setBookings] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBookings() {
            if (!user?.businessId) {
                setLoading(false);
                return;
            }
            try {
                const res = await authFetch(`/api/calendar/book?businessId=${user.businessId}`);
                if (!res.ok) throw new Error('Failed to fetch bookings');
                const data = await res.json();
                const items: BookingItem[] = (data.bookings || []).map((b: any) => {
                    const { date, time } = toDateAndTime(b.startTime);
                    return {
                        id: b.id,
                        customerName: b.customerName,
                        customerPhone: b.customerPhone,
                        service: b.service,
                        price: b.price ?? 0,
                        date,
                        time,
                        duration: b.duration ?? 60,
                        status: b.status,
                        source: b.source ?? 'dashboard',
                    };
                });
                setBookings(items);
            } catch (err) {
                console.error('[Bookings] fetch error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBookings();
    }, [user?.businessId]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const todayCount = bookings.filter((b) => b.date === todayStr).length;
    const weekCount = bookings.filter((b) => b.date >= todayStr && b.date <= weekAhead).length;
    const todayRevenue = bookings
        .filter((b) => b.date === todayStr)
        .reduce((sum, b) => sum + (b.price || 0), 0);
    const aiBookedPct = bookings.length
        ? Math.round((bookings.filter((b) => b.source !== 'dashboard').length / bookings.length) * 100)
        : 0;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Bookings</Title>
                    <Text type="secondary">Manage appointments and schedules</Text>
                </div>
                <Space>
                    <Segmented options={['List', 'Calendar']} value={view} onChange={(val) => setView(val as 'List' | 'Calendar')} />
                    <Button type="primary" icon={<PlusOutlined />}>New Booking</Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="Today" value={todayCount} suffix="bookings" /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="Next 7 Days" value={weekCount} suffix="bookings" /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="Revenue (Today)" value={todayRevenue} prefix={<Text type="success">AED</Text>} precision={2} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="AI Booked" value={aiBookedPct} suffix="%" prefix={<RobotOutlined style={{ color: '#8b5cf6' }} />} /></Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Card styles={{ body: { padding: 0 } }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                ) : view === 'List' ? (
                    <BookingsTable bookings={bookings} />
                ) : (
                    <BookingsCalendar bookings={bookings} />
                )}
            </Card>
        </div>
    );
}
