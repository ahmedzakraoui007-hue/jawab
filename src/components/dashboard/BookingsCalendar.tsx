'use client';

import React from 'react';
import { Calendar, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { bookingStatusConfig } from './constants';

interface BookingItem {
    id: string;
    customerName: string;
    date: string;
    time: string;
    status: string;
    [key: string]: unknown;
}

interface BookingsCalendarProps {
    bookings: BookingItem[];
}

export function BookingsCalendar({ bookings }: BookingsCalendarProps) {
    const dateCellRender = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        const dayBookings = bookings.filter(b => b.date === dateStr);

        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {dayBookings.map(item => {
                    const cfg = bookingStatusConfig[item.status] || bookingStatusConfig.pending;
                    return (
                        <li key={item.id} style={{ marginBottom: 4 }}>
                            <Tag
                                color={cfg.color}
                                style={{
                                    width: '100%',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    fontSize: 11,
                                    padding: '0 4px',
                                }}
                            >
                                {item.time} {item.customerName.split(' ')[0]}
                            </Tag>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            <Calendar
                cellRender={(date, info) => info.type === 'date' ? dateCellRender(date) : info.originNode}
                mode="month"
            />
        </div>
    );
}
