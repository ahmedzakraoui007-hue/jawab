'use client';

import React, { useState } from 'react';
import {
    Card,
    Input,
    Button,
    Typography,
    Space,
    Tag,
    Avatar,
    Badge,
    Divider,
    Empty,
} from 'antd';
import {
    SendOutlined,
    PaperClipOutlined,
    SmileOutlined,
    UserOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { conversationStatusConfig } from './constants';
import { MessageBubble } from './MessageBubble';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface Conversation {
    id: string;
    customerName: string;
    customerPhone: string;
    channel: string;
    status: string;
    [key: string]: unknown;
}

interface ChatWindowProps {
    conversation: Conversation | null;
    messages: Message[];
    onSendMessage: (text: string) => void;
}

export function ChatWindow({ conversation, messages, onSendMessage }: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState('');

    if (!conversation) {
        return (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="Select a conversation to view details" />
            </Card>
        );
    }

    const statusCfg = conversationStatusConfig[conversation.status] || conversationStatusConfig.active;

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
        >
            {/* Header */}
            <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Avatar size={40} style={{ backgroundColor: '#2563eb' }}>
                        {conversation.customerName[0]}
                    </Avatar>
                    <div>
                        <Text strong>{conversation.customerName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {conversation.customerPhone} · {conversation.channel}
                        </Text>
                    </div>
                </Space>
                <Space>
                    <Tag color={statusCfg.color as string}>{statusCfg.text}</Tag>
                    <Button>Take Over</Button>
                    <Button type="text" icon={<MoreOutlined />} />
                </Space>
            </div>

            {/* Info Bar */}
            <div style={{ padding: '8px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <Space size="large">
                    <Space size={4}>
                        <UserOutlined style={{ color: '#94a3b8' }} />
                        <Text type="secondary">New customer</Text>
                    </Space>
                    <Space size={4}>
                        <CalendarOutlined style={{ color: '#94a3b8' }} />
                        <Text type="secondary">1 booking</Text>
                    </Space>
                    <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#94a3b8' }} />
                        <Text type="secondary">Avg. 2.1s response</Text>
                    </Space>
                </Space>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#fafafa' }}>
                <Divider plain style={{ fontSize: 12, color: '#94a3b8' }}>Today</Divider>
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0' }}>
                    <TextArea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message to take over..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        variant="borderless"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Space>
                            <Button type="text" icon={<PaperClipOutlined />} />
                            <Button type="text" icon={<SmileOutlined />} />
                        </Space>
                        <Button type="primary" icon={<SendOutlined />} disabled={!newMessage.trim()} onClick={handleSend}>
                            Send
                        </Button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Badge status="success" />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                        AI is handling this conversation. Type to take over.
                    </Text>
                </div>
            </div>
        </Card>
    );
}
