'use client';

import React from 'react';
import {
    WhatsAppOutlined,
    PhoneOutlined,
    InstagramOutlined,
    FacebookOutlined,
    CalendarOutlined,
    UserOutlined,
} from '@ant-design/icons';
import type { BadgeProps } from 'antd';

// ── Channel configs (used in dashboard, conversations, bookings) ─────────────

export const channelConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    whatsapp: { icon: <WhatsAppOutlined />, color: '#25D366', bg: '#e7faf0' },
    voice: { icon: <PhoneOutlined />, color: '#8b5cf6', bg: '#f3e8ff' },
    instagram: { icon: <InstagramOutlined />, color: '#E4405F', bg: '#fdf2f4' },
    instagram_dm: { icon: <InstagramOutlined />, color: '#E4405F', bg: '#fdf2f4' },
    instagram_comment: { icon: <InstagramOutlined />, color: '#E4405F', bg: '#fdf2f4' },
    messenger: { icon: <FacebookOutlined />, color: '#2563eb', bg: '#eff6ff' },
    facebook_comment: { icon: <FacebookOutlined />, color: '#1877F2', bg: '#eff6ff' },
};

// ── Conversation status configs ──────────────────────────────────────────────

export const conversationStatusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'success', text: 'Active' },
    resolved: { color: 'default', text: 'Resolved' },
    escalated: { color: 'warning', text: 'Escalated' },
};

// ── Booking status configs ───────────────────────────────────────────────────

export const bookingStatusConfig: Record<string, { color: string; text: string; badgeStatus: BadgeProps['status'] }> = {
    pending: { color: 'warning', text: 'Pending', badgeStatus: 'warning' },
    confirmed: { color: 'success', text: 'Confirmed', badgeStatus: 'success' },
    completed: { color: 'processing', text: 'Completed', badgeStatus: 'processing' },
    cancelled: { color: 'error', text: 'Cancelled', badgeStatus: 'error' },
    no_show: { color: 'default', text: 'No Show', badgeStatus: 'default' },
};

// ── Booking source icons ─────────────────────────────────────────────────────

export const sourceIcons: Record<string, React.ReactNode> = {
    whatsapp: <WhatsAppOutlined style={{ color: '#25D366' }} />,
    voice: <PhoneOutlined style={{ color: '#8b5cf6' }} />,
    dashboard: <CalendarOutlined style={{ color: '#2563eb' }} />,
    instagram: <UserOutlined />,
    website: <CalendarOutlined />,
};
