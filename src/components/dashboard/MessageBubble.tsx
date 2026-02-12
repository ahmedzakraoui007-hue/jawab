'use client';

import React from 'react';
import { Tag, Typography } from 'antd';
import { RobotOutlined, CheckOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface MessageBubbleProps {
    message: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
    };
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-start' : 'flex-end',
                marginBottom: 16,
            }}
        >
            <div style={{ maxWidth: '70%' }}>
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: 16,
                        background: isUser ? '#fff' : '#2563eb',
                        color: isUser ? '#1e293b' : '#fff',
                        border: isUser ? '1px solid #e2e8f0' : 'none',
                        borderTopLeftRadius: isUser ? 4 : 16,
                        borderTopRightRadius: isUser ? 16 : 4,
                    }}
                >
                    <Text style={{ color: 'inherit', whiteSpace: 'pre-wrap', fontSize: 14 }}>
                        {message.content}
                    </Text>
                </div>
                <div
                    style={{
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        justifyContent: isUser ? 'flex-start' : 'flex-end',
                    }}
                >
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(message.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                    {!isUser && (
                        <>
                            <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                <RobotOutlined /> AI
                            </Tag>
                            <CheckOutlined style={{ fontSize: 10, color: '#2563eb' }} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
