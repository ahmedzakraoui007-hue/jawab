'use client';

import { formatCurrency } from '@/lib/utils';
import { Row, Col, Typography } from 'antd';
import {
    MessageOutlined,
    CalendarOutlined,
    RiseOutlined,
    ClockCircleOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { StatsCard, RecentConversationsList, UpcomingBookingsList } from '@/components/dashboard';

const { Title, Text } = Typography;

// Mock data for demo
const metrics = {
    today: {
        conversations: 127, conversationsChange: 12,
        bookings: 23, bookingsChange: 5,
        revenue: 4600, revenueChange: 8,
        avgResponseTime: 2.1, responseTimeChange: -15,
    },
};

const recentConversations = [
    { id: '1', customerPhone: '+971 55 423 4421', customerName: 'Fatima', language: 'Arabic', channel: 'whatsapp' as const, lastMessage: 'Booked haircut for Thursday 4pm', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'resolved' as const },
    { id: '2', customerPhone: '+971 50 882 8837', customerName: 'Sarah', language: 'English', channel: 'voice' as const, lastMessage: 'Asked about bridal packages - sent prices', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'resolved' as const },
    { id: '3', customerPhone: '+971 52 771 1199', customerName: 'Priya', language: 'Hindi', channel: 'whatsapp' as const, lastMessage: 'Escalated to human - complex request', timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), status: 'escalated' as const },
    { id: '4', customerPhone: '+971 54 331 9922', customerName: 'Noor', language: 'Arabic', channel: 'whatsapp' as const, lastMessage: 'Confirmed appointment for tomorrow', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), status: 'resolved' as const },
];

const upcomingBookings = [
    { id: '1', customerName: 'Sara', service: 'Haircut', time: '2:00 PM', date: 'Today' },
    { id: '2', customerName: 'Fatima', service: 'Mani-Pedi', time: '3:30 PM', date: 'Today' },
    { id: '3', customerName: 'Noor', service: 'Hair Color', time: '5:00 PM', date: 'Today' },
    { id: '4', customerName: 'Layla', service: 'Bridal Package', time: '10:00 AM', date: 'Tomorrow' },
];

export default function DashboardPage() {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Dashboard</Title>
                <Text type="secondary">Welcome back! Here&apos;s what&apos;s happening today.</Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard title="Conversations" value={metrics.today.conversations} icon={<MessageOutlined style={{ color: '#10b981', marginRight: 8 }} />} change={metrics.today.conversationsChange} changeDirection="up" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard title="Bookings" value={metrics.today.bookings} icon={<CalendarOutlined style={{ color: '#2563eb', marginRight: 8 }} />} change={metrics.today.bookingsChange} changeDirection="up" valueStyle={{ color: '#2563eb' }} />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard title="Revenue" value={metrics.today.revenue} icon={<RiseOutlined style={{ color: '#f59e0b', marginRight: 8 }} />} change={metrics.today.revenueChange} changeDirection="up" formatter={formatCurrency} />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                        title="Avg Response" value={metrics.today.avgResponseTime}
                        icon={<ClockCircleOutlined style={{ color: '#8b5cf6', marginRight: 8 }} />}
                        suffix={<span>s</span>}
                        extra={<Text type="success" style={{ fontSize: 12 }}><ArrowDownOutlined /> {Math.abs(metrics.today.responseTimeChange)}% faster</Text>}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <RecentConversationsList conversations={recentConversations} />
                </Col>
                <Col xs={24} lg={8}>
                    <UpcomingBookingsList bookings={upcomingBookings} />
                </Col>
            </Row>
        </div>
    );
}
