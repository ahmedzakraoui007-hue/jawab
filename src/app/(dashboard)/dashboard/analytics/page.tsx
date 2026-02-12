'use client';

import { Card, Typography, Empty, Button } from 'antd';
import { BarChartOutlined, ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function AnalyticsPage() {
    return (
        <div style={{ maxWidth: 800, margin: '40px auto', textAlign: 'center' }}>
            <div style={{ marginBottom: 40 }}>
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    background: '#e6f7ff',
                    color: '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    margin: '0 auto 24px'
                }}>
                    <BarChartOutlined />
                </div>
                <Title level={2}>Analytics Dashboard</Title>
                <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                    Detailed insights about your conversations, bookings, and revenue are coming soon.
                </Paragraph>
            </div>

            <Card style={{ marginBottom: 24, textAlign: 'left' }}>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <div style={{ textAlign: 'center' }}>
                            <Text strong>No data available yet</Text>
                            <br />
                            <Text type="secondary">Start using Jawab to generate analytics data.</Text>
                        </div>
                    }
                >
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Button type="primary" href="/dashboard">
                            Go to Dashboard
                        </Button>
                    </div>
                </Empty>
            </Card>
        </div>
    );
}
