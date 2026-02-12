'use client';

import React from 'react';
import { Card, List, Avatar, Button, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Text } = Typography;

interface BookingItem {
    id: string;
    customerName: string;
    service: string;
    time: string;
    date: string;
}

interface UpcomingBookingsListProps {
    bookings: BookingItem[];
}

export function UpcomingBookingsList({ bookings }: UpcomingBookingsListProps) {
    return (
        <Card
            title="Upcoming Bookings"
            extra={<Link href="/dashboard/bookings"><Button type="link">Calendar</Button></Link>}
        >
            <List
                itemLayout="horizontal"
                dataSource={bookings}
                renderItem={(item, index) => (
                    <>
                        {(index === 0 || bookings[index - 1].date !== item.date) && (
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    display: 'block',
                                    marginTop: index > 0 ? 16 : 0,
                                    marginBottom: 8,
                                }}
                            >
                                {item.date}
                            </Text>
                        )}
                        <List.Item style={{ cursor: 'pointer', padding: '8px 0' }}>
                            <List.Item.Meta
                                avatar={
                                    <Avatar style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                                        {item.customerName[0]}
                                    </Avatar>
                                }
                                title={item.customerName}
                                description={item.service}
                            />
                            <Text strong>{item.time}</Text>
                        </List.Item>
                    </>
                )}
            />
            <Button
                type="dashed"
                block
                icon={<CalendarOutlined />}
                style={{ marginTop: 16 }}
            >
                View Full Calendar
            </Button>
        </Card>
    );
}
