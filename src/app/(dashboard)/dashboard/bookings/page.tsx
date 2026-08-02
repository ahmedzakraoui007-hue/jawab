'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Typography, Space, Row, Col, Statistic, Segmented, Spin, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { PlusOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import { BookingsTable, BookingsCalendar } from '@/components/dashboard';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

interface ServiceOption {
    id: string;
    name: string;
    price: number;
    duration: number;
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
    const [services, setServices] = useState<ServiceOption[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();

    const fetchBookings = useCallback(async () => {
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
    }, [user?.businessId]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        async function fetchServices() {
            if (!user?.businessId) return;
            try {
                const res = await authFetch(`/api/business/services?businessId=${user.businessId}`);
                if (!res.ok) return;
                const data = await res.json();
                setServices(
                    (data.services || [])
                        .filter((s: any) => s.active !== false)
                        .map((s: any) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration }))
                );
            } catch (err) {
                console.error('[Bookings] services fetch error:', err);
            }
        }
        fetchServices();
    }, [user?.businessId]);

    const handleServiceSelect = (serviceName: string) => {
        const svc = services.find((s) => s.name === serviceName);
        if (svc) {
            form.setFieldsValue({ duration: svc.duration, price: svc.price });
        }
    };

    const handleCreateBooking = async (values: any) => {
        if (!user?.businessId) return;
        setCreating(true);
        try {
            const res = await authFetch('/api/calendar/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: user.businessId,
                    customerName: values.customerName,
                    customerPhone: values.customerPhone,
                    customerEmail: values.customerEmail || undefined,
                    service: values.service,
                    serviceDuration: values.duration,
                    price: values.price,
                    startTime: values.startTime.toISOString(),
                    notes: values.notes || undefined,
                    createdVia: 'dashboard',
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create booking');
            }

            message.success('Booking created');
            setModalOpen(false);
            form.resetFields();
            fetchBookings();
        } catch (err: any) {
            message.error(err.message || 'Failed to create booking');
        } finally {
            setCreating(false);
        }
    };

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
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Booking</Button>
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

            {/* New Booking Modal */}
            <Modal
                title="New Booking"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreateBooking}>
                    <Form.Item name="customerName" label="Customer Name" rules={[{ required: true, message: 'Please enter the customer name' }]}>
                        <Input placeholder="e.g., Sara Al Maktoum" />
                    </Form.Item>
                    <Form.Item name="customerPhone" label="Phone Number" rules={[{ required: true, message: 'Please enter a phone number' }]}>
                        <Input placeholder="+971 50 123 4567" />
                    </Form.Item>
                    <Form.Item name="customerEmail" label="Email (optional)">
                        <Input placeholder="customer@example.com" type="email" />
                    </Form.Item>

                    {services.length > 0 ? (
                        <Form.Item name="service" label="Service" rules={[{ required: true, message: 'Please select a service' }]}>
                            <Select
                                placeholder="Select a service"
                                onChange={handleServiceSelect}
                                options={services.map((s) => ({ value: s.name, label: `${s.name} — ${s.price} AED (${s.duration} min)` }))}
                            />
                        </Form.Item>
                    ) : (
                        <Form.Item name="service" label="Service" rules={[{ required: true, message: 'Please enter a service' }]}>
                            <Input placeholder="e.g., Haircut" />
                        </Form.Item>
                    )}

                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="price" label="Price (AED)" rules={[{ required: true }]} style={{ flex: 1 }} initialValue={0}>
                            <Input type="number" min={0} />
                        </Form.Item>
                        <Form.Item name="duration" label="Duration (min)" rules={[{ required: true }]} style={{ flex: 1 }} initialValue={45}>
                            <Input type="number" min={5} step={5} />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="startTime"
                        label="Date & Time"
                        rules={[{ required: true, message: 'Please pick a date and time' }]}
                        initialValue={dayjs().add(1, 'hour').minute(0)}
                    >
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes (optional)">
                        <TextArea rows={2} placeholder="Any special requests" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={creating}>
                                Create Booking
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
