'use client';

import React from 'react';
import { Card, List, Avatar, Tag, Badge, Button, Space, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { channelConfig } from './constants';

const { Text } = Typography;

interface ConversationItem {
    id: string;
    customerName?: string;
    customerPhone: string;
    language: string;
    channel: string;
    lastMessage: string;
    timestamp: string;
    status: string;
}

interface RecentConversationsListProps {
    conversations: ConversationItem[];
}

export function RecentConversationsList({ conversations }: RecentConversationsListProps) {
    return (
        <Card
            title="Recent Conversations"
            extra={<Link href="/dashboard/conversations"><Button type="link">View all</Button></Link>}
        >
            <List
                itemLayout="horizontal"
                dataSource={conversations}
                renderItem={(item) => {
                    const config = channelConfig[item.channel] || channelConfig.whatsapp;
                    return (
                        <List.Item
                            style={{ cursor: 'pointer' }}
                            extra={
                                <Space direction="vertical" align="end" size={0}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatRelativeTime(item.timestamp)}
                                    </Text>
                                    {item.status === 'escalated' && (
                                        <Badge status="warning" text="Escalated" />
                                    )}
                                </Space>
                            }
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        icon={config.icon}
                                        style={{
                                            backgroundColor: config.bg,
                                            color: config.color,
                                        }}
                                    />
                                }
                                title={
                                    <Space>
                                        <span>{item.customerName || item.customerPhone}</span>
                                        <Tag color={item.status === 'escalated' ? 'warning' : 'default'}>
                                            {item.language}
                                        </Tag>
                                    </Space>
                                }
                                description={item.lastMessage}
                            />
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
}
