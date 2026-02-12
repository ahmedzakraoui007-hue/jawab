'use client';

import React from 'react';
import { Card, List, Avatar, Tag, Badge, Input, Button, Typography, Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { formatRelativeTime } from '@/lib/utils';
import { channelConfig } from './constants';

const { Text, Title } = Typography;

interface ConversationItem {
    id: string;
    customerPhone: string;
    customerName: string;
    language: string;
    channel: string;
    status: string;
    lastMessage: string;
    timestamp: string;
    unread?: number;
    isPublic?: boolean;
}

interface ConversationListProps {
    conversations: ConversationItem[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
    return (
        <Card
            style={{ width: 380, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
        >
            {/* Header */}
            <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>Conversations</Title>
                    <Tag color="blue">{conversations.length} active</Tag>
                </Space>
                <Space.Compact style={{ width: '100%' }}>
                    <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ flex: 1 }} />
                    <Button icon={<FilterOutlined />} />
                </Space.Compact>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <List
                    dataSource={conversations}
                    renderItem={(item) => {
                        const config = channelConfig[item.channel] || channelConfig.whatsapp;
                        const isSelected = selectedId === item.id;
                        return (
                            <List.Item
                                onClick={() => onSelect(item.id)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '12px 16px',
                                    background: isSelected ? '#eff6ff' : 'transparent',
                                    borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                                }}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge count={item.unread} offset={[-5, 35]}>
                                            <Avatar style={{ backgroundColor: config.bg, color: config.color }}>
                                                {item.customerName[0]}
                                            </Avatar>
                                        </Badge>
                                    }
                                    title={
                                        <Space>
                                            <Text strong={(item.unread ?? 0) > 0}>{item.customerName}</Text>
                                            <Tag>{item.language}</Tag>
                                        </Space>
                                    }
                                    description={
                                        <Text
                                            type="secondary"
                                            ellipsis
                                            style={{
                                                maxWidth: 200,
                                                fontWeight: (item.unread ?? 0) > 0 ? 500 : 400,
                                            }}
                                        >
                                            {item.lastMessage}
                                        </Text>
                                    }
                                />
                                <div style={{ textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatRelativeTime(item.timestamp)}
                                    </Text>
                                    <div style={{ marginTop: 4 }}>
                                        {item.status === 'escalated' && (
                                            <Tag color="warning">Escalated</Tag>
                                        )}
                                    </div>
                                </div>
                            </List.Item>
                        );
                    }}
                />
            </div>
        </Card>
    );
}
