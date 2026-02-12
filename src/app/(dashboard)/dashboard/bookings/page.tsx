'use client';

import { useState } from 'react';
import { Card, Button, Typography, Space, Row, Col, Statistic, Segmented } from 'antd';
import { PlusOutlined, RobotOutlined } from '@ant-design/icons';
import { BookingsTable, BookingsCalendar } from '@/components/dashboard';

const { Title, Text } = Typography;

// Mock data
const bookings = [
    { id: '1', customerName: 'Sara Al Maktoum', customerPhone: '+971 55 123 4567', service: 'Haircut', price: 80, date: '2025-01-31', time: '14:00', duration: 45, status: 'confirmed' as const, source: 'whatsapp' as const },
    { id: '2', customerName: 'Fatima Hassan', customerPhone: '+971 50 234 5678', service: 'Mani-Pedi', price: 120, date: '2025-01-31', time: '15:30', duration: 60, status: 'confirmed' as const, source: 'voice' as const },
    { id: '3', customerName: 'Noor Ahmed', customerPhone: '+971 52 345 6789', service: 'Hair Color', price: 250, date: '2025-01-31', time: '17:00', duration: 120, status: 'pending' as const, source: 'whatsapp' as const },
    { id: '4', customerName: 'Layla Bin Rashid', customerPhone: '+971 54 456 7890', service: 'Bridal Package', price: 1500, date: '2025-02-01', time: '10:00', duration: 240, status: 'confirmed' as const, source: 'dashboard' as const },
    { id: '5', customerName: 'Mariam Al Nahyan', customerPhone: '+971 56 567 8901', service: 'Massage', price: 200, date: '2025-02-01', time: '14:00', duration: 60, status: 'confirmed' as const, source: 'whatsapp' as const },
];

export default function BookingsPage() {
    const [view, setView] = useState<'List' | 'Calendar'>('List');

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
                    <Card size="small"><Statistic title="Today" value={3} suffix="bookings" /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="This Week" value={18} suffix="bookings" /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="Revenue (Today)" value={4650} prefix={<Text type="success">AED</Text>} precision={2} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small"><Statistic title="AI Booked" value={87} suffix="%" prefix={<RobotOutlined style={{ color: '#8b5cf6' }} />} /></Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Card styles={{ body: { padding: 0 } }}>
                {view === 'List' ? (
                    <BookingsTable bookings={bookings} />
                ) : (
                    <BookingsCalendar bookings={bookings} />
                )}
            </Card>
        </div>
    );
}
