'use client';

import React from 'react';
import { Table, Tag, Badge, Space, Avatar, Button, Tooltip, Input, Typography } from 'antd';
import { SearchOutlined, FilterOutlined, MoreOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils';
import { bookingStatusConfig, sourceIcons } from './constants';

const { Text } = Typography;

interface BookingItem {
    id: string;
    customerName: string;
    customerPhone: string;
    service: string;
    price: number;
    date: string;
    time: string;
    duration: number;
    status: string;
    source: string;
}

interface BookingsTableProps {
    bookings: BookingItem[];
    loading?: boolean;
}

export function BookingsTable({ bookings, loading }: BookingsTableProps) {
    const columns = [
        {
            title: 'Time',
            dataIndex: 'time',
            key: 'time',
            width: 100,
            render: (time: string, record: BookingItem) => (
                <div>
                    <Text strong style={{ fontSize: 16 }}>{time}</Text>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{record.duration} min</div>
                </div>
            ),
        },
        {
            title: 'Customer',
            dataIndex: 'customerName',
            key: 'customerName',
            render: (name: string, record: BookingItem) => (
                <Space>
                    <Avatar style={{ backgroundColor: '#2563eb' }}>{name[0]}</Avatar>
                    <div>
                        <Text strong>{name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.customerPhone}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Service',
            dataIndex: 'service',
            key: 'service',
            render: (service: string) => <Tag>{service}</Tag>,
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price: number) => <Text>{formatCurrency(price)}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const cfg = bookingStatusConfig[status] || bookingStatusConfig.pending;
                return <Badge status={cfg.badgeStatus} text={cfg.text} />;
            },
        },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
            render: (source: string) => (
                <Tooltip title={`Booked via ${source}`}>
                    {sourceIcons[source] || sourceIcons.website}
                </Tooltip>
            ),
        },
        {
            title: '',
            key: 'actions',
            render: () => <Button type="text" icon={<MoreOutlined />} />,
        },
    ];

    return (
        <>
            <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
                <Space>
                    <Input placeholder="Search bookings..." prefix={<SearchOutlined />} style={{ width: 300 }} />
                    <Button icon={<FilterOutlined />}>Filter</Button>
                </Space>
            </div>
            <Table
                columns={columns}
                dataSource={bookings}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                loading={loading}
            />
        </>
    );
}
